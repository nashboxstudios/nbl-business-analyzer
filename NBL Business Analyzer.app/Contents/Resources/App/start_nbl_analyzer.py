#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from datetime import date, timedelta, datetime, timezone
import json, os, threading, webbrowser, math, re, time, base64, io, sys, struct, zlib, zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
HOST = os.environ.get('NBL_HOST') or ('0.0.0.0' if os.environ.get('PORT') else '127.0.0.1')
REQUESTED_PORT = int(os.environ.get('PORT') or os.environ.get('NBL_PORT', '0') or '0')
PORT_FILE = os.environ.get('NBL_PORT_FILE', '')
MOTIVE_BASE = 'https://api.gomotive.com'
SUPABASE_URL = 'https://tjpcabnhaxaiecnbnrhm.supabase.co'
SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_AQBDWZQ-xtLG7-XRw1Ustw_zrUEA18E'
AUTH_CACHE = {}
AUTH_CACHE_LOCK = threading.Lock()
SECRET_DIR = Path.home() / '.nbl_business_analyzer'
MOTIVE_KEY_FILE = SECRET_DIR / 'motive_api_key'
GPS_HISTORY_CACHE = {}
GPS_CACHE_LOCK = threading.Lock()
ROAD_DATA_DIR = SECRET_DIR / 'road_data' / 'tiger2025'
ROAD_INDEX_CACHE = {}
ROAD_INDEX_LOCK = threading.Lock()
try:
    import shapefile  # bundled PyShp; used for official Census TIGER/Line road matching
except Exception:
    shapefile = None

STATE_FIPS = {
    'AL':'01','AK':'02','AZ':'04','AR':'05','CA':'06','CO':'08','CT':'09','DE':'10','DC':'11','FL':'12','GA':'13',
    'HI':'15','ID':'16','IL':'17','IN':'18','IA':'19','KS':'20','KY':'21','LA':'22','ME':'23','MD':'24','MA':'25','MI':'26',
    'MN':'27','MS':'28','MO':'29','MT':'30','NE':'31','NV':'32','NH':'33','NJ':'34','NM':'35','NY':'36','NC':'37','ND':'38',
    'OH':'39','OK':'40','OR':'41','PA':'42','RI':'44','SC':'45','SD':'46','TN':'47','TX':'48','UT':'49','VT':'50','VA':'51',
    'WA':'53','WV':'54','WI':'55','WY':'56'
}
STATE_NAME_TO_CODE = {
    'ALABAMA':'AL','ALASKA':'AK','ARIZONA':'AZ','ARKANSAS':'AR','CALIFORNIA':'CA','COLORADO':'CO','CONNECTICUT':'CT',
    'DELAWARE':'DE','DISTRICT OF COLUMBIA':'DC','FLORIDA':'FL','GEORGIA':'GA','HAWAII':'HI','IDAHO':'ID','ILLINOIS':'IL',
    'INDIANA':'IN','IOWA':'IA','KANSAS':'KS','KENTUCKY':'KY','LOUISIANA':'LA','MAINE':'ME','MARYLAND':'MD','MASSACHUSETTS':'MA',
    'MICHIGAN':'MI','MINNESOTA':'MN','MISSISSIPPI':'MS','MISSOURI':'MO','MONTANA':'MT','NEBRASKA':'NE','NEVADA':'NV',
    'NEW HAMPSHIRE':'NH','NEW JERSEY':'NJ','NEW MEXICO':'NM','NEW YORK':'NY','NORTH CAROLINA':'NC','NORTH DAKOTA':'ND',
    'OHIO':'OH','OKLAHOMA':'OK','OREGON':'OR','PENNSYLVANIA':'PA','RHODE ISLAND':'RI','SOUTH CAROLINA':'SC','SOUTH DAKOTA':'SD',
    'TENNESSEE':'TN','TEXAS':'TX','UTAH':'UT','VERMONT':'VT','VIRGINIA':'VA','WASHINGTON':'WA','WEST VIRGINIA':'WV',
    'WISCONSIN':'WI','WYOMING':'WY'
}



def validate_nbl_access_token(token):
    token = str(token or '').strip()
    if not token:
        return None
    now = time.time()
    with AUTH_CACHE_LOCK:
        cached = AUTH_CACHE.get(token)
        if cached and cached.get('expires_at', 0) > now:
            return cached.get('user')
    headers = {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'User-Agent': 'NBL-Business-Analyzer/77'
    }
    try:
        req = Request(SUPABASE_URL + '/auth/v1/user', headers=headers, method='GET')
        with urlopen(req, timeout=10) as resp:
            user = json.loads(resp.read().decode('utf-8'))
        user_id = str(user.get('id') or '').strip()
        if not user_id:
            return None
        params = urlencode({
            'user_id': f'eq.{user_id}',
            'status': 'eq.active',
            'select': 'user_id,organization_id,role,module_permissions',
            'limit': '1'
        })
        req2 = Request(SUPABASE_URL + '/rest/v1/organization_members?' + params, headers=headers, method='GET')
        with urlopen(req2, timeout=10) as resp:
            memberships = json.loads(resp.read().decode('utf-8'))
        if not isinstance(memberships, list) or not memberships:
            return None
        user['_nbl_membership'] = memberships[0]
        with AUTH_CACHE_LOCK:
            if len(AUTH_CACHE) > 500:
                AUTH_CACHE.clear()
            AUTH_CACHE[token] = {'expires_at': now + 180, 'user': user}
        return user
    except Exception:
        return None


def require_nbl_auth(handler):
    auth = str(handler.headers.get('Authorization') or '').strip()
    token = auth[7:].strip() if auth.lower().startswith('bearer ') else ''
    user = validate_nbl_access_token(token)
    if not user:
        handler.send_json({'ok': False, 'error': 'NBL Cloud authentication is required.'}, 401)
        return None
    return user

def api_role_allowed(user, path, method='GET'):
    membership = user.get('_nbl_membership') if isinstance(user, dict) else {}
    membership = membership if isinstance(membership, dict) else {}
    role = str(membership.get('role') or '').strip().lower()
    perms = membership.get('module_permissions') if isinstance(membership.get('module_permissions'), dict) else {}
    if role in ('owner', 'admin') or perms.get('all') is True:
        return True
    if path.startswith('/api/hr/'):
        return role == 'hr' or bool(perms.get('hr'))
    if path.startswith('/api/motive/'):
        if path in ('/api/motive/config', '/api/motive/disconnect'):
            return False
        return role in ('operations', 'finance') or bool(perms.get('motive')) or bool(perms.get('driver_pay')) or bool(perms.get('ivmr'))
    return False


def require_nbl_api_access(handler, path, method='GET'):
    user = require_nbl_auth(handler)
    if not user:
        return None
    if not api_role_allowed(user, path, method):
        handler.send_json({'ok': False, 'error': 'Your NBL role does not have access to this server tool.'}, 403)
        return None
    return user

def read_motive_key():
    env_value = os.environ.get('MOTIVE_API_KEY', '').strip()
    if env_value:
        return env_value
    try:
        value = MOTIVE_KEY_FILE.read_text(encoding='utf-8').strip()
        return value or None
    except FileNotFoundError:
        return None


def save_motive_key(value):
    SECRET_DIR.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(SECRET_DIR, 0o700)
    except OSError:
        pass
    MOTIVE_KEY_FILE.write_text(value.strip(), encoding='utf-8')
    try:
        os.chmod(MOTIVE_KEY_FILE, 0o600)
    except OSError:
        pass


def delete_motive_key():
    try:
        MOTIVE_KEY_FILE.unlink()
    except FileNotFoundError:
        pass


def motive_request(path, params=None, timeout=25, extra_headers=None):
    key = read_motive_key()
    if not key:
        raise RuntimeError('Motive API key is not configured on this computer.')
    endpoint = MOTIVE_BASE + path
    if params:
        endpoint += '?' + urlencode(params, doseq=True)
    headers = {
        'X-API-Key': key,
        'Accept': 'application/json',
        'X-Metric-Units': 'false',
        'User-Agent': 'NBL-Business-Analyzer/77'
    }
    if extra_headers:
        headers.update(extra_headers)
    req = Request(endpoint, headers=headers)
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
            return json.loads(raw) if raw else {}, resp.status
    except HTTPError as exc:
        raw = exc.read().decode('utf-8', errors='replace')
        try:
            body = json.loads(raw) if raw else {}
        except Exception:
            body = {'message': raw[:1000]}
        message = body.get('message') or body.get('error') or body.get('errors') or f'Motive returned HTTP {exc.code}'
        if isinstance(message, (dict, list)):
            try:
                message = json.dumps(message, ensure_ascii=False)
            except Exception:
                message = str(message)
        detail = raw.strip()[:1200] if raw else ''
        # Motive sometimes returns a useful validation payload without a top-level message.
        if detail and (str(message).strip() == f'Motive returned HTTP {exc.code}' or detail not in str(message)):
            message = f'{message}; response: {detail}'
        raise RuntimeError(f'{message} (HTTP {exc.code})') from exc
    except URLError as exc:
        raise RuntimeError(f'Could not reach Motive: {exc.reason}') from exc


def extract_list(payload, key):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    value = payload.get(key)
    if isinstance(value, list):
        return value
    data = payload.get('data')
    if isinstance(data, dict) and isinstance(data.get(key), list):
        return data[key]
    if isinstance(data, list):
        return data
    return []


def unwrap_item(item, key):
    if isinstance(item, dict) and isinstance(item.get(key), dict):
        merged = dict(item[key])
        for k, v in item.items():
            if k != key and k not in merged:
                merged[k] = v
        return merged
    return item if isinstance(item, dict) else {}


def fetch_all(path, list_key, per_page=100, max_pages=50):
    out = []
    page = 1
    while page <= max_pages:
        payload, _ = motive_request(path, {'per_page': per_page, 'page_no': page})
        items = [unwrap_item(x, 'vehicle') for x in extract_list(payload, list_key)]
        out.extend(items)
        total = payload.get('total') if isinstance(payload, dict) else None
        if total is None and isinstance(payload, dict) and isinstance(payload.get('pagination'), dict):
            total = payload['pagination'].get('total')
        if not items or len(items) < per_page or (isinstance(total, (int, float)) and len(out) >= int(total)):
            break
        page += 1
    return out


def normalize_vehicle(meta, loc):
    meta = meta or {}
    loc = loc or {}
    current = loc.get('current_location') if isinstance(loc.get('current_location'), dict) else {}
    driver = loc.get('current_driver') if isinstance(loc.get('current_driver'), dict) else {}
    # Some Motive responses put current readings at the vehicle root.
    true_odo = current.get('true_odometer', loc.get('true_odometer'))
    odo = current.get('odometer', loc.get('odometer'))
    return {
        'id': meta.get('id', loc.get('id')),
        'number': str(meta.get('number', loc.get('number', '')) or ''),
        'vin': str(meta.get('vin', loc.get('vin', '')) or ''),
        'year': str(meta.get('year', loc.get('year', '')) or ''),
        'make': str(meta.get('make', loc.get('make', '')) or ''),
        'model': str(meta.get('model', loc.get('model', '')) or ''),
        'status': meta.get('status', loc.get('status', '')),
        'ifta': meta.get('ifta', loc.get('ifta')),
        'fuel_type': meta.get('fuel_type', loc.get('fuel_type', '')),
        'true_odometer': true_odo,
        'odometer': odo,
        'engine_hours': current.get('true_engine_hours', current.get('engine_hours', loc.get('true_engine_hours', loc.get('engine_hours')))),
        'location_description': current.get('description', loc.get('current_location_description', '')),
        'located_at': current.get('located_at', loc.get('located_at', '')),
        'speed': current.get('speed', loc.get('speed')),
        'current_driver': {
            'id': driver.get('id'),
            'first_name': driver.get('first_name', ''),
            'last_name': driver.get('last_name', ''),
            'username': driver.get('username', ''),
            'status': driver.get('status', '')
        } if driver else None
    }


def fetch_motive_vehicles():
    metadata = fetch_all('/v1/vehicles', 'vehicles')
    locations = fetch_all('/v2/vehicle_locations', 'vehicles')
    by_id = {str(v.get('id')): v for v in metadata if v.get('id') is not None}
    by_number = {str(v.get('number', '')).strip(): v for v in metadata if str(v.get('number', '')).strip()}
    loc_by_id = {str(v.get('id')): v for v in locations if v.get('id') is not None}
    loc_by_number = {str(v.get('number', '')).strip(): v for v in locations if str(v.get('number', '')).strip()}
    keys = []
    seen = set()
    for v in metadata + locations:
        key = ('id', str(v.get('id'))) if v.get('id') is not None else ('number', str(v.get('number', '')).strip())
        if key[1] and key not in seen:
            seen.add(key); keys.append(key)
    result = []
    for kind, value in keys:
        if kind == 'id':
            meta = by_id.get(value, {})
            loc = loc_by_id.get(value, {})
            if not loc and meta.get('number') is not None:
                loc = loc_by_number.get(str(meta.get('number')).strip(), {})
        else:
            meta = by_number.get(value, {})
            loc = loc_by_number.get(value, {})
        result.append(normalize_vehicle(meta, loc))
    result.sort(key=lambda v: (not str(v.get('number', '')).isdigit(), int(v['number']) if str(v.get('number', '')).isdigit() else str(v.get('number', ''))))
    return result



def extract_gps_points(payload):
    """Recursively find breadcrumb-like records containing latitude/longitude."""
    points = []
    seen = set()
    def walk(obj):
        if isinstance(obj, dict):
            lat = obj.get('lat', obj.get('latitude'))
            lon = obj.get('lon', obj.get('lng', obj.get('longitude')))
            if lat not in (None, '') and lon not in (None, ''):
                key = (str(obj.get('id', '')), str(obj.get('located_at', obj.get('timestamp', ''))), str(lat), str(lon))
                if key not in seen:
                    seen.add(key)
                    points.append({
                        'id': obj.get('id'),
                        'located_at': obj.get('located_at') or obj.get('timestamp') or obj.get('time') or '',
                        'lat': lat,
                        'lon': lon,
                        'type': obj.get('type') or '',
                        'description': obj.get('description') or obj.get('location_description') or '',
                        'speed': obj.get('speed'),
                        'odometer': obj.get('true_odometer') if obj.get('true_odometer') not in (None, '') else obj.get('odometer')
                    })
            for value in obj.values():
                if isinstance(value, (dict, list)):
                    walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)
    walk(payload)
    points.sort(key=lambda x: str(x.get('located_at') or ''))
    return points


def test_historical_gps_access():
    vehicles = fetch_motive_vehicles()
    candidates = [v for v in vehicles if v.get('id') is not None]
    candidates.sort(key=lambda v: (str(v.get('status', '')).lower() != 'active', str(v.get('number', ''))))
    if not candidates:
        return {
            'access_ok': False, 'data_ok': False, 'message': 'No Motive vehicle ID was available to test historical location access.'
        }

    today = date.today()
    last_error = ''
    accessed = False
    tested = []
    # Try a few active vehicles in case one unit simply has no recent breadcrumbs.
    for vehicle in candidates[:5]:
        vehicle_id = vehicle.get('id')
        vehicle_number = vehicle.get('number') or str(vehicle_id)
        for days in (3, 7, 30):
            start = today - timedelta(days=days)
            params = {'start_date': start.isoformat(), 'end_date': today.isoformat()}
            try:
                try:
                    payload, _ = motive_request(f'/v2/vehicle_locations/{vehicle_id}', params, timeout=35)
                except Exception as first_exc:
                    # Motive's current docs list updated_after as required, while their example omits it.
                    # Retry with it so the diagnostic works with either server behavior.
                    params['updated_after'] = start.isoformat()
                    try:
                        payload, _ = motive_request(f'/v2/vehicle_locations/{vehicle_id}', params, timeout=35)
                    except Exception:
                        raise first_exc
                accessed = True
                points = extract_gps_points(payload)
                tested.append({'vehicle': str(vehicle_number), 'days': days, 'points': len(points)})
                if points:
                    sample = points[:3]
                    breadcrumb_count = sum(1 for pt in points if str(pt.get('type', '')).lower() == 'breadcrumb')
                    return {
                        'access_ok': True,
                        'data_ok': True,
                        'vehicle_id': vehicle_id,
                        'vehicle_number': str(vehicle_number),
                        'start_date': start.isoformat(),
                        'end_date': today.isoformat(),
                        'point_count': len(points),
                        'breadcrumb_count': breadcrumb_count,
                        'first_point_at': points[0].get('located_at') or '',
                        'last_point_at': points[-1].get('located_at') or '',
                        'sample': sample,
                        'message': f'Historical GPS data is available for tractor {vehicle_number}: {len(points)} location point(s) returned.'
                    }
                break
            except Exception as exc:
                last_error = str(exc)
                tested.append({'vehicle': str(vehicle_number), 'days': days, 'error': last_error})
                # Authorization/forbidden errors are definitive; date-window errors can be retried.
                lowered = last_error.lower()
                if '401' in lowered or '403' in lowered or 'unauthorized' in lowered or 'forbidden' in lowered:
                    return {
                        'access_ok': False, 'data_ok': False, 'vehicle_id': vehicle_id,
                        'vehicle_number': str(vehicle_number), 'message': last_error, 'tested': tested
                    }
                continue

    if accessed:
        return {
            'access_ok': True, 'data_ok': False,
            'message': 'Motive accepted the historical-location request, but no latitude/longitude breadcrumbs were returned for the recent vehicles/windows tested.',
            'tested': tested
        }
    return {
        'access_ok': False, 'data_ok': False,
        'message': last_error or 'Historical GPS access could not be confirmed.', 'tested': tested
    }



