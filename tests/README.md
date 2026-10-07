Recruitment Test verification (v132)

- `node tests/recruitment-test.cjs`: stage prerequisites, early Ops, three Ops agreement fields and legacy conversion,
  Hold, final clearance, test-only REST writes, conflicts, save failure, SSN stripping.
- `node tests/recruitment-test-dom.cjs` with jsdom available: full app navigation,
  copied field mapping, save/reopen, staged advancement through hire, Hold/rejection,
  PDF import mismatch handling, document removal/upload isolation, failed upload
  metadata recovery, road-test time save/reload and signature export payload, four-section Ops Manager summary, source-question coverage and exclusions, and account reset.
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
