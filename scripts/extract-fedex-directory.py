"""Extract the supplied February 2025 FedEx PDF by its printed table columns."""
import bisect, hashlib, json, re, sys
from pathlib import Path
import pdfplumber

source, target = map(Path, sys.argv[1:3])
columns = ['facility_name','abbreviation','number','colo_abbreviation','sister_abbreviation','facility_type','address1','address2','city','state','postal_code','region','district']
starts = [52,142,163,181,217,254,290,393,479,561,584,610,667]
facilities=[]
with pdfplumber.open(source) as pdf:
    for page_no,page in enumerate(pdf.pages,1):
        rows={}
        for word in page.extract_words(x_tolerance=1,y_tolerance=2):
            if not 61 <= word['top'] < 560: continue
            row=rows.setdefault(round(word['top'],1), ['']*len(columns))
            col=bisect.bisect_right(starts,word['x0']+0.8)-1
            if col>=0: row[col]+=(' ' if row[col] else '')+word['text']
        for row in rows.values():
            if not row[0]: continue
            record=dict(zip(columns,row))
            if not re.fullmatch(r'\d+',record['number']) or not re.fullmatch(r'[A-Z]{2}',record['state']) or not record['city'] or not record['address1']:
                raise ValueError(f'Unparsed row on page {page_no}: {record}')
            record['page']=page_no
            facilities.append(record)
assert len({(x['number'],x['abbreviation']) for x in facilities})==len(facilities)
target.write_text(json.dumps({'source':'FedEx Facility Directory','source_date':'2025-02-14','source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'facilities':facilities},ensure_ascii=False,separators=(',',':'))+'\n')
print(f'{len(facilities)} facility records extracted; {len(pdf.pages)} pages')