def _float_or_none(value):
    try:
        if value in (None, ''):
            return None
        return float(value)
    except Exception:
        return None


def fetch_vehicle_gps_history(vehicle_id, start_day, end_day):
    """Fetch dense Motive vehicle history for route reconstruction.

    v72 uses the successful v3 historical-location feed as the authoritative route-history source.
    The previous IVMR route builder still used the older v2 request shape, which
    could fail even when the diagnostic succeeded. Requests are made one day at a
    time so a single bad day cannot invalidate an entire reporting period.
    """
    if vehicle_id in (None, ''):
        return []
    cache_key = (str(vehicle_id), str(start_day), str(end_day), 'v72')
    with GPS_CACHE_LOCK:
        cached = GPS_HISTORY_CACHE.get(cache_key)
    if cached is not None:
        return [dict(x) for x in cached]

    all_points = []
    cursor = start_day
    while cursor <= end_day:
        day = cursor.isoformat()
        iso_updated = f'{day}T00:00:00Z'
        attempts = [
            ('v3', f'/v3/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': iso_updated}),
            ('v3', f'/v3/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': day}),
            ('v3', f'/v3/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day}),
            ('v2', f'/v2/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': iso_updated}),
            ('v2', f'/v2/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': day}),
            ('v2', f'/v2/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day}),
        ]
        payload = None
        errors = []
        for ver, path, params in attempts:
            try:
                payload, _ = motive_request(path, params, timeout=35)
                break
            except Exception as exc:
                errors.append(f'{ver}: {exc}')
        if payload is None:
            raise RuntimeError(f'Motive history failed for vehicle {vehicle_id} on {day}: ' + ' | '.join(errors[:4]))
        all_points.extend(extract_gps_points(payload))
        cursor += timedelta(days=1)

    seen, out = set(), []
    for pt in sorted(all_points, key=lambda x: str(x.get('located_at') or '')):
        lat, lon = _float_or_none(pt.get('lat')), _float_or_none(pt.get('lon'))
        if lat is None or lon is None:
            continue
        key = (str(pt.get('located_at') or ''), round(lat, 6), round(lon, 6))
        if key in seen:
            continue
        seen.add(key)
        q = dict(pt)
        q['lat'], q['lon'] = lat, lon
        q['odometer'] = _float_or_none(pt.get('odometer'))
        q['speed'] = _float_or_none(pt.get('speed'))
        out.append(q)
    with GPS_CACHE_LOCK:
        if len(GPS_HISTORY_CACHE) > 256:
            GPS_HISTORY_CACHE.clear()
        GPS_HISTORY_CACHE[cache_key] = [dict(x) for x in out]
    return out



def _point_day_key(point):
    value = str(point.get('located_at') or '').strip()
    if len(value) >= 10 and value[4:5] == '-' and value[7:8] == '-':
        return value[:10]
    return ''


def _gps_label(point):
    desc = str(point.get('description') or '').strip()
    if desc:
        return desc
    lat, lon = _float_or_none(point.get('lat')), _float_or_none(point.get('lon'))
    if lat is not None and lon is not None:
        return f'{lat:.5f}, {lon:.5f}'
    return ''


def fetch_vehicle_history_diagnostic(vehicle_id, start_day, end_day):
    """Fetch Motive vehicle breadcrumbs using conservative request variants.

    Motive's documentation and deployed environments have differed on whether
    updated_after is mandatory and whether it accepts a date vs. ISO date-time. v67
    therefore tests documented-compatible variants on one day at a time. This also
    makes any HTTP 400 easier to isolate to vehicle ID vs. query shape.
    """
    if vehicle_id in (None, ''):
        return [], 'none', ''
    all_points = []
    api_versions = []
    fallback_messages = []
    cursor = start_day
    while cursor <= end_day:
        day = cursor.isoformat()
        iso_updated = f'{day}T00:00:00Z'
        attempts = [
            ('v3', f'/v3/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': iso_updated}),
            ('v3', f'/v3/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': day}),
            ('v3', f'/v3/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day}),
            ('v2', f'/v2/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': iso_updated}),
            ('v2', f'/v2/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day, 'updated_after': day}),
            ('v2', f'/v2/vehicle_locations/{vehicle_id}', {'start_date': day, 'end_date': day}),
        ]
        payload = None
        day_errors=[]
        used=''
        for ver, path, params in attempts:
            try:
                payload, _ = motive_request(path, params, timeout=35)
                used=ver
                break
            except Exception as exc:
                day_errors.append(f'{ver} {list(params.keys())}: {exc}')
        if payload is None:
            preview=' | '.join(day_errors[:4])
            raise RuntimeError(f'All Motive historical-location request variants failed for {day}: {preview}')
        api_versions.append(used)
        if day_errors:
            fallback_messages.append(f'{day}: ' + ' | '.join(day_errors[:2]))
        all_points.extend(extract_gps_points(payload))
        cursor += timedelta(days=1)

    seen, out = set(), []
    for pt in sorted(all_points, key=lambda x: str(x.get('located_at') or '')):
        lat, lon = _float_or_none(pt.get('lat')), _float_or_none(pt.get('lon'))
        if lat is None or lon is None:
            continue
        key = (str(pt.get('located_at') or ''), round(lat, 6), round(lon, 6))
        if key in seen:
            continue
        seen.add(key)
        q = dict(pt)
        q['lat'], q['lon'] = lat, lon
        q['odometer'] = _float_or_none(pt.get('odometer'))
        q['speed'] = _float_or_none(pt.get('speed'))
        out.append(q)
    if api_versions and all(v == 'v3' for v in api_versions):
        api_version='v3'
    elif api_versions and all(v == 'v2' for v in api_versions):
        api_version='v2'
    elif api_versions:
        api_version='mixed v2/v3'
    else:
        api_version='unknown'
    return out, api_version, (fallback_messages[0] if fallback_messages else '')


def summarize_vehicle_history(points, start_day, end_day):
    by_day = {}
    for pt in points:
        key = _point_day_key(pt)
        if not key:
            continue
        by_day.setdefault(key, []).append(pt)

    day_rows = []
    cursor = start_day
    while cursor <= end_day:
        key = cursor.isoformat()
        rows = sorted(by_day.get(key, []), key=lambda x: str(x.get('located_at') or ''))
        gps_miles = 0.0
        if rows:
            for a, b in zip(rows, rows[1:]):
                d = haversine_miles(a.get('lat'), a.get('lon'), b.get('lat'), b.get('lon'))
                # Ignore impossible GPS teleports while retaining legitimate sparse segments.
                if math.isfinite(d) and d < 500:
                    gps_miles += d
        odo_values = [r.get('odometer') for r in rows if _float_or_none(r.get('odometer')) is not None]
        odo_start = _float_or_none(odo_values[0]) if odo_values else None
        odo_end = _float_or_none(odo_values[-1]) if odo_values else None
        odo_delta = (odo_end - odo_start) if odo_start is not None and odo_end is not None and odo_end >= odo_start else None
        moving = sum(1 for r in rows if (_float_or_none(r.get('speed')) or 0) > 1 or 'moving' in str(r.get('type') or '').lower())
        descriptions = []
        seen_desc = set()
        for r in rows:
            d = str(r.get('description') or '').strip()
            if d and d.lower() not in seen_desc:
                seen_desc.add(d.lower()); descriptions.append(d)
            if len(descriptions) >= 6:
                break
        day_rows.append({
            'date': key,
            'point_count': len(rows),
            'moving_points': moving,
            'first_at': rows[0].get('located_at') if rows else '',
            'last_at': rows[-1].get('located_at') if rows else '',
            'first_location': _gps_label(rows[0]) if rows else '',
            'last_location': _gps_label(rows[-1]) if rows else '',
            'start_odometer': odo_start,
            'end_odometer': odo_end,
            'odometer_delta': odo_delta,
            'gps_distance_miles': round(gps_miles, 1),
            'descriptions': descriptions
        })
        cursor += timedelta(days=1)
    return day_rows



def fetch_vehicle_master_record(tractor_number):
    """Resolve a tractor strictly from Motive's /v1/vehicles master list.

    Historical-location endpoints require Motive's internal vehicle ID, not the fleet
    number and not a location-record ID. Keeping this lookup separate prevents an ID
    from /vehicle_locations from being accidentally reused as a vehicle ID.
    """
    number = str(tractor_number or '').strip()
    vehicles = fetch_all('/v1/vehicles', 'vehicles')
    exact = next((v for v in vehicles if str(v.get('number') or '').strip() == number), None)
    if exact:
        return exact
    compact = re.sub(r'[^A-Za-z0-9]', '', number).upper()
    return next((v for v in vehicles if re.sub(r'[^A-Za-z0-9]', '', str(v.get('number') or '')).upper() == compact), None)


def validate_vehicle_id_location(vehicle_id, test_day):
    """Use Motive's simple v1 single-date endpoint as an ID sanity check."""
    try:
        payload, _ = motive_request(
            f'/v1/vehicle_locations/{vehicle_id}',
            {'date': test_day.isoformat()},
            timeout=30,
            extra_headers={'X-Time-Zone': 'America/Chicago'}
        )
        pts = extract_gps_points(payload)
        return {'ok': True, 'point_count': len(pts), 'sample': pts[:3], 'error': ''}
    except Exception as exc:
        return {'ok': False, 'point_count': 0, 'sample': [], 'error': str(exc)}


def fetch_driving_periods_diagnostic(vehicle_id, start_day, end_day):
    """Fallback diagnostic using Motive driving periods.

    Driving periods expose origin/destination coordinates and distance. They are not a
    replacement for breadcrumbs, but they prove the vehicle moved and give us a second
    route-data source when /vehicle_locations history is unavailable.
    """
    out = []
    page = 1
    while page <= 50:
        params = {
            'vehicle_ids[]': [int(vehicle_id)] if str(vehicle_id).isdigit() else [vehicle_id],
            'type': 'driving',
            'start_date': start_day.isoformat(),
            'end_date': end_day.isoformat(),
            'per_page': 100,
            'page_no': page,
        }
        payload, _ = motive_request(
            '/v1/driving_periods', params, timeout=35,
            extra_headers={'X-Time-Zone': 'America/Chicago'}
        )
        raw_items = extract_list(payload, 'driving_periods')
        items = [unwrap_item(x, 'driving_period') for x in raw_items]
        for d in items:
            if not isinstance(d, dict):
                continue
            vehicle = d.get('vehicle') if isinstance(d.get('vehicle'), dict) else {}
            out.append({
                'id': d.get('id'),
                'start_time': d.get('start_time') or '',
                'end_time': d.get('end_time') or '',
                'origin': d.get('origin') or '',
                'origin_lat': d.get('origin_lat'),
                'origin_lon': d.get('origin_lon'),
                'destination': d.get('destination') or '',
                'destination_lat': d.get('destination_lat'),
                'destination_lon': d.get('destination_lon'),
                'distance': d.get('distance'),
                'start_kilometers': d.get('start_kilometers'),
                'end_kilometers': d.get('end_kilometers'),
                'vehicle_id': vehicle.get('id') if vehicle else d.get('vehicle_id'),
                'vehicle_number': vehicle.get('number') if vehicle else '',
                'status': d.get('status') or '',
                'source': d.get('source'),
            })
        total = payload.get('total') if isinstance(payload, dict) else None
        if total is None and isinstance(payload, dict) and isinstance(payload.get('pagination'), dict):
            total = payload['pagination'].get('total')
        if not items or len(items) < 100 or (isinstance(total, (int, float)) and len(out) >= int(total)):
            break
        page += 1
    out.sort(key=lambda x: str(x.get('start_time') or ''))
    return out


def summarize_driving_periods(periods):
    rows=[]
    for p in periods:
        dist=_float_or_none(p.get('distance'))
        # Motive's driving-period distance may be a string. Preserve it if conversion fails.
        rows.append({**p, 'distance_numeric': dist})
    return rows

