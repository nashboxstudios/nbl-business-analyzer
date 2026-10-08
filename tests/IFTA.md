Quarterly IFTA module

IFTA appears under Compliance and uses the existing Owner/Finance unlock. The
server's `/api/ifta/mileage` and `/api/ifta/export` routes require Owner access.
`SUPABASE_IFTA_REPORTS.sql` must be applied before deploying the feature: it
extends the snapshot key constraint for `ifta:YYYY-Qn` and adds a restrictive
owner-only policy without changing access to other modules. Apply the migration
and app deployment together. No existing business record is migrated or deleted.

Mileage is fetched from Motive's IFTA trips endpoint in 28-day windows, with
Diesel fuel type and the existing explicit `X-Metric-Units:false` header. All
returned vehicles are included, regardless of their current active status;
historical filing data must include vehicles that operated in the quarter.
Fuel uses a paginated read of settlement records only. Purchase dates determine
the quarter; later settlement/pay dates do not exclude in-quarter purchases.
Duplicate trip IDs and tractor/ticket fuel records are removed; conflicting
duplicates and invalid records block export. Mileage-only and fuel-only states
are both retained. Values are summed before rounding to two decimals.

Taxable miles initially equal total miles and can be edited per jurisdiction.
Individual fuel transactions can be excluded. Mileage coverage and qualifying
tax-paid fuel require explicit review before export, because the settlement
records do not separately attest tax-paid status. Missing fuel weeks are a review
warning, not proof of missing activity. This module prepares the supplied import
worksheet; it does not calculate a final tax bill or file a return. The worksheet
has only the five requested columns, numeric values, and jurisdiction rows (no
extra totals row or supporting tabs). The supplied hidden dictionaries and
protection remain unchanged. The bundled blank asset strips supplied business
figures, author metadata, and the workbook's local path.

Saved quarters include source metadata, fuel transactions/exclusions, review
notes, and confirmation state. Reads/writes are scoped to organization/quarter;
updates use the original `updated_at` as an optimistic concurrency guard. Saved
quarters are excluded from eager whole-workspace snapshot loading. Use Reload
Saved Quarter to recover from a conflict. Regeneration resets review confirmations.

Validation:

- `node tests/ifta.cjs`: quarter boundaries, strict date parsing, purchase-date
  selection, late-posted statements, duplicate/conflicting rows, mileage-only and
  fuel-only jurisdictions, rounding, review gating, and fuel exclusions.
- `node tests/ifta-cloud.cjs`: settlement pagination, organization and quarter
  scoping, optimistic update conflict, and snapshot loading exclusion.
- `node tests/ifta-dom.cjs` (jsdom): full app navigation, Finance lock, non-owner
  hiding, calculate/edit/save/reopen/export, failed operation draft preservation,
  and stale-write rejection.
- `python tests/ifta-export.py`: numeric Excel cells, exact template structure,
  hidden sheets/protection retained, stripped business figures, invalid export
  rejection, server roles, Diesel filter and pagination failure.
- `tests/ifta-rls.sql`: owner read/write, non-owner and outsider denial, synthetic
  fixture writes rolled back. The migration plus fixtures were also tested within
  one rolled-back transaction against the connected database.
- Existing dispatch scheduling, inactive-driver, full Recruitment DOM, and
  Recruitment privacy tests passed after integration.
- A read-only calculation matched the existing settlement query's transaction
  count and every purchase-state total. No production inputs are committed.
- Native Chromium layout verification was unavailable because the browser
  download returned a truncated archive. No live Motive quarter request was
  executed from this environment; production mileage integration is not yet
  verified with a signed-in Owner session.

Primary references:

https://developer.gomotive.com/reference/fetch-a-list-of-companys-ifta-trip-reports
https://supabase.com/docs/guides/database/postgres/row-level-security
