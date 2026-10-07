"""Only synthetic data: PDF responses and API authorization must minimize PII."""
import importlib.util
import json
from pathlib import Path
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('nbl_backend', root / 'start_nbl_analyzer.py')
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)

class Page:
    def __init__(self, text): self.text = text
    def extract_text(self, **kwargs): return self.text
class Reader:
    is_encrypted = False
    def __init__(self, text): self.pages = [Page(text)]

for number in ['123-45-6789', '123456789', '123 45 6789']:
    with patch('pypdf.PdfReader', return_value=Reader('Name: Synthetic Driver\nSocial Security Number: '+number+'\nDate of Birth: 01/02/1980\n')):
        response = backend.parse_hr_application_pdf(b'%PDF synthetic')
    serialized = json.dumps(response)
    assert response['fields']['ssnLast4'] == '6789'
    assert 'ssnFull' not in serialized and number not in serialized and '123456789' not in serialized
    assert 'SSN (last 4)' in response['detected_fields']

def user(role, access_role=None):
    return {'_nbl_membership': {'role': role, 'module_permissions': {'access_role': access_role} if access_role else {}}}
for route in ['/api/hr/parse-application', '/api/hr/road-test']:
    assert backend.api_role_allowed(user('owner'), route, 'POST')
    assert backend.api_role_allowed(user('operations'), route, 'POST')
    assert not backend.api_role_allowed(user('operations', 'lead_driver'), route, 'POST')
    assert not backend.api_role_allowed(user('read_only'), route, 'POST')
assert backend.api_role_allowed(user('operations', 'lead_driver'), '/api/motive/drivers')
print('PASS PDF full SSN omission, last-four extraction, and hiring API role separation')