def build_vehicle_history_diagnostic(tractor_number, start_day, end_day):
    """Read Motive tractor history without requiring the older validation calls.

    v72 treats a successful historical-location response as the authoritative proof
    that the resolved /v1/vehicles ID is valid.  The legacy single-day validation
    and driving-period requests used X-Time-Zone values that some Motive accounts
    reject with HTTP 400 even while v3 breadcrumb history works normally.  Those
    calls are now fallback-only so they cannot create a false failure warning.
    """
    number = str(tractor_number or '').strip()
    if not number:
        raise RuntimeError('Enter a tractor number.')
    vehicle = fetch_vehicle_master_record(number)
    if not vehicle:
        raise RuntimeError(f'Tractor {number} was not found in Motive /v1/vehicles. The historical-location API requires the internal vehicle ID from that master list.')
    vehicle_id = vehicle.get('id')
    if vehicle_id in (None, ''):
        raise RuntimeError(f'Tractor {number} does not have a Motive vehicle ID in /v1/vehicles.')

    points=[]; api_version='unavailable'; fallback_message=''; history_error=''
    try:
        points, api_version, fallback_message = fetch_vehicle_history_diagnostic(vehicle_id, start_day, end_day)
    except Exception as exc:
        history_error = str(exc)

    # Driving periods are diagnostic fallback only.  If dense breadcrumb history is
    # present, no second Motive request is necessary and no timezone validation can
    # incorrectly downgrade an otherwise successful test.
    driving_periods=[]; driving_periods_error=''; driving_periods_skipped=False
    if points:
        driving_periods_skipped = True
    else:
        try:
            driving_periods = fetch_driving_periods_diagnostic(vehicle_id, start_day, end_day)
        except Exception as exc:
            driving_periods_error = str(exc)

    if history_error and not driving_periods:
        detail = f'; driving-period fallback also failed: {driving_periods_error}' if driving_periods_error else ''
        raise RuntimeError(
            f'Historical vehicle locations failed for Motive vehicle ID {vehicle_id}: {history_error}{detail}'
        )
    days = summarize_vehicle_history(points, start_day, end_day)
    first = points[0] if points else None
    last = points[-1] if points else None
    overall_odo_delta = None
    odo_values = [p.get('odometer') for p in points if _float_or_none(p.get('odometer')) is not None]
    if odo_values:
        first_odo, last_odo = _float_or_none(odo_values[0]), _float_or_none(odo_values[-1])
        if first_odo is not None and last_odo is not None and last_odo >= first_odo:
            overall_odo_delta = last_odo - first_odo

    sample = []
    if len(points) <= 80:
        sample = points
    elif points:
        # Spread the sample across the whole requested range instead of only showing day one.
        step = max(1, len(points) // 80)
        sample = points[::step][:79]
        if sample[-1] is not points[-1]:
            sample.append(points[-1])
    clean_sample = [{
        'located_at': p.get('located_at') or '',
        'lat': p.get('lat'), 'lon': p.get('lon'),
        'speed': p.get('speed'), 'odometer': p.get('odometer'),
        'type': p.get('type') or '', 'description': p.get('description') or ''
    } for p in sample]

    return {
        'tractor_number': str(vehicle.get('number') or number),
        'vehicle_id': vehicle_id,
        'vin': vehicle.get('vin') or '',
        'start_date': start_day.isoformat(), 'end_date': end_day.isoformat(),
        'api_version': api_version,
        'vehicle_id_source': '/v1/vehicles',
        'history_verified': bool(points),
        'history_error': history_error,
        'v3_fallback_message': fallback_message,
        'driving_periods': summarize_driving_periods(driving_periods),
        'driving_period_count': len(driving_periods),
        'driving_periods_error': driving_periods_error,
        'driving_periods_skipped': driving_periods_skipped,
        'point_count': len(points),
        'days_with_points': sum(1 for d in days if d.get('point_count')),
        'first_at': first.get('located_at') if first else '',
        'last_at': last.get('located_at') if last else '',
        'first_location': _gps_label(first) if first else '',
        'last_location': _gps_label(last) if last else '',
        'odometer_delta': overall_odo_delta,
        'days': days,
        'sample': clean_sample,
        'generated_at': datetime.now(timezone.utc).isoformat()
    }


def fetch_historical_odometer(vehicle_id, service_day):
    """Return the latest usable Motive odometer reading for a selected calendar date."""
    points = fetch_vehicle_gps_history(vehicle_id, service_day, service_day)
    usable = []
    for pt in points:
        odo = _float_or_none(pt.get('odometer'))
        if odo is None or odo <= 0:
            continue
        usable.append({**pt, 'odometer': odo})
    if not usable:
        return {
            'found': False, 'vehicle_id': str(vehicle_id),
            'service_date': service_day.isoformat(), 'point_count': len(points),
            'message': 'Motive returned no historical odometer reading for this tractor on the selected date.'
        }
    usable.sort(key=lambda x: str(x.get('located_at') or ''))
    selected = usable[-1]
    return {
        'found': True, 'vehicle_id': str(vehicle_id),
        'service_date': service_day.isoformat(), 'point_count': len(points),
        'odometer': selected.get('odometer'),
        'located_at': selected.get('located_at') or '',
        'latitude': selected.get('lat'), 'longitude': selected.get('lon'),
        'description': selected.get('description') or '',
        'source': 'Motive historical vehicle location',
        'message': 'Historical Motive odometer found.'
    }


def haversine_miles(lat1, lon1, lat2, lon2):
    vals = [_float_or_none(x) for x in (lat1, lon1, lat2, lon2)]
    if any(v is None for v in vals):
        return 1e9
    lat1, lon1, lat2, lon2 = vals
    r = 3958.7613
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(min(1, math.sqrt(a)))


def points_for_ifta_trip(points, trip):
    """Select the breadcrumb slice most likely belonging to one IFTA jurisdiction row."""
    if not points:
        return []
    start_odo = _float_or_none(trip.get('start_odometer'))
    end_odo = _float_or_none(trip.get('end_odometer'))
    lo, hi = None, None
    if start_odo is not None and end_odo is not None:
        lo, hi = sorted((start_odo, end_odo))
        odo_points = [p for p in points if p.get('odometer') is not None and lo-1.5 <= p['odometer'] <= hi+1.5]
        if len(odo_points) >= 2:
            return odo_points

    slat, slon = _float_or_none(trip.get('start_lat')), _float_or_none(trip.get('start_lon'))
    elat, elon = _float_or_none(trip.get('end_lat')), _float_or_none(trip.get('end_lon'))
    if slat is not None and slon is not None and elat is not None and elon is not None:
        # If odometers are unavailable, first constrain endpoint matching to the IFTA
        # service date. Repeated assigned routes often visit the same terminals every day;
        # searching a multi-day history without this guard can select the wrong occurrence.
        target_day = str(trip.get('date') or '')[:10]
        scoped = [p for p in points if _point_day_key(p) == target_day] if target_day else []
        candidate_points = scoped if len(scoped) >= 2 else points
        start_idx = min(range(len(candidate_points)), key=lambda i: haversine_miles(candidate_points[i]['lat'], candidate_points[i]['lon'], slat, slon))
        end_candidates = range(start_idx, len(candidate_points)) if start_idx < len(candidate_points)-1 else range(len(candidate_points))
        end_idx = min(end_candidates, key=lambda i: haversine_miles(candidate_points[i]['lat'], candidate_points[i]['lon'], elat, elon))
        if end_idx < start_idx:
            start_idx, end_idx = end_idx, start_idx
        selected = candidate_points[start_idx:end_idx+1]
        if len(selected) >= 2:
            return selected

    # Last-resort route from the IFTA row's own endpoint coordinates.
    endpoints = []
    if slat is not None and slon is not None: endpoints.append({'lat': slat, 'lon': slon})
    if elat is not None and elon is not None: endpoints.append({'lat': elat, 'lon': elon})
    return endpoints


def downsample_points(points, max_points=45):
    clean = []
    last = None
    for p in points:
        lat, lon = _float_or_none(p.get('lat')), _float_or_none(p.get('lon'))
        if lat is None or lon is None:
            continue
        cur = (round(lat, 6), round(lon, 6))
        if cur == last:
            continue
        last = cur
        clean.append({'lat': lat, 'lon': lon, 'located_at': p.get('located_at') or ''})
    if len(clean) <= max_points:
        return clean
    # Keep evenly spaced points, always retaining the first and last breadcrumb.
    idxs = sorted(set(round(i*(len(clean)-1)/(max_points-1)) for i in range(max_points)))
    return [clean[i] for i in idxs]


def normalize_route_ref(value):
    """Normalize OSM/OSRM road refs into the compact style used on FedEx IVMRs."""
    value = str(value or '').strip()
    if not value:
        return ''
    value = value.replace(';', ',')
    value = re.sub(r'\s+', ' ', value).strip(' ,')
    value = re.sub(r'(?i)^interstate(?: highway)?\s+([0-9]+[A-Z]?)(?:\s+(business|bus))?$',
                   lambda m: 'I-' + m.group(1) + (' BUS' if m.group(2) else ''), value)
    value = re.sub(r'(?i)^I[ -]?([0-9]+[A-Z]?)(?:\s+(?:Business|BUS))?$',
                   lambda m: 'I-' + m.group(1) + (' BUS' if re.search(r'(?i)business|bus', value) else ''), value)
    value = re.sub(r'(?i)^(?:US|U\.S\.|US Highway|United States Route)[ -]?([0-9]+[A-Z]?)(?:\s+(Business|Bypass|BUS|BYP))?$',
                   lambda m: 'US ' + m.group(1) + ((' ' + ('BUS' if m.group(2).upper().startswith('BUS') else 'BYP')) if m.group(2) else ''), value)
    # FedEx examples use SR for state routes rather than TN-155 / NC-27, etc.
    value = re.sub(r'(?i)^(?:TN|NC|SC|GA|AL|VA|KY|FL|MS|AR|MO|OH|IN|PA|WV|MD)[ -]?([0-9]+[A-Z]?)$', r'SR \1', value)
    value = re.sub(r'(?i)^(?:(?:Tennessee|North Carolina|South Carolina|Georgia|Alabama|Virginia|Kentucky|Florida|Mississippi|Arkansas|Missouri|Ohio|Indiana|Pennsylvania|West Virginia|Maryland)\s+)?(?:State Route|State Road|SR)[ -]?([0-9]+[A-Z]?)$', r'SR \1', value)
    return value.strip()


def extract_osrm_roads(payload):
    """Extract the ordered road/ref sequence from either Match or Route service output."""
    roads = []
    containers = []
    if isinstance(payload, dict):
        containers.extend(payload.get('matchings') or [])
        containers.extend(payload.get('routes') or [])
    for route in containers:
        for leg in (route.get('legs') or []):
            for step in (leg.get('steps') or []):
                ref_value = str(step.get('ref') or '').strip()
                refs = [x.strip() for x in re.split(r'[;,]', ref_value) if x.strip()] if ref_value else []
                candidates = refs or [step.get('name') or '']
                for raw in candidates:
                    road = normalize_route_ref(raw)
                    if not road:
                        continue
                    # If OSM has no formal ref, retain only road names that look useful on an IVMR.
                    if not refs and not re.search(r'(?i)\b(highway|parkway|turnpike|pike|expressway|freeway|bypass)\b|^(I-|US |SR )', road):
                        continue
                    # Collapse only consecutive duplicates. A road may legitimately appear again later
                    # after the tractor leaves and rejoins it, which FedEx's example reports preserve.
                    if not roads or roads[-1].upper() != road.upper():
                        roads.append(road)
    # Guard against pathological step output while keeping a real travel sequence intact.
    return roads[:24]


def _osrm_json(endpoint, timeout=7):
    req = Request(endpoint, headers={
        'Accept': 'application/json',
        'User-Agent': 'NBL-Business-Analyzer/26 (IVMR hybrid route reconstruction)'
    })
    with urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8', errors='replace'))


def _route_distance_miles(payload):
    meters = 0.0
    for key in ('matchings', 'routes'):
        items = payload.get(key) if isinstance(payload, dict) else None
        if isinstance(items, list):
            meters += sum(float(x.get('distance') or 0) for x in items if isinstance(x, dict))
    return meters / 1609.344 if meters else None


def _distance_quality(actual_miles, expected_miles):
    if actual_miles is None or expected_miles in (None, 0):
        return None
    expected = abs(float(expected_miles))
    if expected < 0.1:
        return None
    return abs(actual_miles - expected) / expected


def _clean_moving_points(points):
    """Remove duplicate/stationary noise while retaining the shape of the driven path."""
    clean = []
    for p in points or []:
        lat, lon = _float_or_none(p.get('lat')), _float_or_none(p.get('lon'))
        if lat is None or lon is None:
            continue
        q = dict(p); q['lat'] = lat; q['lon'] = lon
        if not clean:
            clean.append(q); continue
        d = haversine_miles(clean[-1]['lat'], clean[-1]['lon'], lat, lon)
        # ~16 feet. Avoid hundreds of identical yard/terminal breadcrumbs.
        if d < 0.003:
            continue
        clean.append(q)
    return clean


def _anchor_points(points, max_points=10):
    """Choose geographically distributed waypoints for OSRM Route fallback."""
    clean = _clean_moving_points(points)
    if len(clean) <= max_points:
        return downsample_points(clean, max_points)
    # Sampling by cumulative straight-line travel is more stable than sampling by raw breadcrumb count.
    cumulative = [0.0]
    for a, b in zip(clean, clean[1:]):
        cumulative.append(cumulative[-1] + haversine_miles(a['lat'], a['lon'], b['lat'], b['lon']))
    total = cumulative[-1]
    if total <= 0:
        return downsample_points(clean, max_points)
    chosen = []
    for i in range(max_points):
        target = total * i / (max_points - 1)
        idx = min(range(len(cumulative)), key=lambda j: abs(cumulative[j] - target))
        if not chosen or chosen[-1] != idx:
            chosen.append(idx)
    if chosen[-1] != len(clean)-1:
        chosen[-1] = len(clean)-1
    return [{'lat': clean[i]['lat'], 'lon': clean[i]['lon'], 'located_at': clean[i].get('located_at') or ''} for i in chosen]


def _osrm_match_attempt(points, radius, expected_miles=None, max_points=90):
    pts = downsample_points(_clean_moving_points(points), max_points)
    if len(pts) < 2:
        return {'route': '', 'provider': 'OSRM Match', 'method': 'match', 'point_count': len(pts), 'matched': False, 'message': 'Not enough moving GPS points.'}
    coords = ';'.join(f"{p['lon']:.6f},{p['lat']:.6f}" for p in pts)
    endpoint = f'https://router.project-osrm.org/match/v1/driving/{coords}'
    params = {
        'steps': 'true', 'overview': 'false', 'geometries': 'geojson',
        'radiuses': ';'.join([str(radius)] * len(pts)),
        'gaps': 'ignore', 'tidy': 'true'
    }
    endpoint += '?' + urlencode(params)
    try:
        payload = _osrm_json(endpoint, timeout=10)
        if str(payload.get('code') or '').lower() != 'ok':
            return {'route': '', 'provider': 'OSRM Match', 'method': 'match', 'point_count': len(pts), 'matched': False,
                    'message': str(payload.get('message') or payload.get('code') or 'No match')}
        roads = extract_osrm_roads(payload)
        actual = _route_distance_miles(payload)
        variance = _distance_quality(actual, expected_miles)
        confidences = [float(m.get('confidence')) for m in (payload.get('matchings') or []) if m.get('confidence') is not None]
        confidence = min(confidences) if confidences else None
        return {
            'route': ','.join(roads), 'provider': f'OSRM Match {radius}m', 'method': 'match',
            'point_count': len(pts), 'matched': bool(roads), 'road_count': len(roads),
            'distance_miles': actual, 'distance_variance': variance, 'confidence': confidence
        }
    except Exception as exc:
        return {'route': '', 'provider': f'OSRM Match {radius}m', 'method': 'match', 'point_count': len(pts), 'matched': False, 'message': str(exc)}


def _osrm_route_fallback(points, expected_miles=None, max_anchors=14, timeout=8):
    """Fast route reconstruction through GPS anchors from the actual Motive trace.

    Legacy fallback uses one bounded GPS-anchor route request per unique Motive corridor.
    The dense Motive history is used to select geographically distributed anchors,
    so the route still follows the tractor's actual path while requiring only one
    lightweight network request per IFTA segment.
    """
    pts = _anchor_points(points, max_anchors)
    if len(pts) < 2:
        return {'route': '', 'provider': 'OSRM Route via GPS anchors', 'method': 'route', 'point_count': len(pts), 'matched': False, 'message': 'Not enough GPS anchors.'}
    coords = ';'.join(f"{p['lon']:.6f},{p['lat']:.6f}" for p in pts)
    endpoint = f'https://router.project-osrm.org/route/v1/driving/{coords}'
    endpoint += '?' + urlencode({'steps': 'true', 'overview': 'false', 'geometries': 'geojson', 'continue_straight': 'true'})
    try:
        payload = _osrm_json(endpoint, timeout=timeout)
        if str(payload.get('code') or '').lower() != 'ok':
            return {'route': '', 'provider': 'OSRM Route via GPS anchors', 'method': 'route', 'point_count': len(pts), 'matched': False,
                    'message': str(payload.get('message') or payload.get('code') or 'No route')}
        roads = extract_osrm_roads(payload)
        actual = _route_distance_miles(payload)
        variance = _distance_quality(actual, expected_miles)
        review = variance is not None and variance > 0.35
        return {
            'route': ','.join(roads), 'provider': f'Motive History + OSRM Route ({len(pts)} anchors)', 'method': 'gps_anchor_route',
            'point_count': len(pts), 'matched': bool(roads), 'review': review,
            'road_count': len(roads), 'distance_miles': actual, 'distance_variance': variance,
            'message': (f'Route mileage differs from IFTA mileage by {variance:.0%}.' if review else '')
        }
    except Exception as exc:
        return {'route': '', 'provider': 'OSRM Route via GPS anchors', 'method': 'route', 'point_count': len(pts), 'matched': False, 'message': str(exc)}


def _merge_road_sequences(sequences):
    roads = []
    for seq in sequences:
        for road in seq or []:
            road = normalize_route_ref(road)
            if not road:
                continue
            if not roads or roads[-1].upper() != road.upper():
                roads.append(road)
    return roads[:32]


def _route_chunks(points, target_miles=85.0, max_points=45):
    """Split a long Motive breadcrumb trace into manageable map-matching chunks.

    A Clarksville-Knoxville round trip is roughly 450+ miles and can contain more
    than 2,000 Motive points. Sending that as one public OSRM Match request is both
    fragile and unnecessary. Legacy helper retained for compatibility; v69 no longer relies on segmented map matching. It slices the actual driven trace by cumulative GPS
    distance, overlaps one point between chunks, and then downsamples each slice.
    """
    clean = _clean_moving_points(points)
    if len(clean) < 2:
        return []
    cumulative = [0.0]
    for a, b in zip(clean, clean[1:]):
        d = haversine_miles(a['lat'], a['lon'], b['lat'], b['lon'])
        cumulative.append(cumulative[-1] + (d if math.isfinite(d) and d < 25 else 0.0))
    total = cumulative[-1]
    if total <= target_miles or len(clean) <= max_points:
        return [downsample_points(clean, max_points)]
    chunks = []
    start_idx = 0
    target = target_miles
    while start_idx < len(clean)-1:
        if target >= total:
            end_idx = len(clean)-1
        else:
            end_idx = min(range(start_idx+1, len(clean)), key=lambda i: abs(cumulative[i]-target))
            end_idx = max(start_idx+1, end_idx)
        segment = clean[start_idx:end_idx+1]
        sampled = downsample_points(segment, max_points)
        if len(sampled) >= 2:
            chunks.append(sampled)
        if end_idx >= len(clean)-1:
            break
        # Overlap the final point so adjoining road sequences join cleanly.
        start_idx = end_idx
        target = cumulative[start_idx] + target_miles
    return chunks



def _state_code(value):
    raw = str(value or '').strip().upper()
    if raw in STATE_FIPS:
        return raw
    return STATE_NAME_TO_CODE.get(raw, '')


def _tiger_route_label(fullname, route_type):
    name = re.sub(r'\s+', ' ', str(fullname or '').strip())
    upper = name.upper()
    rt = str(route_type or '').strip().upper()
    if not name:
        return ''
    nums = re.findall(r'(?<!\d)(\d+[A-Z]?)(?!\d)', upper)
    num = nums[0] if nums else ''
    qualifier = ''
    if re.search(r'\b(?:BUS|BUSINESS)\b', upper):
        qualifier = ' BUS'
    elif re.search(r'\b(?:BYP|BYPASS)\b', upper):
        qualifier = ' BYP'
    elif re.search(r'\b(?:ALT|ALTERNATE)\b', upper):
        qualifier = ' ALT'
    direction = ''
    mdir = re.match(r'^\s*([NSEW])\b', upper)
    if mdir:
        direction = mdir.group(1)
    if rt == 'I' and num:
        return f'I-{num}{qualifier}'
    if rt == 'U' and num:
        # Motive Mileage Reports sometimes retain directional U.S. Highway labels,
        # e.g. N US HWY 231 / S US HWY 231. Preserve that detail when TIGER has it.
        if direction and re.search(r'\b(?:US|U\.S\.|HIGHWAY|HWY)\b', upper):
            return f'{direction} US HWY {num}{qualifier}'
        return f'US {num}{qualifier}'
    if rt == 'S' and num:
        return f'SR {num}{qualifier}'
    if rt == 'C' and num:
        return f'CR {num}{qualifier}'
    norm = normalize_route_ref(name)
    if re.match(r'^(I-|US |SR |CR )', norm, re.I):
        return norm
    if re.search(r'(?i)\b(highway|hwy|parkway|pkwy|turnpike|expressway|freeway|bypass|pike)\b', name):
        return name
    return name if rt in {'M','O'} else ''


def _ensure_tiger_state_roads(jurisdiction):
    if shapefile is None:
        raise RuntimeError('The bundled Census road reader could not be loaded.')
    code = _state_code(jurisdiction)
    if not code:
        raise RuntimeError(f'No Census road dataset mapping is available for jurisdiction {jurisdiction!r}.')
    fips = STATE_FIPS[code]
    ROAD_DATA_DIR.mkdir(parents=True, exist_ok=True)
    state_dir = ROAD_DATA_DIR / code
    state_dir.mkdir(parents=True, exist_ok=True)
    stem = f'tl_2025_{fips}_prisecroads'
    shp_path = state_dir / f'{stem}.shp'
    if shp_path.exists() and (state_dir / f'{stem}.dbf').exists() and (state_dir / f'{stem}.shx').exists():
        return code, shp_path

    zip_path = state_dir / f'{stem}.zip'
    if not zip_path.exists() or zip_path.stat().st_size < 1024:
        url = f'https://www2.census.gov/geo/tiger/TIGER2025/PRISECROADS/{stem}.zip'
        part = state_dir / f'{stem}.zip.part'
        req = Request(url, headers={
            'Accept': 'application/zip,application/octet-stream,*/*',
            'User-Agent': 'NBL-Business-Analyzer/72 (IVMR Census TIGER road data)'
        })
        try:
            with urlopen(req, timeout=120) as resp, open(part, 'wb') as out:
                while True:
                    chunk = resp.read(1024 * 1024)
                    if not chunk:
                        break
                    out.write(chunk)
            part.replace(zip_path)
        except Exception as exc:
            try:
                part.unlink()
            except Exception:
                pass
            raise RuntimeError(f'Could not download official Census road data for {code}: {exc}') from exc

    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for name in zf.namelist():
                low = name.lower()
                if not low.endswith(('.shp','.shx','.dbf','.prj','.cpg')):
                    continue
                target = state_dir / Path(name).name
                with zf.open(name) as src, open(target, 'wb') as dst:
                    while True:
                        chunk = src.read(1024 * 1024)
                        if not chunk:
                            break
                        dst.write(chunk)
    except Exception as exc:
        raise RuntimeError(f'Could not unpack Census road data for {code}: {exc}') from exc
    if not shp_path.exists():
        raise RuntimeError(f'Census road data for {code} did not contain the expected shapefile.')
    return code, shp_path


def _grid_key(lat, lon, size=0.08):
    return (int(math.floor(float(lat) / size)), int(math.floor(float(lon) / size)))


def _load_tiger_state_index(jurisdiction):
    code = _state_code(jurisdiction)
    if not code:
        raise RuntimeError(f'Unsupported IFTA jurisdiction: {jurisdiction}')
    with ROAD_INDEX_LOCK:
        cached = ROAD_INDEX_CACHE.get(code)
    if cached is not None:
        return cached

    _, shp_path = _ensure_tiger_state_roads(code)
    try:
        reader = shapefile.Reader(str(shp_path), encoding='latin1')
    except Exception as exc:
        raise RuntimeError(f'Could not read Census road data for {code}: {exc}') from exc
    fields = [f[0] for f in reader.fields[1:]]
    try:
        records = reader.records()
    except Exception as exc:
        raise RuntimeError(f'Could not read Census road attributes for {code}: {exc}') from exc

    features = []
    grid = {}
    wide = []
    cell = 0.08
    for shape_index, shape in enumerate(reader.iterShapes()):
        try:
            rec = records[shape_index]
            vals = dict(zip(fields, list(rec)))
            label = _tiger_route_label(vals.get('FULLNAME'), vals.get('RTTYP'))
            bbox = list(shape.bbox or [])
            if not label or len(bbox) < 4:
                continue
            feature_index = len(features)
            features.append({'shape_index': shape_index, 'bbox': bbox, 'label': label, 'rttyp': str(vals.get('RTTYP') or '')})
            x0, y0, x1, y1 = bbox
            r0, c0 = _grid_key(y0, x0, cell)
            r1, c1 = _grid_key(y1, x1, cell)
            cells = (abs(r1-r0)+1) * (abs(c1-c0)+1)
            if cells > 350:
                wide.append(feature_index)
                continue
            for rr in range(min(r0,r1), max(r0,r1)+1):
                for cc in range(min(c0,c1), max(c0,c1)+1):
                    grid.setdefault((rr,cc), []).append(feature_index)
        except Exception:
            continue
    data = {'code': code, 'reader': reader, 'features': features, 'grid': grid, 'wide': wide, 'cell': cell}
    with ROAD_INDEX_LOCK:
        ROAD_INDEX_CACHE[code] = data
    return data


def _segment_point_distance_miles(lat, lon, ax, ay, bx, by):
    # Local equirectangular projection centered on the GPS sample.
    sx = 69.172 * max(0.2, math.cos(math.radians(lat)))
    sy = 69.0
    x1, y1 = (ax-lon)*sx, (ay-lat)*sy
    x2, y2 = (bx-lon)*sx, (by-lat)*sy
    vx, vy = x2-x1, y2-y1
    denom = vx*vx + vy*vy
    if denom <= 1e-12:
        return math.hypot(x1, y1), None
    t = max(0.0, min(1.0, -(x1*vx + y1*vy)/denom))
    px, py = x1 + t*vx, y1 + t*vy
    dist = math.hypot(px, py)
    bearing = math.degrees(math.atan2(vx, vy)) % 180.0
    return dist, bearing


def _shape_distance_miles(reader, feature, lat, lon, travel_bearing=None):
    try:
        shape = reader.shape(feature['shape_index'])
    except Exception:
        return 1e9
    pts = shape.points or []
    if len(pts) < 2:
        return 1e9
    parts = list(shape.parts or [0]) + [len(pts)]
    best = 1e9
    for a, b in zip(parts, parts[1:]):
        section = pts[a:b]
        for p1, p2 in zip(section, section[1:]):
            dist, road_bearing = _segment_point_distance_miles(lat, lon, p1[0], p1[1], p2[0], p2[1])
            score = dist
            if travel_bearing is not None and road_bearing is not None:
                diff = abs((road_bearing - travel_bearing + 90.0) % 180.0 - 90.0)
                # A crossing road can be equally close at an interchange. Prefer the
                # road aligned with the tractor's actual direction of travel.
                score += max(0.0, diff - 20.0) / 70.0 * 0.12
            if feature.get('rttyp') == 'I':
                score -= 0.015
            elif feature.get('rttyp') == 'U':
                score -= 0.007
            if score < best:
                best = score
    return best


def _sample_history_points(points, spacing_miles=2.5, max_points=220):
    clean = _clean_moving_points(points)
    if len(clean) <= 2:
        return clean
    out = [clean[0]]
    since = 0.0
    last = clean[0]
    for p in clean[1:]:
        d = haversine_miles(last['lat'], last['lon'], p['lat'], p['lon'])
        last = p
        if not math.isfinite(d) or d > 25:
            continue
        since += d
        if since >= spacing_miles:
            out.append(p)
            since = 0.0
            if len(out) >= max_points-1:
                break
    if out[-1] is not clean[-1]:
        out.append(clean[-1])
    return out


def _travel_bearing(samples, idx):
    if not samples:
        return None
    a = samples[max(0, idx-1)]
    b = samples[min(len(samples)-1, idx+1)]
    if a is b:
        return None
    lat = (a['lat'] + b['lat']) / 2.0
    sx = max(0.2, math.cos(math.radians(lat)))
    dx = (b['lon'] - a['lon']) * sx
    dy = b['lat'] - a['lat']
    if abs(dx) + abs(dy) < 1e-9:
        return None
    return math.degrees(math.atan2(dx, dy)) % 180.0


def tiger_route_from_history(points, jurisdiction, expected_miles=None):
    samples = _sample_history_points(points)
    if len(samples) < 2:
        return {'route':'','provider':'Census TIGER/Line','method':'tiger_nearest_road','matched':False,'route_status':'unmatched','point_count':len(samples),'message':'Not enough Motive GPS movement.'}
    data = _load_tiger_state_index(jurisdiction)
    reader, features, grid, wide, cell = data['reader'], data['features'], data['grid'], data['wide'], data['cell']
    labels = []
    match_details = []
    for i, p in enumerate(samples):
        lat, lon = p['lat'], p['lon']
        rr, cc = _grid_key(lat, lon, cell)
        candidates = set(wide)
        for radius in (1, 2):
            for r in range(rr-radius, rr+radius+1):
                for c in range(cc-radius, cc+radius+1):
                    candidates.update(grid.get((r,c), ()))
            if candidates:
                break
        bearing = _travel_bearing(samples, i)
        best_label, best_score = '', 1e9
        for fi in candidates:
            f = features[fi]
            x0,y0,x1,y1 = f['bbox']
            # Cheap bounding box guard (~1.5 miles latitude, longitude adjusted later by exact distance).
            if lon < x0-0.04 or lon > x1+0.04 or lat < y0-0.04 or lat > y1+0.04:
                continue
            score = _shape_distance_miles(reader, f, lat, lon, bearing)
            if score < best_score:
                best_score, best_label = score, f['label']
        if best_score <= 0.55:
            labels.append(best_label)
            match_details.append((best_label, best_score))
        else:
            labels.append('')
            match_details.append(('', best_score))

    # Replace one-sample crossing-road glitches when the surrounding road agrees.
    smooth = labels[:]
    for i in range(1, len(smooth)-1):
        if smooth[i-1] and smooth[i-1] == smooth[i+1] and smooth[i] != smooth[i-1]:
            smooth[i] = smooth[i-1]

    support = {}
    first_pos = {}
    for i, label in enumerate(smooth):
        if not label:
            continue
        support[label] = support.get(label, 0) + 1
        first_pos.setdefault(label, i)
    ordered = sorted(support, key=lambda x: first_pos[x])
    roads = []
    for label in ordered:
        count = support[label]
        if count < 2 and not re.match(r'^(I-|US |SR )', label, re.I):
            continue
        if label not in roads:
            roads.append(label)
    roads = roads[:12]
    matched_samples = sum(1 for x in smooth if x)
    match_rate = matched_samples / max(1, len(samples))
    gps_miles = 0.0
    clean = _clean_moving_points(points)
    for a,b in zip(clean, clean[1:]):
        d = haversine_miles(a['lat'],a['lon'],b['lat'],b['lon'])
        if math.isfinite(d) and d < 25:
            gps_miles += d
    if not roads:
        return {
            'route':'','provider':f"Motive v3 History + Census TIGER/Line 2025 ({data['code']})",
            'method':'tiger_nearest_road','matched':False,'route_status':'unmatched','point_count':len(samples),
            'distance_miles':gps_miles or None,'message':f'Official road matching found no stable highway names ({matched_samples}/{len(samples)} GPS samples near primary/secondary roads).'
        }
    review = match_rate < 0.35
    return {
        'route': ','.join(roads),
        'provider': f"Motive v3 History + Census TIGER/Line 2025 ({data['code']})",
        'method':'tiger_nearest_road','matched':True,'route_status':'review' if review else 'matched',
        'point_count':len(samples),'road_count':len(roads),'distance_miles':gps_miles or None,
        'distance_variance':_distance_quality(gps_miles or None, expected_miles),'match_rate':match_rate,
        'message':(f'Only {match_rate:.0%} of sampled GPS points matched a primary/secondary road; review route.' if review else '')
    }


def route_from_history(points, jurisdiction, expected_miles=None):
    """v72 production route engine: Motive GPS + official Census road geometry.

    Public OSRM is no longer used by the production IVMR builder.  The raw Mileage
    Report format can contain many short segments; falling back to a public router for
    every unmatched segment can make a report take many minutes.  Census TIGER/Line
    matching is local after the state road file is cached, so unmatched local-road
    segments are returned for review instead of blocking the entire build.
    """
    try:
        return tiger_route_from_history(points, jurisdiction, expected_miles)
    except Exception as exc:
        return {
            'route':'', 'provider':'Motive v3 History + Census TIGER/Line',
            'method':'tiger_nearest_road', 'matched':False, 'route_status':'unmatched',
            'point_count':len(points or []), 'message':str(exc)
        }


def osrm_map_match(points, expected_miles=None):
    """Legacy bounded public-router reconstruction from dense Motive history.

    v68 could issue many sequential Match/chunk requests for one tractor-day, which
    made a multi-day IVMR build appear to hang. The fallback routes through a compact
    set of anchors sampled from the actual breadcrumb path. One request is normally
    sufficient; a smaller-anchor retry is used only if the first request fails.
    """
    clean = _clean_moving_points(points)
    if len(clean) < 2:
        return {'route': '', 'provider': 'Motive History + OSRM Route', 'method': 'none', 'point_count': len(clean), 'matched': False, 'route_status': 'unmatched', 'message': 'Not enough GPS movement.'}

    result = _osrm_route_fallback(clean, expected_miles, max_anchors=10, timeout=6)
    if not result.get('matched'):
        # One bounded retry with fewer waypoints handles occasional public-router
        # URL/waypoint limits without falling back into a long retry chain.
        retry = _osrm_route_fallback(clean, expected_miles, max_anchors=6, timeout=6)
        if retry.get('matched') or not result.get('message'):
            result = retry

    if result.get('matched'):
        result['provider'] = result.get('provider') or 'Motive History + OSRM Route'
        result['method'] = 'gps_anchor_route'
        result['route_status'] = 'review' if result.get('review') else 'matched'
        return result

    result['provider'] = result.get('provider') or 'Motive History + OSRM Route'
    result['method'] = result.get('method') or 'gps_anchor_route'
    result['route_status'] = 'unmatched'
    return result


def _route_corridor_signature(points, expected_miles=None):
    """Create a stable fingerprint for repeated tractor routes in one build.

    Repeated assigned runs can have slightly different breadcrumb timing and Motive
    place labels. The production engine fingerprints the physical corridor using the trip's
    start/end, its farthest point from the start (the turnaround/destination on a
    round trip), and an IFTA-distance bucket.  This is stable across weekday repeats
    while still separating materially different routes.
    """
    clean = _clean_moving_points(points)
    if len(clean) < 2:
        return ''

    def q(v):
        return round(float(v), 1)
    first, last = clean[0], clean[-1]
    farthest = max(
        clean,
        key=lambda p: haversine_miles(first['lat'], first['lon'], p['lat'], p['lon'])
    )
    expected = _float_or_none(expected_miles)
    if expected is None:
        expected = 0.0
        for a, b in zip(clean, clean[1:]):
            d = haversine_miles(a['lat'], a['lon'], b['lat'], b['lon'])
            if math.isfinite(d) and d < 25:
                expected += d
    miles_bucket = int(round(expected / 25.0) * 25) if expected else 0
    return (
        f"{q(first['lat']):.1f},{q(first['lon']):.1f}|"
        f"{q(farthest['lat']):.1f},{q(farthest['lon']):.1f}|"
        f"{q(last['lat']):.1f},{q(last['lon']):.1f}|{miles_bucket}"
    )


def _normalize_ivmr_locations(locations):
    out = []
    if not isinstance(locations, list):
        return out
    for raw in locations:
        if not isinstance(raw, dict):
            continue
        city = str(raw.get('city') or '').strip()
        state = str(raw.get('state') or '').strip().upper()
        spot = str(raw.get('spot') or raw.get('location_name') or '').strip()
        label = str(raw.get('label') or '').strip()
        if not label:
            if spot and city:
                label = f'{spot} - {city}'
            elif spot:
                label = spot
            else:
                label = city
        if not label:
            continue
        aliases = raw.get('aliases')
        if isinstance(aliases, str):
            aliases = [x.strip() for x in re.split(r'[,;|\n]+', aliases) if x.strip()]
        elif not isinstance(aliases, list):
            aliases = []
        alias_values = [city] + aliases
        out.append({
            'id': str(raw.get('id') or label),
            'spot': spot,
            'city': city,
            'state': state,
            'label': label,
            'lat': _float_or_none(raw.get('lat')),
            'lon': _float_or_none(raw.get('lon')),
            'radius_miles': max(0.5, _float_or_none(raw.get('radius_miles')) or 8.0),
            'aliases': [str(x).strip() for x in alias_values if str(x).strip()],
        })
    return out


def _ivmr_desc_tokens(value):
    raw = re.sub(r'[^A-Za-z0-9 ]+', ' ', str(value or '')).lower()
    return [x for x in re.split(r'\s+', raw) if x]


def _match_ivmr_origin(trip, selected_points, locations):
    """Match the beginning of one IFTA segment to the user-managed IVMR location master.

    The Mileage Report examples populate Origin/Destination only at recognized stops or
    city/spot locations.  Transit rows stay blank.  Prefer GPS proximity; use Motive's
    beginning-location description only as a secondary alias match.
    """
    if not locations:
        return {'label':'', 'status':'none'}
    slat = _float_or_none(trip.get('start_lat'))
    slon = _float_or_none(trip.get('start_lon'))
    desc = ''
    start_speed = None
    if selected_points:
        start_odo = _float_or_none(trip.get('start_odometer'))
        usable = [p for p in selected_points if _float_or_none(p.get('odometer')) is not None]
        first = min(usable, key=lambda p: abs((_float_or_none(p.get('odometer')) or 0)-start_odo)) if usable and start_odo is not None else selected_points[0]
        if slat is None: slat = _float_or_none(first.get('lat'))
        if slon is None: slon = _float_or_none(first.get('lon'))
        desc = str(first.get('description') or '').strip()
        start_speed = _float_or_none(first.get('speed'))
    normalized = _normalize_ivmr_locations(locations)

    nearest = None
    if slat is not None and slon is not None:
        for loc in normalized:
            if loc['lat'] is None or loc['lon'] is None:
                continue
            if loc['state'] and _state_code(trip.get('jurisdiction')) and loc['state'] != _state_code(trip.get('jurisdiction')):
                continue
            dist = haversine_miles(slat, slon, loc['lat'], loc['lon'])
            stopped_enough = start_speed is None or start_speed <= 20 or (_float_or_none(trip.get('distance')) or 0) <= 0.05 or dist <= 0.5
            if stopped_enough and dist <= loc['radius_miles'] and (nearest is None or dist < nearest[0]):
                nearest = (dist, loc)
    if nearest is not None:
        dist, loc = nearest
        return {
            'label': loc['label'], 'status':'matched', 'method':'gps_radius',
            'location_id':loc['id'], 'distance_miles':dist,
            'start_description':desc
        }

    # Description matching is deliberately conservative.  It is used only when a
    # configured alias/city appears in Motive's first breadcrumb description and the
    # state does not conflict. This avoids filling every transit city automatically.
    desc_text = ' '.join(_ivmr_desc_tokens(desc))
    # Alias-only matches are intended for recognized stop beginnings, not every city
    # the tractor passes through. A low/unknown starting speed or zero-mile row is a
    # conservative proxy for a stop/geofence boundary.
    alias_allowed = start_speed is None or start_speed <= 20 or (_float_or_none(trip.get('distance')) or 0) <= 0.05
    if desc_text and alias_allowed:
        best = None
        for loc in normalized:
            if loc['state'] and _state_code(trip.get('jurisdiction')) and loc['state'] != _state_code(trip.get('jurisdiction')):
                continue
            for alias in loc['aliases']:
                a = ' '.join(_ivmr_desc_tokens(alias))
                if not a:
                    continue
                if a in desc_text:
                    score = len(a)
                    if best is None or score > best[0]:
                        best = (score, loc)
        if best is not None:
            loc = best[1]
            return {
                'label':loc['label'], 'status':'matched', 'method':'motive_description',
                'location_id':loc['id'], 'distance_miles':None,
                'start_description':desc
            }
    return {'label':'', 'status':'none', 'method':'none', 'start_description':desc}


def reconstruct_ifta_routes(trips, locations=None):
    """Build Mileage-Report-style IVMR segments from raw Motive IFTA fragments.

    The user's FedEx/Motive Mileage Reports do not collapse an entire day/state into
    one line, but they also do not expose every tiny raw IFTA fragment.  They start a
    new line at a date boundary, jurisdiction boundary, recognized stop/city-spot,
    odometer discontinuity, or retained zero-mile location row.  v72 reproduces that
    middle level of granularity, then calculates Highway / Route Traveled for each
    resulting segment from dense Motive v3 history.
    """
    if not isinstance(trips, list):
        return [], {'attempted':0,'matched':0,'failed':0,'vehicles':0,'segments':0}
    raw_rows=[dict(t) for t in trips]
    locations=_normalize_ivmr_locations(locations or [])
    by_vehicle={}
    for idx,trip in enumerate(raw_rows):
        vehicle=trip.get('vehicle') if isinstance(trip.get('vehicle'),dict) else {}
        vid=vehicle.get('id')
        if vid in (None,''):
            raw_rows[idx]['route_status']='missing_vehicle'
            raw_rows[idx]['route_message']='Motive vehicle ID is missing.'
            continue
        by_vehicle.setdefault(str(vid),[]).append(raw_rows[idx])

    stats={
        'attempted':0,'matched':0,'failed':0,'vehicles':len(by_vehicle),
        'locations_matched':0,'raw_rows':len(raw_rows),'segments':0,
        'provider':'Motive v3 History + Census TIGER/Line road matching'
    }
    all_segments=[]

    for vid,vehicle_rows in by_vehicle.items():
        vehicle_rows=sorted(vehicle_rows,key=lambda r:(
            str(r.get('date') or ''),
            float(r.get('start_odometer') if r.get('start_odometer') is not None else 1e18),
            float(r.get('end_odometer') if r.get('end_odometer') is not None else 1e18),
            str(r.get('jurisdiction') or ''),str(r.get('id') or '')
        ))
        dates=[parse_iso_day(r.get('date')) for r in vehicle_rows]
        dates=[d for d in dates if d]
        if not dates:
            for r in vehicle_rows:
                r['route_status']='date_error'; r['route_message']='IFTA row date is missing.'
            all_segments.extend(vehicle_rows)
            continue
        try:
            gps=fetch_vehicle_gps_history(vid,min(dates)-timedelta(days=1),max(dates)+timedelta(days=1))
        except Exception as exc:
            for r in vehicle_rows:
                r['route_status']='gps_error'; r['route_message']=str(exc); r['location_status']='none'
                if (_float_or_none(r.get('distance')) or 0)>0.05: stats['failed']+=1
            all_segments.extend(vehicle_rows)
            continue

        # First identify which raw-row beginnings are recognized stops/city-spots.
        enriched=[]
        for r in vehicle_rows:
            selected=points_for_ifta_trip(gps,r)
            loc=_match_ivmr_origin(r,selected,locations)
            q=dict(r)
            q['origin_destination']=loc.get('label') or ''
            q['location_status']=loc.get('status') or 'none'
            q['location_method']=loc.get('method') or ''
            q['origin_location_id']=loc.get('location_id') or ''
            q['origin_match_distance']=loc.get('distance_miles')
            q['origin_start_description']=loc.get('start_description') or ''
            if q['origin_destination']: stats['locations_matched']+=1
            enriched.append(q)

        # Merge tiny raw IFTA fragments until a Mileage Report boundary is reached.
        segments=[]
        current=None
        seg_no=0
        def finish_current():
            nonlocal current
            if current is not None:
                segments.append(current)
                current=None

        for r in enriched:
            vehicle=r.get('vehicle') if isinstance(r.get('vehicle'),dict) else {}
            vehicle_key=str(vehicle.get('id') or vehicle.get('number') or vid)
            day=str(r.get('date') or '')[:10]
            juris=str(r.get('jurisdiction') or '').upper()
            start_odo=_float_or_none(r.get('start_odometer'))
            end_odo=_float_or_none(r.get('end_odometer'))
            distance=_float_or_none(r.get('distance')) or 0.0

            # Zero-mile / near-zero records are explicit Mileage Report lines. Keep
            # them standalone even when they do not match a configured location.
            if distance <= 0.05:
                finish_current()
                seg_no += 1
                zero = dict(r)
                zero['id'] = f"ivmr72:{vehicle_key}:{day}:{juris}:{seg_no}:{start_odo if start_odo is not None else 'na'}"
                zero['source_ifta_ids'] = [r.get('id')] if r.get('id') not in (None,'') else []
                zero['source_ifta_count'] = 1
                zero['distance'] = distance
                segments.append(zero)
                continue

            boundary=True
            if current is not None:
                cv=current.get('vehicle') if isinstance(current.get('vehicle'),dict) else {}
                same_vehicle=str(cv.get('id') or cv.get('number') or '')==vehicle_key
                same_day=str(current.get('date') or '')[:10]==day
                same_juris=str(current.get('jurisdiction') or '').upper()==juris
                prev_end=_float_or_none(current.get('end_odometer'))
                continuous=prev_end is None or start_odo is None or abs(start_odo-prev_end)<=3.0
                recognized_start=bool(str(r.get('origin_destination') or '').strip())
                # A recognized stop begins a new Mileage Report line. Otherwise, raw
                # IFTA fragments within the same day/state are folded together.
                boundary=not (same_vehicle and same_day and same_juris and continuous and not recognized_start)

            if boundary:
                finish_current()
                seg_no+=1
                current=dict(r)
                current['id']=f"ivmr72:{vehicle_key}:{day}:{juris}:{seg_no}:{start_odo if start_odo is not None else 'na'}"
                current['source_ifta_ids']=[r.get('id')] if r.get('id') not in (None,'') else []
                current['source_ifta_count']=1
                current['distance']=distance
            else:
                current['distance']=(_float_or_none(current.get('distance')) or 0.0)+distance
                current['end_odometer']=r.get('end_odometer') if r.get('end_odometer') is not None else current.get('end_odometer')
                current['raw_end_odometer']=r.get('raw_end_odometer') if r.get('raw_end_odometer') is not None else current.get('raw_end_odometer')
                current['calibrated_end_odometer']=r.get('calibrated_end_odometer') if r.get('calibrated_end_odometer') is not None else current.get('calibrated_end_odometer')
                current['end_lat']=r.get('end_lat') if r.get('end_lat') is not None else current.get('end_lat')
                current['end_lon']=r.get('end_lon') if r.get('end_lon') is not None else current.get('end_lon')
                current['source_ifta_count']=int(current.get('source_ifta_count') or 1)+1
                if r.get('id') not in (None,''):
                    current.setdefault('source_ifta_ids',[]).append(r.get('id'))

        finish_current()

        # Recompute route geometry at the Mileage Report segment level.
        work=[]
        for i,seg in enumerate(segments):
            seg['format_version']=72
            distance=_float_or_none(seg.get('distance')) or 0.0
            if distance<=0.05:
                seg['highway']=''; seg['route_status']='not_needed'
                continue
            selected=points_for_ifta_trip(gps,seg)
            work.append((i,selected))
            stats['attempted']+=1

        corridor_groups={}
        for i,selected in work:
            sig=f"{_state_code(segments[i].get('jurisdiction'))}|{_route_corridor_signature(selected,_float_or_none(segments[i].get('distance'))) or f'row:{i}'}"
            corridor_groups.setdefault(sig,[]).append((i,selected))
        stats['unique_corridors']=stats.get('unique_corridors',0)+len(corridor_groups)
        stats['reused_rows']=stats.get('reused_rows',0)+max(0,len(work)-len(corridor_groups))

        def run_match(item):
            sig,members=item
            i,selected=members[0]
            result=route_from_history(selected,segments[i].get('jurisdiction'),_float_or_none(segments[i].get('distance')))
            return sig,members,result

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures={pool.submit(run_match,item):len(item[1]) for item in corridor_groups.items()}
            for fut in as_completed(futures):
                try:
                    sig,members,result=fut.result()
                except Exception as exc:
                    stats['failed']+=futures.get(fut,1)
                    continue
                for member_i,selected in members:
                    rr=dict(result)
                    if member_i!=members[0][0] and result.get('matched'):
                        rr['provider']='Motive v3 History + reused Census road corridor'
                        rr['method']='gps_corridor_cache'
                        rr['point_count']=len(selected)
                    seg=segments[member_i]
                    seg['highway']=rr.get('route') or ''
                    seg['route_provider']=rr.get('provider') or 'Motive v3 History + Census TIGER/Line'
                    seg['route_method']=rr.get('method') or ''
                    seg['route_point_count']=rr.get('point_count',0)
                    seg['route_distance_miles']=rr.get('distance_miles')
                    seg['route_distance_variance']=rr.get('distance_variance')
                    seg['route_confidence']=rr.get('confidence')
                    seg['route_status']=rr.get('route_status') or ('matched' if rr.get('matched') else 'unmatched')
                    if rr.get('message'): seg['route_message']=rr.get('message')
                    if rr.get('matched'): stats['matched']+=1
                    else: stats['failed']+=1
        all_segments.extend(segments)

    all_segments.sort(key=lambda r:(
        str(r.get('date') or ''),
        str((r.get('vehicle') or {}).get('number') or ''),
        float(r.get('start_odometer') if r.get('start_odometer') is not None else 1e18),
        float(r.get('end_odometer') if r.get('end_odometer') is not None else 1e18),
        str(r.get('jurisdiction') or '')
    ))
    stats['segments']=len(all_segments)
    return all_segments,stats

def parse_iso_day(value):
    try:
        return date.fromisoformat(str(value))
    except Exception:
        return None


def ifta_trip_list(payload):
    """Return normalized Motive IFTA trip objects across response wrapper variants."""
    items = extract_list(payload, 'ifta_trips')
    if not items:
        items = extract_list(payload, 'trips')
    return [unwrap_item(x, 'ifta_trip') for x in items]


def normalize_ifta_trip(item):
    item = item or {}
    vehicle = item.get('vehicle') if isinstance(item.get('vehicle'), dict) else {}
    def num_or_none(value):
        try:
            if value in (None, ''):
                return None
            return float(value)
        except Exception:
            return None
    start_odo = item.get('calibrated_start_odometer') or item.get('start_odometer')
    end_odo = item.get('calibrated_end_odometer') or item.get('end_odometer')
    return {
        'id': item.get('id'),
        'date': str(item.get('date') or ''),
        'jurisdiction': str(item.get('jurisdiction') or ''),
        'distance': num_or_none(item.get('distance')) or 0,
        'start_odometer': num_or_none(start_odo),
        'end_odometer': num_or_none(end_odo),
        'raw_start_odometer': num_or_none(item.get('start_odometer')),
        'raw_end_odometer': num_or_none(item.get('end_odometer')),
        'calibrated_start_odometer': num_or_none(item.get('calibrated_start_odometer')),
        'calibrated_end_odometer': num_or_none(item.get('calibrated_end_odometer')),
        'start_lat': num_or_none(item.get('start_lat')),
        'start_lon': num_or_none(item.get('start_lon')),
        'end_lat': num_or_none(item.get('end_lat')),
        'end_lon': num_or_none(item.get('end_lon')),
        'time_zone': str(item.get('time_zone') or ''),
        'vehicle': {
            'id': vehicle.get('id'),
            'number': str(vehicle.get('number') or ''),
            'year': str(vehicle.get('year') or ''),
            'make': str(vehicle.get('make') or ''),
            'model': str(vehicle.get('model') or ''),
            'vin': str(vehicle.get('vin') or ''),
            'metric_units': vehicle.get('metric_units')
        }
    }


def aggregate_ifta_for_ivmr(rows):
    """Merge Motive's small IFTA movement fragments into IVMR travel segments.

    Motive may return many IFTA trip rows for one tractor on one day even when the
    vehicle never leaves the same jurisdiction. FL-001 is much more useful when
    contiguous same-jurisdiction fragments are represented as one line with the
    first/last odometer and summed miles. A new segment is started whenever the
    jurisdiction changes, the date changes, the tractor changes, or odometers show
    a material discontinuity.
    """
    if not rows:
        return []
    ordered = sorted(rows, key=lambda x: (
        str((x.get('vehicle') or {}).get('id') or (x.get('vehicle') or {}).get('number') or ''),
        str(x.get('date') or ''),
        float(x.get('start_odometer') if x.get('start_odometer') is not None else 1e18),
        str(x.get('jurisdiction') or ''),
        str(x.get('id') or '')
    ))
    out = []
    current = None
    seg_no = 0
    for row in ordered:
        r = dict(row)
        v = r.get('vehicle') if isinstance(r.get('vehicle'), dict) else {}
        vehicle_key = str(v.get('id') or v.get('number') or '')
        day = str(r.get('date') or '')[:10]
        juris = str(r.get('jurisdiction') or '').upper()
        start_odo = _float_or_none(r.get('start_odometer'))
        end_odo = _float_or_none(r.get('end_odometer'))

        merge = False
        if current is not None:
            cv = current.get('vehicle') if isinstance(current.get('vehicle'), dict) else {}
            same_vehicle = str(cv.get('id') or cv.get('number') or '') == vehicle_key
            same_day = str(current.get('date') or '')[:10] == day
            same_juris = str(current.get('jurisdiction') or '').upper() == juris
            prev_end = _float_or_none(current.get('end_odometer'))
            # Motive calibration can create tiny overlap/gap differences between fragments.
            continuous = prev_end is None or start_odo is None or abs(start_odo - prev_end) <= 3.0
            merge = same_vehicle and same_day and same_juris and continuous

        if not merge:
            if current is not None:
                out.append(current)
            seg_no += 1
            current = r
            current['id'] = f"ivmr:{vehicle_key}:{day}:{juris}:{seg_no}"
            current['source_ifta_ids'] = [r.get('id')] if r.get('id') not in (None,'') else []
            current['source_ifta_count'] = 1
            current['distance'] = _float_or_none(r.get('distance')) or 0.0
            current['raw_start_odometer'] = r.get('raw_start_odometer')
            current['raw_end_odometer'] = r.get('raw_end_odometer')
            current['calibrated_start_odometer'] = r.get('calibrated_start_odometer')
            current['calibrated_end_odometer'] = r.get('calibrated_end_odometer')
            continue

        current['distance'] = (_float_or_none(current.get('distance')) or 0.0) + (_float_or_none(r.get('distance')) or 0.0)
        current['end_odometer'] = r.get('end_odometer') if r.get('end_odometer') is not None else current.get('end_odometer')
        current['raw_end_odometer'] = r.get('raw_end_odometer') if r.get('raw_end_odometer') is not None else current.get('raw_end_odometer')
        current['calibrated_end_odometer'] = r.get('calibrated_end_odometer') if r.get('calibrated_end_odometer') is not None else current.get('calibrated_end_odometer')
        current['end_lat'] = r.get('end_lat') if r.get('end_lat') is not None else current.get('end_lat')
        current['end_lon'] = r.get('end_lon') if r.get('end_lon') is not None else current.get('end_lon')
        current['source_ifta_count'] = int(current.get('source_ifta_count') or 1) + 1
        if r.get('id') not in (None,''):
            current.setdefault('source_ifta_ids', []).append(r.get('id'))
    if current is not None:
        out.append(current)

    # Restore chronological order across tractors for display/export.
    out.sort(key=lambda x: (
        str(x.get('date') or ''),
        str((x.get('vehicle') or {}).get('number') or ''),
        float(x.get('start_odometer') if x.get('start_odometer') is not None else 1e18),
        str(x.get('jurisdiction') or '')
    ))
    return out


# ---------------------------------------------------------------------------
# Payroll worked-day detection from Motive HOS logs (v46)
# ---------------------------------------------------------------------------
def hos_log_list(payload):
    return [unwrap_item(x, 'log') for x in extract_list(payload, 'logs')]


def fetch_hos_logs(start_day, end_day, per_page=100, max_pages=50):
    """Fetch company HOS logs for an inclusive date range."""
    if not start_day or not end_day or end_day < start_day:
        raise RuntimeError('Enter a valid HOS start and end date.')
    out, page = [], 1
    while page <= max_pages:
        params = {
            'start_date': start_day.isoformat(),
            'end_date': end_day.isoformat(),
            'status': 'all',
            'per_page': per_page,
            'page_no': page,
        }
        payload, _ = motive_request('/v1/logs', params, timeout=35)
        items = hos_log_list(payload)
        out.extend(items)
        if not items or len(items) < per_page:
            break
        page += 1
    return out


def _hos_driver(log):
    d = log.get('driver') if isinstance(log.get('driver'), dict) else {}
    if isinstance(d.get('driver'), dict):
        d = d['driver']
    first = str(d.get('first_name') or log.get('driver_first_name') or '').strip()
    last = str(d.get('last_name') or log.get('driver_last_name') or '').strip()
    full = ' '.join(x for x in (first, last) if x).strip()
    return {
        'id': d.get('id') or log.get('driver_id'),
        'company_id': str(d.get('driver_company_id') or log.get('driver_company_id') or '').strip(),
        'first_name': first,
        'last_name': last,
        'name': full or str(log.get('driver_name') or '').strip(),
    }


def _hos_event_list(log):
    raw = log.get('events')
    if not isinstance(raw, list):
        return []
    return [unwrap_item(x, 'event') for x in raw]


def _hos_event_type(event):
    value = str(event.get('type') or event.get('status') or event.get('duty_status') or '').strip().lower()
    return re.sub(r'[^a-z0-9]+', '_', value).strip('_')


def _hos_tz_name(value):
    value = str(value or '').strip()
    low = value.lower()
    if '/' in value:
        return value
    if 'eastern' in low: return 'America/New_York'
    if 'central' in low: return 'America/Chicago'
    if 'mountain' in low: return 'America/Denver'
    if 'pacific' in low: return 'America/Los_Angeles'
    if 'alaska' in low: return 'America/Anchorage'
    if 'hawai' in low: return 'Pacific/Honolulu'
    return ''


def _hos_dt(value, log_day='', tz_label=''):
    text = str(value or '').strip()
    if not text:
        return None
    try:
        # Motive returns ISO-8601 timestamps. Preserve the offset Motive supplied;
        # that keeps the driver's log-day boundary rather than the computer's timezone.
        return datetime.fromisoformat(text.replace('Z', '+00:00'))
    except Exception:
        pass
    # Last-resort parser for date + time strings without ISO separators.
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
        try: return datetime.strptime(text[:19], fmt)
        except Exception: pass
    return None


def compute_hos_workdays(logs, pay_start, pay_end):
    """
    NBL payroll rule:
      * On-duty and driving are work statuses.
      * A continuous work session counts once, on the date the session STARTED.
      * Fetching the previous Friday lets a Friday-night session continue through
        Saturday without incorrectly counting Saturday as a second paid day.
    """
    if not pay_start or not pay_end:
        return []
    by_driver = {}
    for log in logs or []:
        if not isinstance(log, dict):
            continue
        driver = _hos_driver(log)
        key = str(driver.get('id') or driver.get('company_id') or driver.get('name') or '').strip()
        if not key:
            continue
        rec = by_driver.setdefault(key, {**driver, 'events': [], 'log_dates': set(), 'logs_count': 0})
        # Fill missing identity fields from another daily log for the same driver.
        for fld in ('id','company_id','first_name','last_name','name'):
            if not rec.get(fld) and driver.get(fld): rec[fld] = driver[fld]
        rec['logs_count'] += 1
        log_day = str(log.get('date') or '')[:10]
        if log_day: rec['log_dates'].add(log_day)
        tz_label = str(log.get('time_zone') or '')
        for event in _hos_event_list(log):
            typ = _hos_event_type(event)
            start = _hos_dt(event.get('start_time') or event.get('time'), log_day, tz_label)
            end = _hos_dt(event.get('end_time'), log_day, tz_label)
            if start is None:
                continue
            # Use Motive's local timestamp date when an offset/local timestamp is supplied.
            # When the timestamp is UTC-only and Motive gives a log date, an event that is
            # clearly part of that daily log is anchored to the log date below.
            local_day = start.date()
            if log_day:
                try:
                    ld = date.fromisoformat(log_day)
                    if abs((local_day - ld).days) <= 1 and str(event.get('start_time') or '').endswith('Z'):
                        local_day = ld
                except Exception:
                    pass
            rec['events'].append({
                'id': str(event.get('id') or ''), 'type': typ, 'start': start,
                'end': end, 'local_day': local_day, 'log_day': log_day
            })

    results = []
    work_types = {'driving', 'on_duty', 'onduty'}
    for rec in by_driver.values():
        # De-duplicate daily-log overlap while retaining chronological status transitions.
        events, seen = [], set()
        for ev in sorted(rec['events'], key=lambda x: (((x['start'].timestamp() if x['start'].tzinfo else x['start'].replace(tzinfo=timezone.utc).timestamp())), x['id'], x['type'])):
            key = ev['id'] or (ev['start'].isoformat(), ev['type'], ev['end'].isoformat() if ev['end'] else '')
            if key in seen: continue
            seen.add(key); events.append(ev)

        in_work = False
        sessions = []
        current = None
        for ev in events:
            is_work = ev['type'] in work_types
            if is_work and not in_work:
                current = {
                    'start': ev['start'].isoformat(),
                    'start_date': ev['local_day'].isoformat(),
                    'first_status': ev['type'],
                    'end': (ev['end'] or ev['start']).isoformat(),
                }
                sessions.append(current)
            elif is_work and current:
                current['end'] = (ev['end'] or ev['start']).isoformat()
            elif not is_work and current:
                current['end'] = ev['start'].isoformat()
                current = None
            in_work = is_work

        worked = []
        for sess in sessions:
            try: d = date.fromisoformat(sess['start_date'])
            except Exception: continue
            if pay_start <= d <= pay_end:
                worked.append(d.isoformat())
        worked = sorted(set(worked))
        results.append({
            'motive_driver_id': rec.get('id'),
            'driver_company_id': rec.get('company_id') or '',
            'first_name': rec.get('first_name') or '',
            'last_name': rec.get('last_name') or '',
            'name': rec.get('name') or '',
            'worked_dates': worked,
            'workday_count': len(worked),
            'sessions': sessions,
            'logs_count': rec.get('logs_count', 0),
        })
    results.sort(key=lambda x: (x.get('last_name') or '', x.get('first_name') or '', str(x.get('motive_driver_id') or '')))
    return results


def fetch_hos_workdays(pay_start, pay_end):
    # Include the day before the Saturday-Friday pay week. This is essential for
    # recognizing a Friday shift that remains On Duty/Driving after midnight Saturday.
    context_start = pay_start - timedelta(days=1)
    logs = fetch_hos_logs(context_start, pay_end)
    drivers = compute_hos_workdays(logs, pay_start, pay_end)
    return {
        'start_date': pay_start.isoformat(),
        'end_date': pay_end.isoformat(),
        'context_start_date': context_start.isoformat(),
        'drivers': drivers,
        'log_count': len(logs),
    }


def fetch_ifta_window(start_day, end_day, vehicle_ids=None, per_page=100, max_pages=200):
    out = []
    page = 1
    while page <= max_pages:
        params = {
            'start_date': start_day.isoformat(),
            'end_date': end_day.isoformat(),
            'per_page': per_page,
            'page_no': page,
        }
        if vehicle_ids:
            params['vehicle_ids[]'] = [int(v) for v in vehicle_ids]
        payload, _ = motive_request('/v1/ifta/trips', params)
        items = ifta_trip_list(payload)
        out.extend(items)
        total = payload.get('total') if isinstance(payload, dict) else None
        if total is None and isinstance(payload, dict) and isinstance(payload.get('pagination'), dict):
            total = payload['pagination'].get('total')
        if not items or (isinstance(total, (int, float)) and len(out) >= int(total)):
            break
        page += 1
    return out


def fetch_ifta_trips(start_day, end_day, vehicle_ids=None):
    """Fetch a reporting period in small windows to tolerate Motive date-duration limits."""
    if not start_day or not end_day or end_day < start_day:
        raise RuntimeError('Enter a valid IVMR start and end date.')
    if (end_day - start_day).days > 370:
        raise RuntimeError('IVMR reporting periods are limited to 371 days per request.')
    raw = []
    cursor = start_day
    # 28-day windows are deliberately conservative because Motive may enforce date-duration limits.
    while cursor <= end_day:
        window_end = min(end_day, cursor + timedelta(days=27))
        raw.extend(fetch_ifta_window(cursor, window_end, vehicle_ids=vehicle_ids))
        cursor = window_end + timedelta(days=1)
    # De-duplicate across adjacent windows and pagination, retaining stable raw details.
    deduped, seen = [], set()
    for item in raw:
        v = item.get('vehicle') if isinstance(item.get('vehicle'), dict) else {}
        key = item.get('id') or (
            item.get('date'), item.get('jurisdiction'), v.get('id'), v.get('number'),
            item.get('start_odometer'), item.get('end_odometer'), item.get('distance')
        )
        key = str(key)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalize_ifta_trip(item))
    deduped.sort(key=lambda x: (x.get('date') or '', str((x.get('vehicle') or {}).get('number') or ''), (x.get('start_odometer') if x.get('start_odometer') is not None else 1e18), (x.get('end_odometer') if x.get('end_odometer') is not None else 1e18), x.get('jurisdiction') or '', str(x.get('id') or '')))
    # v72 preserves Motive's original IFTA segmentation. The FL-001 mileage reports
    # supplied by the user keep state/jurisdiction and stop-boundary rows rather than
    # consolidating an entire day/state into one line.
    return deduped


