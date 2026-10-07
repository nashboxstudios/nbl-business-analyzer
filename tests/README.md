Recruitment Test verification (v138)

- `node tests/recruitment-table.cjs` with jsdom: all seven ascending/descending sorts,
  blank values last, numeric day counts, calendar-day/DST checks, screening-date-only
  calculation, sort retained through filters/refresh, reset, and summary branding.
- `node tests/recruitment-test.cjs`: stage prerequisites, early Ops, three Ops agreement fields and legacy conversion,
  Hold, final clearance, test-only REST writes, conflicts, save failure, SSN stripping.
- `node tests/recruitment-test-dom.cjs` with jsdom available: full app navigation,
  copied field mapping, save/reopen, staged advancement through hire, Hold/rejection,
  PDF import mismatch handling, document removal/upload isolation, failed upload
  metadata recovery, road-test time save/reload and signature export payload, three-section Ops Manager summary, source-question coverage and exclusions, and account reset.
- `python3 tests/road-test-pdf.py`: PDF time values and appearances, all seven signature stamps,
  template content preservation, malformed/incomplete time rejection, and legacy exports without times.
- `node tests/recruitment-test-browser.cjs` with Playwright and Chromium available:
  browser interaction and desktop/mobile layout checks against a local server.
  `NBL_TEST_BROWSER` selects an alternate Chromium executable; `NBL_TEST_URL`
  overrides the default http://127.0.0.1:8130/index.html.

The engine and full app DOM suites passed for this release. A real browser launch
was blocked by the execution environment's socket restrictions; the browser and
visual layout suite remains available to run in an unrestricted environment.
Production Recruitment save, PDF import, hiring-summary and current-address
regression checks also passed.

Cloud verification used authenticated owner / outsider claims and rolled back
fixture writes. Cross-organization writes and outsider reads were blocked.
The table has RLS enabled and no authenticated DELETE privilege. The 22 original
candidate records matched their pre-migration fingerprint after the test copy.
Fixtures contain synthetic names; no candidate exports are checked into this repo.

V133 hiring-summary print layout was rendered with WeasyPrint and visually checked
using synthetic data. Browser-native print/layout verification remains subject to
the Chromium environment limitation described above.

V134 DOM verification covers prominent/automatic First Advantage import, parser
failure recovery, detected fields, saved Ops date and its stage prerequisite, and
Phone PDF selection. Letter and phone print layouts were rendered with synthetic
data using WeasyPrint; phone page dimensions and full content were checked.
The browser suite includes 320/390/430 px layout checks and phone PDF rendering.
Native Chromium verification was unavailable here because its download returned
a truncated archive. Physical iOS/Android print behavior was not tested.

V135 verifies summary exclusions in both letter and phone formats, while profile
fields and screening instructions remain available. Both print layouts were
rendered and visually reviewed with synthetic candidate data.

V136 verifies four ordered status groups, no stage tiles, Name/Location tie ordering,
column sorting within groups, filtering, and profiles collapsed on open/reopen/new.
Expanded sections are retained when saving or importing. Engine, table, and full
app DOM checks passed. Native browser verification remains unavailable as above.

V137 checks Recruitment under People, Recruitment Archive in the last sidebar
group, module/page/profile/report labels, and save/reopen through the active
workflow while preserving the original candidate module. The existing data
stores and cloud APIs are retained; this release does not migrate candidates.

V138 verifies duplicate name/order/case and identity normalization, blank/self/
deleted exclusions, CDL state distinction, live flags, canceled duplicate save/
upload, delete cancellation/failure/success, recovery data and files retained,
refresh exclusion, and stale writes blocked. Engine, table, and full app DOM
suites passed. A rolled-back authenticated cloud fixture verified scoped
updates, retained recovery data, stale update rejection, and outsider isolation;
no real candidate was deleted. No schema or permission changes are required.
