"""Synthetic road-test PDF regression; optional output path for visual inspection."""
import base64
import importlib.util
import io
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('nbl_backend', root / 'start_nbl_analyzer.py')
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)

def signature(name):
    image = Image.new('RGBA', (850, 180), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=80)
    draw.text((30, 20), name, font=font, fill=(16, 16, 16, 255))
    draw.line((30, 140, 800, 130), fill=(16, 16, 16, 230), width=3)
    stream = io.BytesIO(); image.save(stream, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(stream.getvalue()).decode()

payload = {
    'candidate': {'name': 'Test Driver', 'fedex_id': '1234567', 'cdl_number': 'TEST12345', 'cdl_issuing_state': 'SC'},
    'road_test': {'date': '2026-10-05', 'time_from': '09:15', 'time_to': '10:30',
                  'test_admin_name': 'Test Admin', 'test_admin_fedex_id': '7654321',
                  'certificate_number': 'TEST-CERT-42', 'tractor_number': '100', 'trailer_number': '200',
                  'candidate_signature_png': signature('Test Driver'), 'admin_signature_png': signature('Test Admin')},
}
output = backend.build_hr_road_test_pdf(payload)
r = PdfReader(io.BytesIO(output))
assert len(r.pages) == 5
expected = {'Time of Test  From': '09:15 AM', 'To': '10:30 AM'}
fields = r.get_fields()
for name, value in expected.items():
    assert fields[name]['/V'] == value, (name, fields[name])
    widgets = [ref.get_object() for ref in r.pages[4]['/Annots'] if ref.get_object().get('/T') == name]
    assert len(widgets) == 1 and widgets[0]['/V'] == value
    assert widgets[0]['/AP']['/N'].get_object().get_data()
# Signature stamps must appear in the page content, not merely in resources.
required = {0: ['NblSigP1Admin'], 2: ['NblSigP3Candidate', 'NblSigP3Admin'],
            4: ['NblSigP5Candidate', 'NblSigP5Admin', 'NblSigP5AdminSection10', 'NblSigP5AdminSection11']}
for index, stamps in required.items():
    content = r.pages[index].get_contents().get_data()
    resources = r.pages[index]['/Resources']['/XObject']
    for stamp in stamps:
        assert ('/' + stamp + ' Do').encode() in content
        assert resources['/' + stamp]['/Subtype'] == '/Image'
assert 'Nashbox Logistics' in r.pages[0].extract_text()
assert '90' in r.pages[4].extract_text()
# Existing Production exports remain valid without the optional time pair.
road = payload['road_test']; road.pop('time_from'); road.pop('time_to')
assert backend.build_hr_road_test_pdf(payload).startswith(b'%PDF')
for bad_pair in [('09:15', ''), ('', '10:30'), ('25:00', '10:30')]:
    road.update(time_from=bad_pair[0], time_to=bad_pair[1])
    try:
        backend.build_hr_road_test_pdf(payload)
    except RuntimeError as exc:
        assert 'both road-test times' in str(exc)
    else:
        raise AssertionError('Malformed or incomplete time pair accepted')
# Midnight-crossing and noon conversions require no date assumptions.
road.update(time_from='23:45', time_to='00:15')
night = PdfReader(io.BytesIO(backend.build_hr_road_test_pdf(payload))).get_fields()
assert night['Time of Test  From']['/V'] == '11:45 PM'
assert night['To']['/V'] == '12:15 AM'
if len(sys.argv) > 1:
    Path(sys.argv[1]).write_bytes(output)
print('PASS PDF times, values/appearances, seven signature stamps, existing template data, legacy and invalid-time handling')