def _normalize_application_date(value):
    raw = str(value or '').strip()
    if not raw or '*' in raw:
        return ''
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y', '%B %d, %Y', '%b %d, %Y'):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            pass
    return ''


def _smart_name_piece(value):
    value = re.sub(r'\s+', ' ', str(value or '').strip())
    if not value:
        return ''
    if value.isupper():
        return value.title()
    return value


def _normalize_spaced_pdf_text(text):
    """Normalize First Advantage PDFs whose text layer stores each glyph as a token.

    Some FADV exports visually render normal words but extract as ``T e r e n c e``.
    We only collapse those character-spaced runs, leaving ordinary PDF text untouched.
    """
    normalized = []
    for raw_line in str(text or '').splitlines():
        line = raw_line.replace('\xa0', ' ').strip()
        if not line:
            normalized.append('')
            continue
        tokens = line.split()
        singleish = sum(1 for t in tokens if len(t) == 1 or (len(t) == 2 and t in {"'s", 'N/'}))
        # The newer FADV format usually has almost every visible character separated.
        if len(tokens) >= 5 and singleish / max(len(tokens), 1) >= 0.72:
            parts = re.split(r' {2,}', line)
            rebuilt = []
            for part in parts:
                ptoks = part.split()
                if len(ptoks) >= 2 and sum(1 for t in ptoks if len(t) == 1) / len(ptoks) >= 0.72:
                    rebuilt.append(''.join(ptoks))
                else:
                    rebuilt.append(part)
            line = ' '.join(x for x in rebuilt if x)
        normalized.append(re.sub(r'[ \t]+', ' ', line).strip())
    return '\n'.join(normalized)


