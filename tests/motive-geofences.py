"""Synthetic read-only geofence responses; no live Motive requests or credentials."""
import importlib.util
from pathlib import Path
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('nbl_geofence_backend', root / 'start_nbl_analyzer.py')
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)

def user(role, access_role=None):
    return {'_nbl_membership': {'role': role, 'module_permissions': {'access_role': access_role} if access_role else {}}}

for role in ['owner', 'operations']:
    assert backend.api_role_allowed(user(role), '/api/motive/geofences')
for account in [user('lead_driver'), user('operations', 'lead_driver'), user('read_only'), {}]:
    assert not backend.api_role_allowed(account, '/api/motive/geofences')

calls = []
def response(path, query):
    assert path == '/v1/geofences' and query['status'] == 'active'
    calls.append(query.copy())
    if query['category'] == 'Fuel Station':
        return {'geofences': [{'geofence': {'id': 1, 'name': 'Duplicate', 'address': 'Synthetic address'}}]}, 200
    page = query['page_no']
    item = {'id': page, 'name': 'Synthetic Facility '+str(page), 'status': 'active',
            'location_points': [{'lat': 36, 'lon': -86}, {'lat': 'bad', 'lon': -86}, {'lat': 95, 'lon': -86}],
            'secret_canary': 'NOT_RETURNED'}
    return {'geofences': [{'geofence': item}], 'pagination': {'total': 2}}, 200

with patch.object(backend, 'motive_request', side_effect=response):
    result = backend.fetch_motive_geofences(('Terminal / Yard', 'Fuel Station'))
assert result['complete'] and result['count'] == 2 and result['with_boundaries'] == 2
assert [q['page_no'] for q in calls if q['category'] == 'Terminal / Yard'] == [1, 2]
assert all(len(x['location_points']) == 1 for x in result['geofences'])
assert 'NOT_RETURNED' not in str(result)

def partial(path, query):
    if query['category'] == 'Fuel Station':
        raise RuntimeError('Category permission denied')
    return {'geofences': []}, 200
with patch.object(backend, 'motive_request', side_effect=partial):
    result = backend.fetch_motive_geofences(('Terminal / Yard', 'Fuel Station'))
assert not result['complete'] and result['count'] == 0
assert result['errors'][0]['category'] == 'Fuel Station'

with patch.object(backend, 'motive_request', side_effect=RuntimeError('HTTP 403')) as request:
    try:
        backend.fetch_motive_geofences()
        raise AssertionError('Access denial was shown as an empty list')
    except RuntimeError as exc:
        assert str(exc) == 'HTTP 403' and request.call_count == 1

for payload in [{'geofences': None}, {'geofences': [{}]},
                {'geofences': [], 'pagination': {'total': 2}},
                {'geofences': [{'id': 1, 'location_points': {'lat': 36}}]}]:
    with patch.object(backend, 'motive_request', return_value=(payload, 200)):
        try:
            backend.fetch_motive_geofences(('Terminal / Yard',))
            raise AssertionError('Malformed or incomplete response was accepted')
        except RuntimeError:
            pass

repeated = {'geofences': [{'id': n} for n in range(1, 101)]}
with patch.object(backend, 'motive_request', return_value=(repeated, 200)):
    try:
        backend.fetch_motive_geofences(('Terminal / Yard',))
        raise AssertionError('Repeated page was accepted')
    except RuntimeError as exc:
        assert 'repeated' in str(exc)

assert len(backend.MOTIVE_GEOFENCE_CATEGORIES) == 11
print('PASS geofence role restrictions, pagination, deduplication, boundary validation, response minimization, partial failures and denied access')
