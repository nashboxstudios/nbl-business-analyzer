"""Fill the supplied IFTA import template without changing its other worksheets."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from xml.sax.saxutils import escape
import io
import re
import zipfile
import xml.etree.ElementTree as ET

TEMPLATE = Path(__file__).resolve().parent / 'assets' / 'ifta-import-template.xlsx'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def quarter_dates(year, quarter):
    from datetime import date, timedelta
    if isinstance(year, bool) or isinstance(quarter, bool):
        raise ValueError('Select a valid year and quarter.')
    if str(year).strip() != str(int(year)) or str(quarter).strip() != str(int(quarter)):
        raise ValueError('Select a valid year and quarter.')
    year, quarter = int(year), int(quarter)
    if not 2000 <= year <= 2100 or not 1 <= quarter <= 4:
        raise ValueError('Select a valid year and quarter.')
    start = date(year, (quarter - 1) * 3 + 1, 1)
    end = date(year + (quarter == 4), quarter * 3 % 12 + 1, 1) - timedelta(days=1)
    return start, end

def template_jurisdictions(z):
    strings = [''.join(el.itertext()) for el in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    rows = ET.fromstring(z.read('xl/worksheets/sheet2.xml')).findall('.//m:row', NS)
    return {strings[int(r[1].find('m:v', NS).text)]: strings[int(r[0].find('m:v', NS).text)] for r in rows[2:]}

def _number(value):
    if value is None or isinstance(value, bool) or str(value).strip() == '':
        raise ValueError('Miles and gallons must be numeric and nonnegative.')
    try:
        n = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError('Miles and gallons must be numeric and nonnegative.') from exc
    if not n.is_finite() or n < 0:
        raise ValueError('Miles and gallons must be numeric and nonnegative.')
    return n.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def build_ifta_xlsx(data):
    quarter_dates(data.get('year'), data.get('quarter'))
    if data.get('mileageReviewed') is not True or data.get('fuelReviewed') is not True:
        raise ValueError('Review mileage and qualifying tax-paid fuel before exporting.')
    rows = data.get('rows')
    if not isinstance(rows, list) or not rows or len(rows) > 67:
        raise ValueError('The worksheet requires jurisdiction rows.')
    with zipfile.ZipFile(TEMPLATE) as source:
        jurisdictions = template_jurisdictions(source)
        seen, prepared = set(), []
        for row in rows:
            code = str(row.get('code', '')).upper()
            if code not in jurisdictions or code in seen or row.get('fuelType') != 'Diesel':
                raise ValueError('Each jurisdiction must be valid, unique, and use Diesel.')
            seen.add(code)
            miles, taxable, gallons = [_number(row.get(k)) for k in ('totalMiles', 'taxableMiles', 'taxPaidGallons')]
            if taxable > miles:
                raise ValueError('Taxable miles cannot exceed total miles.')
            prepared.append((jurisdictions[code], miles, taxable, gallons))
        prepared.sort(key=lambda r: r[0])
        xml = source.read('xl/worksheets/sheet1.xml').decode('utf-8')
        sheet = ET.fromstring(xml)
        sample = sheet.find("m:sheetData/m:row[@r='3']", NS)
        styles = {c.attrib['r'][0]: c.attrib.get('s', '0') for c in sample}
        old_data = re.search(r'<sheetData>(.*?)</sheetData>', xml, re.S).group(1)
        header = ''.join(re.findall(r'<row\b[^>]*\br="[12]"[^>]*>.*?</row>', old_data, re.S))
        if not header:
            raise ValueError('IFTA template headers are unavailable.')
        rendered = []
        for index, (name, miles, taxable, gallons) in enumerate(prepared, 3):
            cells = []
            for col, value in zip('ABCDE', (name, 'Diesel', miles, taxable, gallons)):
                ref = f'{col}{index}'
                if col in 'AB':
                    cells.append(f'<c r="{ref}" s="{styles[col]}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
                else:
                    cells.append(f'<c r="{ref}" s="{styles[col]}"><v>{value:.2f}</v></c>')
            rendered.append(f'<row r="{index}" spans="1:5">' + ''.join(cells) + '</row>')
        xml = re.sub(r'<sheetData>.*?</sheetData>', lambda _: '<sheetData>'+header+''.join(rendered)+'</sheetData>', xml, flags=re.S)
        xml = re.sub(r'<dimension ref="[^"]*"', f'<dimension ref="A1:E{len(prepared)+2}"', xml)
        # No totals row: the native import expects jurisdiction data only.
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as target:
            for info in source.infolist():
                target.writestr(info, xml.encode('utf-8') if info.filename == 'xl/worksheets/sheet1.xml' else source.read(info.filename))
        return out.getvalue()