def _normalize_cdl_issuing_state(value):
    raw = re.sub(r'\s+', ' ', str(value or '')).strip().strip(',:;')
    if not raw:
        return ''
    us_states = {
        'ALABAMA':'AL','ALASKA':'AK','ARIZONA':'AZ','ARKANSAS':'AR','CALIFORNIA':'CA','COLORADO':'CO','CONNECTICUT':'CT','DELAWARE':'DE','FLORIDA':'FL','GEORGIA':'GA','HAWAII':'HI','IDAHO':'ID','ILLINOIS':'IL','INDIANA':'IN','IOWA':'IA','KANSAS':'KS','KENTUCKY':'KY','LOUISIANA':'LA','MAINE':'ME','MARYLAND':'MD','MASSACHUSETTS':'MA','MICHIGAN':'MI','MINNESOTA':'MN','MISSISSIPPI':'MS','MISSOURI':'MO','MONTANA':'MT','NEBRASKA':'NE','NEVADA':'NV','NEW HAMPSHIRE':'NH','NEW JERSEY':'NJ','NEW MEXICO':'NM','NEW YORK':'NY','NORTH CAROLINA':'NC','NORTH DAKOTA':'ND','OHIO':'OH','OKLAHOMA':'OK','OREGON':'OR','PENNSYLVANIA':'PA','RHODE ISLAND':'RI','SOUTH CAROLINA':'SC','SOUTH DAKOTA':'SD','TENNESSEE':'TN','TEXAS':'TX','UTAH':'UT','VERMONT':'VT','VIRGINIA':'VA','WASHINGTON':'WA','WEST VIRGINIA':'WV','WISCONSIN':'WI','WYOMING':'WY','DISTRICT OF COLUMBIA':'DC'
    }
    upper = raw.upper().replace('.', '')
    if upper in us_states:
        return us_states[upper]
    if re.fullmatch(r'[A-Z]{2}', upper):
        return upper
    return raw


