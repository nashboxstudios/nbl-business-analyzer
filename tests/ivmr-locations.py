import importlib.util, json, threading, urllib.request, urllib.error
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ivmr_backend',root/'start_nbl_analyzer.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
user=lambda role:{'_nbl_membership':{'role':role}}
assert b.api_role_allowed(user('owner'),'/api/ivmr/facility-directory')
for role in ['operations','lead_driver','read_only']:assert not b.api_role_allowed(user(role),'/api/ivmr/facility-directory')
square={'points':[{'lat':36,'lon':-86},{'lat':36.01,'lon':-86},{'lat':36.01,'lon':-85.99},{'lat':36,'lon':-85.99}]}
loc={'id':'custom','spot':'305 - Marietta','city':'Kennesaw','state':'TN','boundaries':[square],'lat':36.005,'lon':-85.995,'radius_miles':8}
trip={'start_lat':36.005,'start_lon':-85.995,'jurisdiction':'TN','distance':100}
m=b._match_ivmr_origin(trip,[],[loc]);assert m['method']=='motive_boundary' and m['label']=='305 - Marietta - Kennesaw'
assert not b._match_ivmr_origin({**trip,'start_lat':36.02},[],[loc])['label'],'outside boundary must not fall back to centroid radius'
assert b._ivmr_point_in_boundary(36,-86,square)
assert not b._ivmr_point_in_boundary(36.005,-85.995,{'points':[{'lat':'bad','lon':-86}]*3})
other={**loc,'id':'other','spot':'300'}
m=b._match_ivmr_origin(trip,[],[loc,other]);assert m['label']=='Kennesaw, TN' and m['status']=='city_only'
base={'lat':None,'lon':None,'city':'Test City','state':'TN','directory_managed':True,'aliases':['Test City','100 Main Road'],'spot':'123'}
points=[{'description':'Test City TN','speed':0}]
m=b._match_ivmr_origin({'jurisdiction':'TN','distance':100},points,[base]);assert m['label']=='Test City, TN' and m['status']=='city_only'
m=b._match_ivmr_origin({'jurisdiction':'TN','distance':100},[{'description':'100 Main Road Test City TN','speed':0}],[base]);assert m['label']=='123 - Test City'
assert not b._match_ivmr_origin({'jurisdiction':'TN','distance':100},[{'description':'Test City TN','speed':65}],[base])['label']
assert not b._match_ivmr_origin({'jurisdiction':'GA','distance':100},points,[base])['label']
# The directory read is scoped to the caller and validates the compressed record count.
import base64, gzip, io
from urllib.parse import urlparse, parse_qs
source={'source_date':'fixture','facilities':[{'number':'999','city':'TEST CITY'}]}
stored={'encoding':'gzip-base64','content':base64.b64encode(gzip.compress(json.dumps(source).encode())).decode(),'facility_count':1}
def source_response(request, timeout):
 assert timeout==20 and request.get_header('Authorization')=='Bearer synthetic'
 query=parse_qs(urlparse(request.full_url).query)
 assert query['organization_id']==['eq.fixture-org'] and query['module_key']==['eq.ivmr']
 return io.BytesIO(json.dumps([{'source':stored}]).encode())
with patch.object(b,'urlopen',side_effect=source_response):
 assert b.fetch_ivmr_facility_directory({'_nbl_membership':{'organization_id':'fixture-org'}},'Bearer synthetic')==source
 stored['facility_count']=2
 try:b.fetch_ivmr_facility_directory({'_nbl_membership':{'organization_id':'fixture-org'}},'Bearer synthetic');raise AssertionError('Incomplete source accepted')
 except RuntimeError as exc:assert 'Incomplete' in str(exc)
# Verify private source bytes are not served, including encoded paths and HEAD.
server=b.ThreadingHTTPServer(('127.0.0.1',0),b.NBLHandler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();origin=f'http://127.0.0.1:{server.server_address[1]}'
try:
 for path in ['/private-data/fedex-facilities-2025-02-14.json','/private%2ddata/fedex-facilities-2025-02-14.json','/private-data/']:
  for method in ['GET','HEAD']:
   try: urllib.request.urlopen(urllib.request.Request(origin+path,method=method));raise AssertionError('Private directory exposed')
   except urllib.error.HTTPError as exc: assert exc.code==403
 with patch.object(b,'validate_nbl_access_token',return_value=user('owner')), patch.object(b,'fetch_ivmr_facility_directory',return_value={'facilities':[{}]*2172}):
  data=json.load(urllib.request.urlopen(urllib.request.Request(origin+'/api/ivmr/facility-directory',headers={'Authorization':'Bearer synthetic'})));assert len(data['facilities'])==2172
 with patch.object(b,'validate_nbl_access_token',return_value=user('operations')):
  try:urllib.request.urlopen(urllib.request.Request(origin+'/api/ivmr/facility-directory',headers={'Authorization':'Bearer synthetic'}));raise AssertionError('Unauthorized access')
  except urllib.error.HTTPError as exc:assert exc.code==403
finally:server.shutdown();server.server_close()
print('PASS owner-only directory API, GET/HEAD privacy, polygons, city-only fallback, specificity, transit and state guards')
