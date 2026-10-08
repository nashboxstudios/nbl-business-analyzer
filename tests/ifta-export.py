import importlib.util
import io
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root))
from ifta_export import build_ifta_xlsx, quarter_dates, TEMPLATE, NS

assert quarter_dates(2024,1)[1].isoformat()=='2024-03-31'
assert quarter_dates(2026,4)[1].isoformat()=='2026-12-31'
data={'year':2026,'quarter':3,'mileageReviewed':True,'fuelReviewed':True,'rows':[
 {'code':'TN','fuelType':'Diesel','totalMiles':100.25,'taxableMiles':90.25,'taxPaidGallons':20.35},
 {'code':'FL','fuelType':'Diesel','totalMiles':12.75,'taxableMiles':12.75,'taxPaidGallons':0}]}
with zipfile.ZipFile(io.BytesIO(build_ifta_xlsx(data))) as result,zipfile.ZipFile(TEMPLATE) as template:
    for name in template.namelist():
        if name!='xl/worksheets/sheet1.xml':assert result.read(name)==template.read(name),name
    sheet=ET.fromstring(result.read('xl/worksheets/sheet1.xml'))
    cells={c.attrib['r']:c for c in sheet.findall('.//m:c',NS)}
    assert cells['A3'].find('m:is/m:t',NS).text=='Florida'
    assert cells['C4'].find('m:v',NS).text=='100.25'
    assert cells['D4'].find('m:v',NS).text=='90.25'
    assert cells['E3'].find('m:v',NS).text=='0.00'
    assert len(sheet.findall('m:sheetData/m:row',NS))==4
    assert sheet.find('m:sheetProtection',NS) is not None
    # Sanitized asset contains no actual uploaded mileage/fuel values.
    clean=ET.fromstring(template.read('xl/worksheets/sheet1.xml'))
    assert not [c for c in clean.findall('.//m:c',NS) if c.attrib['r'][0] in 'CDE' and int(c.attrib['r'][1:])>=3 and c.find('m:v',NS) is not None]

for override in [{'fuelReviewed':False},{'rows':[]},{'quarter':5},{'rows':[data['rows'][0],data['rows'][0]]},{'rows':[{**data['rows'][0],'taxableMiles':101}]},{'rows':[{**data['rows'][0],'taxPaidGallons':'NaN'}]}]:
    try:build_ifta_xlsx({**data,**override})
    except (ValueError,TypeError):pass
    else:raise AssertionError(override)

spec=importlib.util.spec_from_file_location('backend',root/'start_nbl_analyzer.py');backend=importlib.util.module_from_spec(spec);spec.loader.exec_module(backend)
for path in ['/api/ifta/mileage','/api/ifta/export']:
    assert backend.api_role_allowed({'_nbl_membership':{'role':'owner'}},path)
    for role in ['operations','read_only','admin']:
        assert not backend.api_role_allowed({'_nbl_membership':{'role':role}},path)
with patch.object(backend,'motive_request',return_value=({'ifta_trips':[{'ifta_trip':{'id':1}}]},200)) as call:
    try:backend.fetch_ifta_window(*quarter_dates(2026,3),max_pages=1,fuel_type='Diesel')
    except RuntimeError as exc:assert 'incomplete' in str(exc)
    else:raise AssertionError('Silent truncated report')
    assert call.call_args.args[1]['fuel_type']=='diesel'
# Emulate the case-sensitive Motive validation that rejected the production query.
def strict_motive(path, params):
    assert path=='/v1/ifta/trips'
    assert params.get('fuel_type')=='diesel', 'Motive HTTP 400: fuel_type does not have a valid value'
    return {'ifta_trips':[], 'total':0},200
with patch.object(backend,'motive_request',side_effect=strict_motive) as call:
    assert backend.fetch_ifta_trips(*quarter_dates(2026,3),fuel_type='Diesel')==[]
    assert call.call_count==4
    assert all(c.args[1]['fuel_type']=='diesel' for c in call.call_args_list)
    backend.fetch_ifta_window(*quarter_dates(2026,3),fuel_type=' DIESEL ')
with patch.object(backend,'motive_request',return_value=({'ifta_trips':[]},200)) as call:
    backend.fetch_ifta_window(*quarter_dates(2026,3))
    assert 'fuel_type' not in call.call_args.args[1], 'IVMR must retain its existing unfiltered request'
print('PASS lowercase Motive fuel identifiers across all quarter windows and unchanged IVMR query')
print('PASS exact template headers, numeric cells, protection/hidden sheets preserved, sanitized asset, invalid export rejection, owner-only API and incomplete pagination failure')