def parse_hr_application_pdf(pdf_bytes):
    """Extract supported candidate fields from both known FedEx / First Advantage PDF formats.

    The parser is intentionally conservative: it does not infer operational fields such as
    domicile, shift, employment type, or recruitment status. When a full SSN is explicitly
    present in the application, it is returned so the HR profile can protect it behind the
    same Finance Access Code used by Driver Pay and Settlement.
    """
    try:
        from pypdf import PdfReader
    except Exception as exc:
        detail = f'{exc.__class__.__name__}: {exc}'
        raise RuntimeError(
            f'The bundled PDF parser could not be loaded ({detail}). '
            f'Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}.'
        ) from exc
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes), strict=False)
        if getattr(reader, 'is_encrypted', False):
            try:
                reader.decrypt('')
            except Exception:
                pass
        pages = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text() or '')
            except Exception:
                pages.append('')
    except Exception as exc:
        raise RuntimeError(f'Could not read this PDF: {exc}') from exc
    raw_text = '\n'.join(pages)
    if not raw_text.strip():
        raise RuntimeError('This PDF does not contain readable text. Scanned-image applications are not supported yet.')

    text = _normalize_spaced_pdf_text(raw_text)
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.splitlines()]
    compact = '\n'.join(lines)
    flat = re.sub(r'\s+', ' ', compact).strip()

    def first(pattern, source=None, flags=re.I | re.M):
        m = re.search(pattern, compact if source is None else source, flags)
        return m.group(1).strip() if m else ''

    def first_date_after(label_pattern):
        pattern = rf'{label_pattern}\s*:?[\s\n]*(\d{{4}}-\d{{2}}-\d{{2}}|\d{{1,2}}/\d{{1,2}}/\d{{2,4}}|[A-Za-z]{{3,9}}\s+\d{{1,2}},\s+\d{{4}})'
        for m in re.finditer(pattern, compact, re.I | re.M):
            normalized = _normalize_application_date(m.group(1))
            if normalized:
                return normalized
        return ''

    # Prefer the structured Personal Information labels. These patterns tolerate the
    # newer export splitting "Given Name" across lines and using colons.
    first_name = first(r'First Name\s*\(Given\s*Name\)\s*:?\s*([A-Za-z][A-Za-z\'’\- ]+?)(?=Email Address|Date of Birth|Primary Phone|Generation|Gender|CSP ID|FedEx ID|$)', flat)
    if not first_name:
        first_name = first(r'^First Name\s*:?\s*([A-Za-z][A-Za-z\'’\-]+)\s*$', flags=re.I | re.M)
    last_name = first(r'Last Name\s*\(Family\s*Name\)\s*:?\s*([A-Za-z][A-Za-z\'’\- ]+?)(?=Date of Birth|Middle Name|Primary Phone|Generation|Gender|CSP ID|FedEx ID|$)', flat)
    if not last_name:
        last_name = first(r'^Last Name\s*:?\s*([A-Za-z][A-Za-z\'’\-]+)\s*$', flags=re.I | re.M)
    middle_name = first(r'Middle Name\(s\)\s*:?\s*([A-Za-z][A-Za-z\'’\- ]+?)(?=Primary Phone|Generation|Gender|CSP ID|FedEx ID|$)', flat) or first(r'^Middle Name\s*:?\s*([A-Za-z][A-Za-z\'’\-]+)', flags=re.I | re.M)
    first_name, middle_name, last_name = map(_smart_name_piece, (first_name, middle_name, last_name))
    name = ' '.join(x for x in (first_name, middle_name, last_name) if x)

    email = first(r'Email Address\s*:?\s*([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})', flat)
    phone = first(r'Primary Phone\s*:?\s*(\+?[0-9][0-9()\- ]{6,24})', flat)
    if phone:
        phone = re.sub(r'\s+', ' ', phone).strip()

    fedex_id = ''
    for line in lines:
        if 'FedEx ID' not in line:
            continue
        tail = line.split('FedEx ID', 1)[1].strip(' :\t')
        # N/A means FedEx has not yet assigned an ID; a blank label should stay blank.
        if tail.upper() in {'N/A', 'NA', 'NONE'}:
            continue
        m = re.match(r'([A-Za-z0-9][A-Za-z0-9\-]{2,24})(?:\s|$)', tail)
        if m:
            value = m.group(1)
            if value.lower() not in {'page', 'date', 'name'}:
                fedex_id = value
                break

    dob = first_date_after(r'Date of Birth')

    cdl_number = ''
    for pattern in (
        r"Driver(?:'s)? License\s*#\s*:?\s*([A-Z0-9\-]{4,30})",
        r"Driver(?:'s)? License#\s*:?\s*([A-Z0-9\-]{4,30})",
    ):
        for m in re.finditer(pattern, compact, re.I | re.M):
            candidate = re.sub(r'\s+', '', m.group(1)).strip()
            if candidate and '*' not in candidate and '?' not in candidate:
                cdl_number = candidate
                break
        if cdl_number:
            break

    cdl_issuing_state = ''
    # Both known First Advantage layouts include an explicit State of Issuance field
    # on a later driver-qualification page. Prefer that over generic Region labels.
    for pattern in (
        r'State of Issuance\s*:?\s*([A-Za-z][A-Za-z .\-]{1,30})(?=\n|List states|Driver|Signature|$)',
        r'Issuing State(?:/Province)?\s*:?\s*([A-Za-z][A-Za-z .\-]{1,30})(?=\n|$)',
    ):
        m = re.search(pattern, compact, re.I | re.M)
        if m:
            cdl_issuing_state = _normalize_cdl_issuing_state(m.group(1))
            if cdl_issuing_state:
                break
    if not cdl_issuing_state:
        # Fallback: scope Region to the Driver's License section so address regions
        # elsewhere in the application cannot be mistaken for the CDL state.
        license_match = re.search(r"Driver(?:'s)? License(?: Additional Details)?(.*?)(?:Address History|Employment|Page \d+|$)", compact, re.I | re.S)
        if license_match:
            region_match = re.search(r'Region\s*:?\s*([A-Za-z][A-Za-z .\-]{1,30})(?=\n|Class|Status|Expiration|$)', license_match.group(1), re.I | re.M)
            if region_match:
                cdl_issuing_state = _normalize_cdl_issuing_state(region_match.group(1))

    cdl_expiry = first_date_after(r'Expiration Date')

    ssn_full = ''
    ssn_last4 = ''
    # Full SSNs appear on COV/Qualifications pages in both known FADV layouts.
    for ssn_match in re.finditer(r'Social Security Number\s*:?\s*([0-9][0-9\- ]{7,20}[0-9])', compact, re.I | re.M):
        digits = re.sub(r'\D', '', ssn_match.group(1))
        if len(digits) == 9:
            ssn_full = digits
            ssn_last4 = digits[-4:]
            break
    if not ssn_last4:
        for pattern in (
            r'Last four digits of Social Security number\s*:?\s*(\d{4})',
            r'Social Security Number\s*:?\s*\*+\s*(\d{4})',
        ):
            m = re.search(pattern, compact, re.I | re.M)
            if m:
                ssn_last4 = m.group(1)
                break

    applicant_id = first(r'Applicant ID\s*:?\s*([A-Z0-9\-]{6,30})', flat)
    fields = {
        'name': name,
        'email': email,
        'phone': phone,
        'fedexId': fedex_id,
        'dob': dob,
        'cdlNumber': cdl_number,
        'cdlIssuingState': cdl_issuing_state,
        'cdlExpiry': cdl_expiry,
        'ssnFull': ssn_full,
        'ssnLast4': ssn_last4,
    }
    fields = {k: v for k, v in fields.items() if str(v or '').strip()}
    labels = {
        'name': 'Name', 'email': 'Email', 'phone': 'Phone', 'fedexId': 'FedEx ID',
        'dob': 'DOB', 'cdlNumber': 'CDL Number', 'cdlIssuingState': 'CDL Issuing State', 'cdlExpiry': 'CDL Expiry', 'ssnFull': 'SSN', 'ssnLast4': 'SSN (last 4)'
    }
    detected_keys = ('name', 'email', 'phone', 'fedexId', 'dob', 'cdlNumber', 'cdlIssuingState', 'cdlExpiry')
    detected = [labels[k] for k in detected_keys if k in fields]
    if 'ssnFull' in fields:
        detected.append('SSN')
    elif 'ssnLast4' in fields:
        detected.append('SSN (last 4)')
    return {
        'fields': fields,
        'detected_fields': detected,
        'applicant_id': applicant_id,
        'page_count': len(pages),
    }


ROAD_TEST_TEMPLATE = ROOT / 'assets' / 'road-test-op104s-template.pdf'

def _road_test_date_parts(value):
    try:
        d = date.fromisoformat(str(value or ''))
    except Exception:
        d = date.today()
    return f'{d.month:02d}', f'{d.day:02d}', f'{d.year:04d}'

def _decode_signature_png(data_url):
    """Decode a browser canvas PNG into raw PDF-ready pixels without image libraries."""
    if not isinstance(data_url, str) or not data_url.startswith('data:image/png;base64,'):
        return None
    try:
        raw = base64.b64decode(data_url.split(',', 1)[1], validate=True)
    except Exception as exc:
        raise RuntimeError(f'Electronic signature image could not be decoded ({exc}).') from exc
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise RuntimeError('Electronic signature image is not a valid PNG.')
    pos = 8; idat = bytearray(); width = height = bit_depth = color_type = interlace = None
    while pos + 8 <= len(raw):
        length = struct.unpack('>I', raw[pos:pos+4])[0]; kind = raw[pos+4:pos+8]; data = raw[pos+8:pos+8+length]; pos += 12 + length
        if kind == b'IHDR':
            width, height, bit_depth, color_type, _comp, _filter, interlace = struct.unpack('>IIBBBBB', data)
        elif kind == b'IDAT': idat.extend(data)
        elif kind == b'IEND': break
    if not width or not height or bit_depth != 8 or interlace not in (0, None):
        raise RuntimeError('Electronic signature PNG uses an unsupported image format.')
    channels = {0:1, 2:3, 4:2, 6:4}.get(color_type)
    if not channels: raise RuntimeError('Electronic signature PNG uses an unsupported color type.')
    packed = zlib.decompress(bytes(idat)); stride = width * channels; rows = []; prev = bytearray(stride); idx = 0
    def paeth(a,b,c):
        p=a+b-c; pa=abs(p-a); pb=abs(p-b); pc=abs(p-c)
        return a if pa <= pb and pa <= pc else (b if pb <= pc else c)
    for _ in range(height):
        f = packed[idx]; idx += 1; cur = bytearray(packed[idx:idx+stride]); idx += stride
        for x in range(stride):
            left = cur[x-channels] if x >= channels else 0; up = prev[x]; ul = prev[x-channels] if x >= channels else 0
            if f == 1: cur[x] = (cur[x] + left) & 255
            elif f == 2: cur[x] = (cur[x] + up) & 255
            elif f == 3: cur[x] = (cur[x] + ((left + up)//2)) & 255
            elif f == 4: cur[x] = (cur[x] + paeth(left,up,ul)) & 255
            elif f != 0: raise RuntimeError('Electronic signature PNG uses an unsupported filter.')
        rows.append(cur); prev = cur
    pixels = b''.join(rows)
    if color_type == 6:
        rgb = bytearray(); alpha = bytearray()
        for i in range(0, len(pixels), 4): rgb.extend(pixels[i:i+3]); alpha.append(pixels[i+3])
        return width, height, bytes(rgb), bytes(alpha), '/DeviceRGB'
    if color_type == 4:
        gray = bytearray(); alpha = bytearray()
        for i in range(0, len(pixels), 2): gray.append(pixels[i]); alpha.append(pixels[i+1])
        return width, height, bytes(gray), bytes(alpha), '/DeviceGray'
    return width, height, pixels, None, '/DeviceRGB' if color_type == 2 else '/DeviceGray'


def _field_rect(page, field_name):
    for ref in page.get('/Annots', []):
        annot = ref.get_object()
        if annot.get('/Subtype') != '/Widget': continue
        parent_ref = annot.get('/Parent'); field = parent_ref.get_object() if parent_ref else annot
        name = field.get('/T') or annot.get('/T')
        if name == field_name:
            rect = annot.get('/Rect')
            if rect and len(rect) == 4: return tuple(float(v) for v in rect)
    return None


def _stamp_signature_png(writer, page, field_name, data_url, resource_key):
    decoded = _decode_signature_png(data_url)
    rect = _field_rect(page, field_name)
    if not decoded or not rect: return False
    from pypdf.generic import StreamObject, DictionaryObject, NameObject, NumberObject, ArrayObject
    px_w, px_h, color_bytes, alpha_bytes, color_space = decoded
    x0,y0,x1,y1 = rect; box_w=max(1.0,x1-x0); box_h=max(1.0,y1-y0)
    alpha_ref = None
    if alpha_bytes is not None:
        smask = StreamObject(); smask.set_data(zlib.compress(alpha_bytes))
        smask.update({NameObject('/Type'):NameObject('/XObject'),NameObject('/Subtype'):NameObject('/Image'),NameObject('/Width'):NumberObject(px_w),NameObject('/Height'):NumberObject(px_h),NameObject('/ColorSpace'):NameObject('/DeviceGray'),NameObject('/BitsPerComponent'):NumberObject(8),NameObject('/Filter'):NameObject('/FlateDecode')})
        alpha_ref = writer._add_object(smask)
    image = StreamObject(); image.set_data(zlib.compress(color_bytes))
    image.update({NameObject('/Type'):NameObject('/XObject'),NameObject('/Subtype'):NameObject('/Image'),NameObject('/Width'):NumberObject(px_w),NameObject('/Height'):NumberObject(px_h),NameObject('/ColorSpace'):NameObject(color_space),NameObject('/BitsPerComponent'):NumberObject(8),NameObject('/Filter'):NameObject('/FlateDecode')})
    if alpha_ref is not None: image[NameObject('/SMask')] = alpha_ref
    image_ref = writer._add_object(image)
    resources = page.get('/Resources')
    if resources is None:
        resources = DictionaryObject(); page[NameObject('/Resources')] = resources
    else: resources = resources.get_object() if hasattr(resources,'get_object') else resources
    xobjects = resources.get('/XObject')
    if xobjects is None:
        xobjects = DictionaryObject(); resources[NameObject('/XObject')] = xobjects
    else: xobjects = xobjects.get_object() if hasattr(xobjects,'get_object') else xobjects
    res_name = NameObject('/' + resource_key); xobjects[res_name] = image_ref
    pad_x=2.5; pad_y=1.0; max_w=max(1.0,box_w-2*pad_x); max_h=max(1.0,box_h-2*pad_y)
    scale=min(max_w/px_w,max_h/px_h); draw_w=px_w*scale; draw_h=px_h*scale
    draw_x=x0+pad_x; draw_y=y0+(box_h-draw_h)/2.0
    content = StreamObject(); content.set_data((f'q {draw_w:.3f} 0 0 {draw_h:.3f} {draw_x:.3f} {draw_y:.3f} cm /{resource_key} Do Q\n').encode('ascii'))
    content_ref = writer._add_object(content); current=page.get('/Contents')
    if current is None: page[NameObject('/Contents')] = content_ref
    elif isinstance(current, ArrayObject): current.append(content_ref)
    else: page[NameObject('/Contents')] = ArrayObject([current, content_ref])
    return True


def build_hr_road_test_pdf(payload):
    """Fill the supplied FedEx Ground OP-104S template without altering pre-filled content.

    The source file already contains the evaluation Y marks, equipment-familiarization
    selection, automatic-transmission selection, mileage, Nashbox Logistics employer data,
    title and addresses. Only the requested candidate/test-administrator fields are filled.
    """
    if not ROAD_TEST_TEMPLATE.exists():
        raise RuntimeError('The bundled OP-104S road-test template is missing.')
    try:
        from pypdf import PdfReader, PdfWriter
        from pypdf.generic import NameObject, TextStringObject
    except Exception as exc:
        raise RuntimeError(f'The bundled PDF writer could not be loaded ({exc.__class__.__name__}: {exc}).') from exc

    candidate = payload.get('candidate') if isinstance(payload, dict) and isinstance(payload.get('candidate'), dict) else {}
    road = payload.get('road_test') if isinstance(payload, dict) and isinstance(payload.get('road_test'), dict) else {}
    candidate_name = str(candidate.get('name') or '').strip()
    candidate_fedex_id = str(candidate.get('fedex_id') or '').strip()
    cdl_number = str(candidate.get('cdl_number') or '').strip()
    cdl_issuing_state = str(candidate.get('cdl_issuing_state') or '').strip()
    admin_name = str(road.get('test_admin_name') or '').strip()
    admin_fedex_id = str(road.get('test_admin_fedex_id') or '').strip()
    certificate = str(road.get('certificate_number') or '').strip()
    tractor = str(road.get('tractor_number') or '').strip()
    trailer = str(road.get('trailer_number') or '').strip()
    candidate_signature_png = road.get('candidate_signature_png') or ''
    admin_signature_png = road.get('admin_signature_png') or ''
    month, day, year = _road_test_date_parts(road.get('date'))

    if not candidate_name:
        raise RuntimeError('Candidate name is required for the road-test form.')
    missing = [label for label, value in (
        ('Test Administrator Name', admin_name),
        ('Test Administrator FedEx ID', admin_fedex_id),
        ('Equipment Familiarization Certificate Number', certificate),
        ('Tractor Number', tractor),
        ('Trailer Number', trailer),
    ) if not value]
    if missing:
        raise RuntimeError('Missing required road-test information: ' + ', '.join(missing) + '.')

    reader = PdfReader(str(ROAD_TEST_TEMPLATE), strict=False)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)

    values_by_page = {
        0: {
            'Date': month, 'undefined': day, 'undefined_2': year,
            'Driver Candidates Name Print 1': candidate_name, 'FedEx ID': candidate_fedex_id,
            'Test Administrator Name Print': admin_name,
            'Road Test Administrator FedEx ID if applicable': admin_fedex_id,
            'Date_2': month, 'undefined_3': day, 'undefined_4': year,
            'FedEx Ground Equipment Familiarization Acknowledgement Certificate Number 1': certificate,
            'Tractor 1': tractor, 'Trailer': trailer,
        },
        2: {
        },
        4: {
            'Text12': month, 'undefined_6': day, 'undefined_7': year,
            'Test Administrator Name Print_2': admin_name,
            'Driver Name Print': candidate_name, 'FedEx ID_2': candidate_fedex_id,
            'Driver License Number': cdl_number,
            'Issuing StateProvince': cdl_issuing_state,
            'Numerical Month': month, 'Numerical Day': day, 'Year': year,
        },
    }
    signature_overlays = {
        0: [('Signature4_es_:signer:signature', admin_signature_png, 'NblSigP1Admin')],
        2: [('Signature5_es_:signer:signature', candidate_signature_png, 'NblSigP3Candidate'), ('Signature6_es_:signer:signature', admin_signature_png, 'NblSigP3Admin')],
        4: [('Signature8_es_:signer:signature', candidate_signature_png, 'NblSigP5Candidate'), ('Signature9_es_:signer:signature', admin_signature_png, 'NblSigP5Admin'), ('Text1', admin_signature_png, 'NblSigP5AdminSection10'), ('Signature10_es_:signer:signature', admin_signature_png, 'NblSigP5AdminSection11')],
    }


    def set_field_font(page, field_names, size):
        for ref in page.get('/Annots', []):
            annot = ref.get_object()
            if annot.get('/Subtype') != '/Widget':
                continue
            parent_ref = annot.get('/Parent')
            field = parent_ref.get_object() if parent_ref else annot
            name = field.get('/T') or annot.get('/T')
            if name in field_names:
                da = TextStringObject(f'/Helv {size} Tf 0 g')
                field[NameObject('/DA')] = da
                annot[NameObject('/DA')] = da

    for page_index, raw_values in values_by_page.items():
        # Do not overwrite a source-template field with a blank value. This preserves
        # anything already populated in the supplied form.
        values = {k: str(v) for k, v in raw_values.items() if str(v or '').strip()}
        if not values:
            continue
        page = writer.pages[page_index]
        set_field_font(page, set(values), 9)
        writer.update_page_form_field_values(page, values, auto_regenerate=False)

    # Render signatures as permanent transparent PNG stamps so they look handwritten
    # without bundling or embedding an external font file.
    for page_index, items in signature_overlays.items():
        page = writer.pages[page_index]
        for field_name, data_url, resource_key in items:
            if data_url:
                _stamp_signature_png(writer, page, field_name, data_url, resource_key)

    try:
        writer.set_need_appearances_writer(True)
    except Exception:
        pass
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


class NBLHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, body, content_type='application/octet-stream', status=200, file_name=''):
        body = bytes(body or b'')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        if file_name:
            safe_name = re.sub(r'[^A-Za-z0-9._-]+', '_', str(file_name)).strip('_') or 'download.bin'
            self.send_header('Content-Disposition', f'attachment; filename="{safe_name}"')
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(size) if size else b'{}'
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            return self.send_json({'ok': True, 'app': 'NBL Business Analyzer', 'version': 77})
        if parsed.path.startswith('/api/') and not require_nbl_api_access(self, parsed.path, 'GET'):
            return
        if not parsed.path.startswith('/api/motive/'):
            return super().do_GET()
        try:
            if parsed.path == '/api/motive/status':
                key = read_motive_key()
                return self.send_json({
                    'backend_available': True,
                    'configured': bool(key),
                    'key_hint': ('••••' + key[-4:]) if key and len(key) >= 4 else ('configured' if key else ''),
                    'storage': str(MOTIVE_KEY_FILE)
                })
            if parsed.path == '/api/motive/test':
                key = read_motive_key()
                if not key:
                    return self.send_json({'ok': False, 'configured': False, 'message': 'Enter and save a Motive API key first.'}, 400)
                vehicles_ok = ifta_ok = hos_logs_ok = gps_access_ok = gps_data_ok = False
                vehicles_message = ifta_message = hos_logs_message = gps_message = ''
                gps_result = {}
                vehicle_count = None
                try:
                    payload, _ = motive_request('/v1/vehicles', {'per_page': 1, 'page_no': 1})
                    vehicles_ok = True
                    total = payload.get('total') if isinstance(payload, dict) else None
                    vehicle_count = int(total) if isinstance(total, (int, float)) else None
                except Exception as exc:
                    vehicles_message = str(exc)
                try:
                    end = date.today()
                    start = end - timedelta(days=7)
                    motive_request('/v1/ifta/summary', {'start_date': start.isoformat(), 'end_date': end.isoformat(), 'per_page': 1, 'page_no': 1})
                    ifta_ok = True
                except Exception as exc:
                    ifta_message = str(exc)
                try:
                    # Access-only test. A successful response confirms this organisation's API key
                    # can read HOS driver logs; the payroll worked-day logic can be built on top of it.
                    motive_request('/v1/logs', {'per_page': 1, 'page_no': 1}, timeout=25)
                    hos_logs_ok = True
                except Exception as exc:
                    hos_logs_message = str(exc)
                if vehicles_ok:
                    try:
                        gps_result = test_historical_gps_access()
                        gps_access_ok = bool(gps_result.get('access_ok'))
                        gps_data_ok = bool(gps_result.get('data_ok'))
                        gps_message = str(gps_result.get('message') or '')
                    except Exception as exc:
                        gps_message = str(exc)
                status = 200 if vehicles_ok else 502
                return self.send_json({
                    'ok': vehicles_ok,
                    'configured': True,
                    'vehicles_ok': vehicles_ok,
                    'ifta_ok': ifta_ok,
                    'hos_logs_ok': hos_logs_ok,
                    'hos_logs_message': hos_logs_message,
                    'gps_access_ok': gps_access_ok,
                    'gps_data_ok': gps_data_ok,
                    'gps_result': gps_result,
                    'vehicle_count': vehicle_count,
                    'vehicles_message': vehicles_message,
                    'ifta_message': ifta_message,
                    'gps_message': gps_message,
                    'message': 'Motive connection is working.' if vehicles_ok else 'Could not access the Motive Vehicles API.'
                }, status)
            if parsed.path == '/api/motive/vehicles':
                vehicles = fetch_motive_vehicles()
                return self.send_json({'ok': True, 'vehicles': vehicles, 'count': len(vehicles)})
            if parsed.path == '/api/motive/odometer':
                qs = parse_qs(parsed.query)
                vehicle_id = str((qs.get('vehicle_id') or [''])[0]).strip()
                service_date = str((qs.get('date') or [''])[0]).strip()
                if not vehicle_id or not service_date:
                    return self.send_json({'ok': False, 'error': 'vehicle_id and date are required.'}, 400)
                service_day = parse_iso_day(service_date)
                result = fetch_historical_odometer(vehicle_id, service_day)
                return self.send_json({'ok': True, **result})
            if parsed.path == '/api/motive/hos/workdays':
                qs = parse_qs(parsed.query)
                start_day = parse_iso_day((qs.get('start_date') or [''])[0])
                end_day = parse_iso_day((qs.get('end_date') or [''])[0])
                if not start_day or not end_day:
                    return self.send_json({'ok': False, 'error': 'start_date and end_date are required.'}, 400)
                if (end_day - start_day).days != 6:
                    return self.send_json({'ok': False, 'error': 'NBL payroll worked-day lookup expects a 7-day Saturday-Friday pay week.'}, 400)
                result = fetch_hos_workdays(start_day, end_day)
                return self.send_json({'ok': True, **result})
            if parsed.path == '/api/motive/history-test':
                q = parse_qs(parsed.query)
                tractor_number = str((q.get('tractor_number') or [''])[0]).strip()
                start_raw = str((q.get('start_date') or [''])[0]).strip()
                end_raw = str((q.get('end_date') or [''])[0]).strip()
                if not tractor_number or not start_raw or not end_raw:
                    raise RuntimeError('Tractor number, start date and end date are required.')
                try:
                    start_day = date.fromisoformat(start_raw)
                    end_day = date.fromisoformat(end_raw)
                except ValueError:
                    raise RuntimeError('Use YYYY-MM-DD for the history test dates.')
                if start_day > end_day:
                    raise RuntimeError('History test start date must be on or before end date.')
                if (end_day - start_day).days > 92:
                    raise RuntimeError('Motive history requests cannot exceed three months.')
                result = build_vehicle_history_diagnostic(tractor_number, start_day, end_day)
                return self.send_json(result)

            if parsed.path == '/api/motive/ifta/trips':
                qs = parse_qs(parsed.query)
                start_day = parse_iso_day((qs.get('start_date') or [''])[0])
                end_day = parse_iso_day((qs.get('end_date') or [''])[0])
                vehicle_ids = []
                for raw in (qs.get('vehicle_id') or []) + (qs.get('vehicle_ids[]') or []):
                    for value in str(raw).split(','):
                        value = value.strip()
                        if value.isdigit(): vehicle_ids.append(int(value))
                trips = fetch_ifta_trips(start_day, end_day, vehicle_ids or None)
                return self.send_json({
                    'ok': True, 'start_date': start_day.isoformat(), 'end_date': end_day.isoformat(),
                    'trips': trips, 'count': len(trips)
                })
            return self.send_json({'error': 'Unknown Motive endpoint.'}, 404)
        except Exception as exc:
            return self.send_json({'ok': False, 'error': str(exc)}, 502)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/') and not require_nbl_api_access(self, parsed.path, 'POST'):
            return
        if parsed.path == '/api/hr/road-test':
            try:
                data = self.read_json()
                pdf_bytes = build_hr_road_test_pdf(data)
                candidate = data.get('candidate') if isinstance(data, dict) and isinstance(data.get('candidate'), dict) else {}
                road = data.get('road_test') if isinstance(data, dict) and isinstance(data.get('road_test'), dict) else {}
                name = re.sub(r'[^A-Za-z0-9._-]+', '_', str(candidate.get('name') or 'Candidate')).strip('_') or 'Candidate'
                form_date = str(road.get('date') or date.today().isoformat())
                return self.send_bytes(pdf_bytes, 'application/pdf', 200, f'NBL_Road_Test_{name}_{form_date}.pdf')
            except Exception as exc:
                return self.send_json({'ok': False, 'error': str(exc)}, 422)
        if parsed.path == '/api/hr/parse-application':
            try:
                data = self.read_json()
                file_name = str(data.get('file_name', '') or '').strip()
                encoded = str(data.get('pdf_base64', '') or '')
                if not encoded:
                    return self.send_json({'ok': False, 'error': 'No PDF file was supplied.'}, 400)
                try:
                    pdf_bytes = base64.b64decode(encoded, validate=True)
                except Exception:
                    return self.send_json({'ok': False, 'error': 'The uploaded PDF data is invalid.'}, 400)
                if len(pdf_bytes) > 15 * 1024 * 1024:
                    return self.send_json({'ok': False, 'error': 'Application PDF must be 15 MB or smaller.'}, 413)
                if not pdf_bytes.startswith(b'%PDF'):
                    return self.send_json({'ok': False, 'error': 'The selected file is not a valid PDF.'}, 400)
                result = parse_hr_application_pdf(pdf_bytes)
                return self.send_json({'ok': True, 'file_name': file_name, **result})
            except Exception as exc:
                return self.send_json({'ok': False, 'error': str(exc)}, 422)
        if parsed.path == '/api/motive/ifta/routes':
            try:
                data = self.read_json()
                trips = data.get('trips') if isinstance(data, dict) else []
                locations = data.get('locations') if isinstance(data, dict) else []
                routed, stats = reconstruct_ifta_routes(trips, locations)
                return self.send_json({'ok': True, 'trips': routed, 'stats': stats})
            except Exception as exc:
                return self.send_json({'ok': False, 'error': str(exc)}, 502)
        if parsed.path == '/api/motive/config':
            data = self.read_json()
            key = str(data.get('api_key', '')).strip()
            if len(key) < 12:
                return self.send_json({'ok': False, 'error': 'Enter a valid Motive API key.'}, 400)
            save_motive_key(key)
            return self.send_json({'ok': True, 'configured': True, 'key_hint': '••••' + key[-4:]})
        if parsed.path == '/api/motive/disconnect':
            delete_motive_key()
            return self.send_json({'ok': True, 'configured': False})
        return self.send_json({'error': 'Unknown endpoint.'}, 404)


def main():
    # Bind to an available local port by default. This prevents an older NBL build
    # that is still running from hijacking a newer build's browser window.
    server = ThreadingHTTPServer((HOST, REQUESTED_PORT), NBLHandler)
    actual_port = int(server.server_address[1])
    url = f'http://localhost:{actual_port}/index.html?v=77'
    if PORT_FILE:
        try:
            Path(PORT_FILE).write_text(url, encoding='utf-8')
        except Exception:
            pass
    print('NBL Business Analyzer v77 is running.')
    print(f'Open: {url}')
    print('Motive API credentials use MOTIVE_API_KEY when provided; local builds fall back to the protected local key file.')
    print('Keep this process running while using the app.')
    if os.environ.get('NBL_NO_BROWSER') != '1' and not os.environ.get('PORT'):
        threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        if PORT_FILE:
            try:
                Path(PORT_FILE).unlink()
            except Exception:
                pass


if __name__ == '__main__':
    main()
