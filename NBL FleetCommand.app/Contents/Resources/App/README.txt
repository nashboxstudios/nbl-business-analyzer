NBL FleetCommand — Version 144

Version 144 - Read-only Motive IVMR Location Inspection
- Adds Inspect Motive Locations under Motive to read active geofence names,
  addresses and GPS boundary availability across all documented categories.
- Reads Motive using the existing server-side API key; no key reaches the browser.
- Available to Owner and Operations. Other account roles cannot call the endpoint.
- Does not modify Motive, the IVMR master, saved reports or email schedules.
- Pagination, duplicates, partial category failures and malformed responses are handled explicitly.
- This diagnostic does not imply that spot numbers or facility coordinates are verified.

Validation: python3 tests/motive-geofences.py; node --check app.js;
Python compilation and git diff --check.

NBL FleetCommand — Version 141

Version 141 - IVMR Workspace Cleanup
- Location Master and Motive Tractor History Test start collapsed.
- Manage IVMR Locations expands the location master before scrolling to it.
- Reporting and diagnostic dates default to the latest completed Saturday–Friday week.
- Date selections remain editable for historical and partial-period reports.
- Automatic email delivery is not configured in this release.

NBL FleetCommand — Version 140

Version 140 - Recruitment Sensitive Information Protection
- PDF extraction returns SSN last-four only; full SSNs never leave the parser.
- Candidate JSON writes strip full SSN fields recursively at the database boundary.
- Owner and Operations retain full hiring access. Lead Drivers receive a read-only
  database projection of operational fields, without DOB, CDL numbers, contact/address,
  screening/background answers, pay, notes, history or sensitive document references.
- Raw Recruitment, Archive, older HR tables and HR snapshots reject Lead Driver access.
- Hiring PDF tools require Owner or Operations access on the server.
- All existing uploads remain Sensitive; no files or candidates were moved or removed.
- New uploads default to Sensitive. General documents use a separate private bucket,
  require a content-review acknowledgment, and may be viewed by Lead Drivers.
- General classification is a staff review, not automatic PDF content redaction.
- Both document stores are private. View links expire after two minutes.
- Removes hardcoded driver names, FedEx IDs, routes and assignments from public
  defaults. Saved dispatch workspace data is loaded after authentication.
- Apply SUPABASE_v140_RECRUITMENT_PRIVACY.sql before using this release. The live
  Nashbox project migration was applied and verified with rolled-back synthetic fixtures.
- This release does not configure MFA, password protection, retention or backups.

Validation:
node tests/recruitment-test.cjs
node tests/recruitment-table.cjs
node tests/recruitment-test-dom.cjs
node tests/recruitment-privacy.cjs
python3 tests/recruitment-privacy.py
python3 tests/road-test-pdf.py
tests/recruitment-privacy-rls.sql (transaction rollback; requires Owner/Ops/Lead fixture roles)

NBL FleetCommand — Version 139

Version 139 - Motive Driver Eligibility and Scheduled Dispatch
- Motive account status is authoritative for new driver assignments.
- Reads active and deactivated driver accounts from the Motive Users directory.
- Inactive, pending, ambiguous and unmatched accounts cannot be offered for new
  work after the directory loads. Failed refreshes retain the last known statuses.
- Automatically refreshes driver status at startup and verifies it before new
  assignments, manual additions, saved-plan loading, optimize/reset and route saves.
- Stale Recruitment Hired records and settlements cannot reactivate an inactive driver.
- Inactive drivers are removed from live weekly coverage and primary defaults.
- Saved plan loading filters inactive assignments; stored snapshots are retained.
- Weekly and daily selections, primary-driver choices, current Safety lists and
  safety assignment choices use consistent driver eligibility.
- New payroll-profile selections exclude inactive drivers; historical payroll,
  settlements, saved daily boards, safety records and Recruitment are retained.
- Existing historical accepted daily rows retain their recorded driver. New or
  changed accepted assignments require an active verified driver.
- Includes the previously prepared dedicated-run schedule fix: defaults apply
  only to the selected operating day, with off-days marked Not Scheduled.
- All Version 138 Recruitment changes are preserved. No SQL migration is needed.

Validation:
node tests/inactive-drivers.cjs
node tests/daily-dispatch-schedule.cjs
python3 tests/motive-driver-directory.py

NBL FleetCommand — Version 138

Version 138 - Candidate Deletion and Duplicate Review
- Saved Recruitment profiles include Delete Candidate with an explicit confirmation.
- Deletion hides that profile from Recruitment and keeps a recovery record and document objects. Original Recruitment Archive records are preserved.
- Possible duplicates are flagged in the table and profile by normalized full name, email, phone, FedEx ID, or CDL/state. Warnings include creation date and screening interview date.
- New or changed identities matching an existing profile require confirmation before saving or uploading. Existing matches remain visibly flagged.
- Fresh cloud checks and version-checked writes protect against deleting changed records or restoring deleted profiles with stale saves.

Version 137 - Recruitment Promotion and Archive
- Recruitment under People now opens the newer interview and hiring workflow, previously Recruitment - Test.
- The original module is available as Recruitment Archive under Archive at the bottom of navigation.
- Active buttons, profile headings, messages, and hiring summaries use Recruitment.
- Both existing data stores, candidate IDs, document references, access permissions, and save behavior are retained.

Version 136 - Grouped Recruitment Test Table
- Removes the stage-count tiles above the table.
- Groups candidates in order: In Progress, Hired, Rejected, Terminated.
- All seven columns remain sortable within each group; default order is Name, then Location.
- Candidate profiles start with every section collapsed. Expanded sections stay open during save, import, or upload.

Version 135 - Shorter Hiring Summary
- Standard and Phone PDF summaries omit email, current address, the Driver Qualifications section, background dates, and the application-process instruction paragraph.
- Candidate Details, background statuses, and Screening Interview remain in the summary. Candidate profile data and interview instructions are retained.

Version 134 - First Advantage Import and Mobile Summary
- First Advantage PDF import is at the top of Candidate Details and starts when a file is selected. Review detected values and Save Draft.
- Ops Interview includes a saved interview date, required before advancing to Road Test.
- Hiring Summary offers Phone PDF: narrow 108 x 192 mm pages, a single column, larger type, and brand colors. Standard letter output remains available.
- Phone controls use larger touch targets, 16 px inputs, and a horizontally scrolling table.

Version 133 - Recruitment Table and Hiring Summary
- Sort all seven Recruitment Test columns in either direction by clicking their headers.
- Days in Process counts calendar days from Screening Interview date; missing dates display a dash.
- Table and Ops Manager hiring-summary export use the Nashbox purple/orange palette and existing Recruitment styling.
- Summary includes the Nashbox Logistics logo and preserves print colors.

Version 132 - Road Test and Candidate Profile
- Recruitment Test road test now records Time From / Time To and fills the PDF test-time fields.
- Road test exports apply candidate and administrator signatures to all seven required lines, matching original Recruitment.
- Position & Offer no longer shows Hiring Manager Notes. Onboarding Tasks appears before Training.
- Existing notes and other candidate data are retained.

Version 131 - Ops Manager Interview Review
- Driver Qualifications no longer contains doubles fields; doubles information is
  captured with the Screening Interview questions.
- Screening includes all questions and application-process instructions in the
  supplied Screening Interview tab, including doubles endorsement / training,
  actual shifts discussed, and the candidate's acceptance of shift assignment.
- Ops Interview has exactly three text fields: Work Days Agreed Upon; Dispatch
  Schedule Times Explained And Agreed Upon; Doubles Requirement Explained And Agreed Upon.
- Hiring Summary is immediately above Ops Interview. Print / Save PDF produces a
  formatted Ops Manager summary of Candidate Details, Driver Qualifications,
  Background & Drug Screen, and Screening Interview, with clear unanswered fields.
- FADV is included in the summary as part of the requested Background & Drug Screen
  section. Medical-card expiry, road-test status, proposed start date and equipment
  familiarity remain excluded from the summary.
- Existing saved data and prior Ops fields are retained. Confirmed prior schedule /
  doubles acknowledgments prefill the new text fields. Unconfirmed agreements need
  review and entry before moving stages. Existing candidates are not recopied.
- One Onboarding Tasks section remains immediately before Document Upload.

Version 130 - Recruitment Test
- People > Recruitment – Test contains separate copies of the current cloud candidates.
- Review the suggested starting stage for each copied candidate.
- Save Draft keeps incomplete interview work. Move to Next Stage checks prerequisites.
- Screening and Ops forms follow the two interview spreadsheet tabs.
- Background / drug-screen status continues independently; managers may authorize early Ops.
- Agreed schedule or doubles requirement changes require fresh candidate acknowledgment.
- On Hold requires a reason. Do Not Proceed marks the test candidate Rejected.
- Offer / onboarding and training completion lead to the Hired group.
- Hiring Summary supports Print / Save PDF and excludes FADV, road-test status,
  medical-card expiry, proposed start date, equipment familiarity and sensitive identity fields.
- Document upload is last, after one Onboarding Tasks section. Removing a copied
  document reference does not delete the original document.
- Cloud saves update only one test record and reject stale concurrent changes.
- Existing Recruitment candidates, dispatch roster and employee records are not modified.
- Test records are a one-time snapshot, not an automatic mirror of future candidates.
- No applications, offers or onboarding messages are sent by this module.

Cloud setup: SUPABASE_v130_RECRUITMENT_TEST.sql creates isolated storage and copies
candidates once per organization. It has already been applied to the current NBL workspace.
Rerunning the script preserves existing test edits. Owners and Operations can access it;
existing Finance restrictions continue to apply.

Validation: node tests/recruitment-test.cjs
UI interaction suite: node tests/recruitment-test-dom.cjs (requires jsdom)
Browser suite: node tests/recruitment-test-browser.cjs (requires Playwright and Chromium);
set NBL_TEST_URL and optionally NBL_TEST_BROWSER for your test server / browser.

Version 129 - Current Application Address

- Latest Address uses only the address-history entry explicitly marked Current Through Today, regardless of its position in the PDF.
- Handles extracted PDF text with concatenated labels, such as GALLATINTo:Current Through Today.
- Keeps apartment/unit details and does not select addresses from employment history.
- When the current marker is missing, conflicting, or incomplete, no address is imported; an existing Latest Address is left unchanged.
- Tested using the supplied First Advantage application and shuffled address histories; other imported fields remain unchanged.
- Preserves all v128 candidate save and explicit deletion protection, v127 import confirmation, and hiring report/profile changes.
- Deploy this package and refresh open FleetCommand tabs. No additional SQL migration is required for v129.

NBL FleetCommand — Version 128

Version 128 - Recruitment Candidate Save Protection

- Saves only the edited candidate, leaving other candidates in the cloud untouched.
- Column layout changes save settings only. Explicit migration/import remains additive and does not delete absent records.
- Deletes a candidate only through the confirmed Delete action and verifies the database returned that one deleted record.
- Adds a restrictive database DELETE policy that blocks older tabs from deleting candidates absent from their loaded list. Existing organization and role access remains in force.
- Reports cloud-save failures rather than treating a successful local-folder write as cloud success. PDF-import and Road Test saves now check the save result.
- Retains v127 PDF-import fix, v126 collapsible sections, and hiring report changes.
- The v128 database policy has been applied to the current Nashbox Logistics cloud project. SUPABASE_v128_RECRUITMENT_SAVE_PROTECTION.sql is included for other installations.
- Deploy this package and refresh all open FleetCommand tabs to use the new candidate-level save behavior.
- This update does not recover records that are already missing. No candidate data is bundled in the release.

NBL FleetCommand — Version 127

Version 127 - First Advantage PDF Import Fix

- Fixes "resolver is not defined" when an application PDF name differs from the existing candidate name.
- Restores the Accept Upload / Reject Upload confirmation. Accept continues the supported-field update and save; Reject or closing the prompt leaves the candidate unchanged.
- Preserves all Version 126 hiring summary and collapsible profile changes.
- Displays Version 127 below the logo and refreshes versioned app assets.
- No SQL migration or new dependency is required.
- Deploy this package to update the live app.

NBL FleetCommand — Version 126

Version 126 - Candidate Profile Sections and Hiring Report

- Adds Employment Type (Full Time / Part Time) from the saved Type field to Position & Offer in the preview and PDF.
- Colors Doubles: No red, Yes No Experience yellow, Yes With Experience green, with readable status backgrounds.
- Removes Equipment Familiarization from the hiring report; retains the profile field.
- Makes Application Import, Candidate Details, Driver Profile Details, Hiring Status, Hiring Summary, Onboarding Tasks and Driver Documents collapsible, with larger section titles.
- Opens Candidate Details initially; other sections can be opened independently.
- Expands a section automatically when a required field needs attention or the Recruitment Hiring Summary table action is used.
- Removes the Open Hiring Summary shortcut at the top of the profile.
- Keeps Onboarding Tasks immediately before Driver Documents and preserves existing candidate data.
- Version 126 is displayed below the logo. No SQL migration or new dependency is required.
- Deploy this package to update the live app.

NBL FleetCommand — Version 125

Version 125 - Recruitment Hiring Summary Refinements

- Removes FADV status, Road Test Status, Medical Card Expiry and Proposed Start Date from the hiring report and its preview. The candidate data is retained.
- Uses one Doubles dropdown: Yes With Experience, Yes No Experience, No.
- Removes the separate doubles-experience editor and includes one Doubles row in the report.
- Retains previous doubles-experience notes in saved data. Legacy Yes records without experience information require a choice before saving or exporting.
- Keeps one Onboarding Tasks section immediately before Driver Documents.
- Retains separate Hiring Status and Hiring Summary sections before Onboarding Tasks.
- Displays Version 125 below the logo and refreshes versioned app assets.
- No SQL migration or new dependency is required.
- This package must be deployed to update the live app.

NBL FleetCommand — Version 124

Version 124 - Hiring Summary Access and Version Label

- Corrects the version label below the logo to Version 124.
- Adds Open Hiring Summary at the top of every candidate profile.
- Retains the Hiring Summary shortcut in the Recruitment Actions column.
- Prevents the app document from being cached across deployments.
- Preserves all candidate fields and the v123 hiring report. No SQL migration is required.

NBL FleetCommand — Version 123

Version 123 - Candidate Hiring Summary

- Adds Hiring Summary inside each Recruitment candidate profile and a table shortcut.
- Pulls name, terminal, shift, start date, hiring statuses and CDL details from existing fields.
- Saves proposed pay, pay basis, schedule, medical card expiry, experience and dedicated hiring notes with the candidate.
- Uses a dated medical-card document when no manual expiry is supplied. Conflicting document dates require manual entry.
- Provides Preview and Download PDF, with readable sections and automatic continuation pages.
- Includes no source labels, SSN, DOB, CDL number, home address or identity-document attachments in the report.
- Manual entries remain separate from general Recruitment Notes.
- No new SQL migration or dependency is required. Uses existing Recruitment JSON storage and PDF export.
- Local save/reload, report contents and rendered PDF pagination were checked with sample records.
- Live cloud and interactive browser checks remain to be performed after deployment.
- Update the deployed app files to use v123. This ZIP does not change your running Railway deployment.

NBL FleetCommand — Version 122

Version 122 - Safety Dashboard

- Fixes the Adjusted Score Trend scale at 75–100, retaining the actual scores.
- Marks scores below 75 at the lower edge with their actual value in the tooltip.
- Replaces Incident Trend with Top 3 Incidents for the selected driver and reporting period, ranked by frequency.
- Combines equivalent incident names and excludes dismissed events.
- Defaults the Safety date range to today and the previous six days, using local calendar dates.
- Keeps manually loaded date ranges and the existing score history and PDF exports.
- No new database migration is required for this update.

NBL FleetCommand — Version 121

Version 121 - Recruitment Status Section Headers

- Moves the Recruitment column headings inside each candidate-status section.
- Displays each section as Status, column headings, then candidates.
- Repeats the same sortable and resizable headings for In Progress, Hired, Rejected, and Terminated sections that contain candidates.
- Keeps only the Name column frozen during horizontal scrolling.

NBL FleetCommand — Version 120

Version 120 - Recruitment Table Scrolling Fix

- Keeps only the Name column frozen in the Recruitment table.
- Removes obsolete position-based freezing that affected Location, Notes, and the former column slots.
- Eliminates the apparent blank column and prevents scrolling columns from passing through frozen cells.
- Retains the Recruitment table cleanup introduced in Version 119.

NBL FleetCommand — Version 119

Version 119 - Recruitment Table Cleanup

- Removes Email, Phone, FedEx ID, Shift, Type, Date Added, Screening Interview, and Ops Interview from the Recruitment summary table.
- Keeps every removed field stored and editable inside the individual candidate profile.
- Migrates previously saved Recruitment table layouts so the removed columns do not reappear.

NBL FleetCommand — Version 118

Version 118 - Reliable Incremental Settlement Uploads

- Saves only newly uploaded or replaced settlement statements during normal uploads.
- Preserves all existing settlement history without rewriting it after every upload.
- Breaks explicit full-history synchronization into small, bounded cloud requests.
- Waits for Finance storage to finish loading before allowing a settlement upload.
- Shows the actual NBL Cloud error when a save fails instead of replacing it with a generic message.
- Keeps Settlement settings and Dashboard mileage synchronized after a successful upload.

NBL FleetCommand — Version 117

Version 117 - Settlement Summary Display Fix

- Restores the Settlement Summary redraw after its cloud records load.
- Restores the Driver Pay redraw under the same on-demand finance loading path.
- Retains the faster startup and on-demand Motive fault loading introduced in Version 116.

Version 116 - On-Demand Fault Loading

- Fault records are excluded from normal application startup.
- Users select one tractor and click Load Faults.
- The default reporting period is the most recent seven days.
- Faults are requested from Motive only for the selected tractor and period.
- Other detailed cloud modules load when their screens are opened.

Version 115 - Faster Cloud Loading and Fault Filters

- Loads independent Supabase modules in parallel after the dashboard appears.
- Keeps the Motive refresh non-blocking.
- Adds an All Tractors / individual tractor filter to Motive Fault Codes.
- Preserves Motive's reported severity and uses that same severity to determine FleetCommand guidance and task priority.

Version 114 - Sign-In Startup Hotfix

- Releases the sign-in screen immediately after Supabase authentication and membership verification.
- Loads FleetCommand module data and Motive information in the background.
- Adds a 25-second cloud request timeout so one stalled request cannot freeze the entire application.
- Keeps the dashboard usable and displays a retry message if an individual cloud module is temporarily unavailable.

Version 113 - Maintenance Intelligence

- Adds a separate Maintenance module with Fleet Maintenance, Trip Inspections, Motive Fault Codes, and Maintenance Tasks.
- Retains existing trip-inspection records and moves their interface out of Meetings.
- Turns inspection defects and Motive diagnostic faults into linked, assigned, trackable maintenance tasks.
- Run SUPABASE_v113_MAINTENANCE_INTELLIGENCE.sql once before saving fault codes or tasks to NBL Cloud.

Version 110 - Recruitment Profile and Secure Documents

- Adds Latest Address to the candidate profile.
- Reorganizes the form into profile, hiring status, and driver-document sections.
- Adds E-Verify, SSN Verified, and Medical Card expiration fields.
- Adds private CDL and Medical Card uploads with PDF/JPG/PNG validation and a 10 MB limit.
- Uses temporary secure links to view documents and deletes replaced or removed files.
- Social Security card images are intentionally not stored; FleetCommand retains verification status and the masked last four digits only.
- Run SUPABASE_v110_RECRUITMENT_DOCUMENTS.sql once before deploying v110.

Version 109 - Structured Core Module Storage

- Adds record-level Supabase storage for Fleet Maintenance, Recruitment, Driver Pay, Settlements, Audit, and Meetings.
- Stores tractors and service records, candidates, payroll profiles and periods, settlement statements, audits and findings, inspections, and management items as separate records.
- Finance data is database-restricted to Owner accounts. Operations Manager and Lead Driver access remains limited to their authorized operational modules.
- Full Social Security numbers remain excluded from cloud storage; only the existing masked last-four value is retained.
- Preserves V108 structured Safety and Daily Dispatch storage.
- If not already completed, run SUPABASE_v108_SAFETY_DAILY_DISPATCH.sql once.
- Run SUPABASE_v109_CORE_MODULE_STORAGE.sql once in the Supabase SQL Editor before deploying v109.
- The V109 tables use the `nbl_fc_` prefix so they do not conflict with pre-existing FleetCommand tables.
- V109 automatically migrates existing cloud snapshots for Fleet Maintenance, Recruitment, Driver Pay, Settlements, Audit, and Meetings into record-level storage.

Version 107 - Persistent Safety Assignments

- Fixes unassigned-event driver assignments being lost after logout, login, or deployment of a new version.
- Persists Safety assignments, FleetCommand dismissals, and driver records inside the established Audit cloud snapshot, avoiding the database module-key constraint that rejected the newer Safety snapshot key.
- Restores saved Safety data automatically at login and remains compatible with any earlier standalone Safety snapshot.
- Assignment and dismissal actions now show an error if cloud persistence fails instead of appearing successfully saved.

Version 106 - Supabase-Compatible User Roles

- Fixes the organization_members_role_check error when creating a Lead Driver.
- Stores both assignable profiles under the database's permitted Operations role while retaining Operations Manager or Lead Driver as the FleetCommand access position.
- The visible role, navigation permissions, and server access remain distinct and enforced without a database migration.

Version 105 - Role-Based Module Access

- Owner has access to all FleetCommand modules and User Access controls.
- Operations Manager and Lead Driver can access Dashboard, Safety, all Operations tools, and Recruitment only.
- Finance, Compliance, Users, finance security, and full SSN reveal remain owner-only.
- Role restrictions are enforced in both the navigation and authenticated server endpoints.

Version 104 - Consolidated Safety Events

- Dismissed events are excluded completely from driver PDFs.
- Removed FedEx disqualification from the corrective-action language.
- Removed Active labels from PDF event sections.
- Events are ordered by severity: Critical, High, Medium, Low, then unclassified.
- Similar events are consolidated into one section with the total count and each occurrence listed below.
- Equivalent event names such as Hard Brake and Hard Braking are combined into the same behavior group.

NBL FleetCommand — Version 99

Version 99 - Motive Speeding Endpoint Correction

- Corrected the Motive Speeding Events test to use the documented `/v1/speeding_events` endpoint.
- Retained the 30-day speeding-event access test and the existing Driver Performance Events diagnostic.
- No Railway variables or Motive API-key changes are required before rerunning the connection test.

NBL FleetCommand — Version 98

Version 98 - Motive Safety Access Diagnostic

- Added a live Safety API diagnostic to the existing Motive Connection test.
- Tests Driver Performance Events and Speeding Events for the last 30 days using the Motive key already stored on the server.
- Reports API availability, event counts, performance-event types, and camera-media availability without exposing the API key, event media, or location data to the browser.
- Distinguishes an accessible endpoint with no recent records from an unavailable endpoint or missing permission.

NBL FleetCommand — Version 97

Version 97 - Sidebar Ribbon Redesign

- Enlarged and strengthened the Operations, People, Finance, and Compliance module titles so they are visually distinct from their submodules.
- Placed Daily Dispatch Board, Weekly Dispatch Planner, Meetings, Fleet Maintenance, Audit, and Motive directly under Operations in the requested order.
- Placed Driver Pay, Settlements, Financial Analysis, Settlement Reports, and Revenue Finder directly under Finance in the requested order.
- Removed the extra Dispatch and Reports submenu levels for a cleaner ribbon.
- Corrected the displayed owner name capitalization to Mayur.

NBL FleetCommand — Version 96

Version 96 - Daily Dispatch Outcomes and Driver Refusals

- Added a compact Record Refusal action to each Daily Dispatch route so one or more drivers who refused can be recorded independently of the final route outcome.
- Added conditional decline reasons: Driver Unavailable, Truck Unavailable, and Other.
- Captures the unavailable driver's name, unavailable tractor number, or a brief explanation only when the selected decline reason requires it.
- Validates decline details and accepted-route assignments before saving the board.
- Saves driver and tractor snapshots with the board so historical records remain understandable if the active roster later changes.
- Keeps the phone layout compact by hiding outcome details until they are needed.

NBL FleetCommand — Version 95

Version 95 - Station-Specific Weekly Driver Pool
-------------------------------------------------
- Weekly Dispatch Planner now shows only active drivers assigned to the selected dispatch station.
- Nashville, Spartanburg, and Marietta driver pools remain separate when switching locations.
- The shared roster synchronization from Motive, Recruitment, and settlements remains in place.
- Daily Dispatch continues to use the complete active driver roster, while historical assignments remain unchanged.


NBL FleetCommand — Version 94

Version 94 - Shared Active Driver Roster
-----------------------------------------
- Makes active drivers available automatically in Weekly and Daily Dispatch without a separate Driver Master screen.
- Matches Recruitment FedEx ID to Motive Employee ID as the primary identity rule.
- Uses first and last name as a fallback while ignoring middle names, initials, punctuation, and suffixes.
- Adds active Motive drivers, hired Recruitment drivers, and settlement drivers to the shared Dispatch roster.
- Treats Motive as the authority for active status; deactivated Motive drivers are removed from all new-assignment selectors.
- Preserves inactive drivers on historical dispatch boards and existing assignments.
- Refreshing Motive now loads both vehicles and drivers and saves the reconciled roster to Dispatch.


NBL FleetCommand — Version 93

Version 93 - Operations Dashboard
---------------------------------
- Added a nonfinancial Dashboard as the default landing page for every user.
- Shows Last Week, Month-to-Date, and Year-to-Date miles with linehaul and spot detail.
- Added a selectable 4/8/12/26 completed-week mileage trend chart.
- Summarizes accepted dispatches and declines by hub for Yesterday, Week-to-Date, Last Week, Month-to-Date, and Year-to-Date.
- Added Current, Due Soon, Overdue, and Out-of-Service maintenance indicators plus a Needs Attention list.
- Dashboard sections can be shown or hidden per user on each device.
- Stores dashboard mileage in a separate nonfinancial cloud snapshot.


NBL FleetCommand — Version 92

Version 92 - Bulk Settlement Upload + Duplicate Protection
-----------------------------------------------------------
- Settlement upload now accepts multiple CSV files in one selection.
- Exact duplicates are detected by a content fingerprint and skipped automatically, even when filenames differ.
- A different statement with the same settlement date prompts the Owner to replace it or retain the current active statement.
- Local replacement files use one canonical filename per settlement date.
- Existing duplicate files are excluded from every calculation and shown in a review panel on Settlement Summary.
- Upload completion reports statements added, replaced, skipped, retained, and any file errors.


NBL FleetCommand — Version 91

Version 91 - Focused Financial Trends
--------------------------------------
- Reduced the Financial Analysis summary to Payroll %, Maintenance %, Fuel %, and Operating Income %.
- Split the cost-ratio trend into separate Payroll/Employee Costs, Maintenance, and Fuel charts.
- Made Weekly P&L Detail collapsible. The selected-period totals remain visible while weekly rows are collapsed.


NBL FleetCommand — Version 90

Version 90 - Financial Analysis
--------------------------------
- Added a locked Financial Analysis module under Finance.
- Imports the weekly QuickBooks Profit and Loss by Month .xlsx workbook.
- Core Payroll is limited to driver and management salaries plus their payroll deductions.
- Workers' compensation, employee incentives, and health/accident insurance are shown separately as Employee-Related Costs.
- Payroll Apps remain a separate operating expense and are excluded from both measures.
- Added selectable start/end weeks, seven owner-level summary metrics, responsive profitability and cost-ratio trend charts, and weekly detail.
- The imported analysis is retained in the current browser for future review.


NBL FleetCommand — Version 89

- Changed Daily Dispatch route entry cards to a single-column phone layout.
- Stacked Route, Call, Dispatched, and Driver Assigned vertically.
- Constrained route cards, cells, and dropdowns to the available screen width.
- Disabled horizontal overflow within the mobile Daily Dispatch module.
- Preserved collapsible hubs and all tablet and desktop layouts.

NBL FleetCommand — Version 88

- Made Daily Dispatch entry cards more compact on phones.
- Placed Call and Dispatched controls side by side with Driver Assigned below.
- Added collapsible hub sections with live route, call, accepted, and decline counts.
- Opens the first hub by default and keeps the other hubs collapsed for faster access.
- Deferred the proposed landing dashboard to a future version.

NBL FleetCommand — Version 87

- Added a phone-friendly slide-out navigation drawer with tap-away and Escape closing.
- Reworked the top bar, action buttons, forms, cards, and modals for smaller screens.
- Converted the Daily Dispatch Board into stacked route cards on phones.
- Preserved horizontal scrolling for data-heavy financial, maintenance, and reporting tables.
- Increased touch targets and added safe-area support for modern phones.
- Preserved all desktop layouts, module logic, and data formats.

NBL FleetCommand — Version 86

- Renamed the application from NBL Business Analyzer to NBL FleetCommand.
- Reorganized the sidebar into Operations, People, Finance, and Compliance.
- Placed Daily Dispatch Board first within Dispatch for faster daily use.
- Consolidated Cloud Sync, data-folder controls, and Finance Security into Settings.
- Added a compact user and cloud-status area at the bottom of the sidebar.
- Preserved all existing module functionality and data formats.

Version 85 - Daily Dispatch Board

- Added Daily Dispatch Board as a second Dispatch submodule.
- Select a date and record Call Received / Not Received, Accepted / Declined, and Driver Assigned for every route.
- Routes are grouped by Nashville, Spartanburg, and Marietta hubs.
- Assigned routes are prepopulated as Received and Accepted with their regular driver selected.
- Each date is saved independently and can be retrieved or edited later.
- Added a live decline counter for the selected date.

Version 84 - Weekly Dispatch Planner

- Dispatch is now an Operations submodule named Weekly Dispatch Planner.
- Removed financial inputs, financial cards, and revenue/pay columns from the planner.
- Added Lost Miles: route miles multiplied by uncovered scheduled days, summed across all routes.
- Manage Drivers now includes both Hired Recruitment drivers and drivers found in settlement statements.
- All other weekly scheduling, saved plans, tractors, exports, and drag-and-drop behavior remain unchanged.

Version 83 - Settlement Reports Deployment Cache Fix
- Updated all CSS and JavaScript cache-busting URLs to v83 so Railway and web browsers load the current Settlement Reports code after deployment.
- Verified the existing cloud snapshots contain 12 settlement weeks plus Driver Pay periods; no data migration is required.

Version 82 - Cloud Settlement Reports
- Settlement Reports now refreshes Settlement and Driver Pay data directly from NBL Cloud when used online.
- Added compatibility for existing cloud settlement snapshots, including catalog and legacy single-result shapes.
- Cloud settlement dates are normalized from each saved result so date-range reports populate reliably online.
- No Supabase schema change or historical data re-upload is required.

Version 81 - Locked Settlement Reports
- Added Admin > Reports > Settlement Reports.
- Owner-only and protected by the Finance Access Code.
- Date-range driver pay vs attributed revenue report; highlights pay ratios above 35%.
- Date-range tractor fuel-efficiency report; highlights MPG below 7.0.
- Fuel efficiency uses settlement Fuel Purchases gallons and settlement trip miles.

NBL Business Analyzer — v65
=====================================

MAC: Double-click "NBL Business Analyzer.app". The app starts the local Motive service and opens the browser automatically.
WINDOWS: Double-click "Start NBL Business Analyzer.bat".

Opening index.html directly still works for local-only modules, but Motive, IVMR, Recruitment PDF application parsing, and Road Test PDF export require the included local service.

FIRST USE
1. Click Choose Data Folder and select a local folder for NBL Business Analyzer data.
2. Upload a FedEx settlement-detail CSV.
3. Source CSVs are copied into: <Data Folder>/Statements/
4. Generated settlement/payroll reports are stored in: <Data Folder>/Reports/<settlement-date>/
5. Tractor and maintenance data are stored in: <Data Folder>/Maintenance/maintenance_data.json
HR/hr_data.json

SCREENS
1. Driver Pay
   - Pay Date and Settlement Date selectors are populated from stored settlement statements.
   - Calculates linehaul/spot miles, D&H counts and driver payroll.

2. Settlement Summary
   - Shows the most recent settlement KPIs at the top.
   - Shows all stored settlements in one history table.
   - Tractor Repairs/Misc is classified as DEF.

3. Maintenance
   - Add tractor number, VIN, make/model, domicile and a Motive odometer reading.
   - Import tractor records from an Excel .xlsx or CSV spreadsheet. Existing tractors are updated by Tractor Number; new tractors are added.
   - Record PM1, PM2 and Other maintenance events with service date, odometer, shop name, mechanic name, service type (Scheduled/Unscheduled), and custom work/notes.
   - Optional cost fields: Parts Cost, Labor Cost, and Total Cost including tax.
   - PM1 standard scope: oil change, filters and tractor inspection. Interval: 25,000 miles.
   - PM2 standard scope: all PM1 work plus all systems fluid flush. Interval: 100,000 miles.
   - A PM2 also satisfies the PM1 requirement.
   - Other repair work is retained in maintenance history but does not reset a PM interval.


6. HR / Recruitment
   - Recruitment pipeline with the Name column frozen.
   - Tracks domicile, FedEx ID, shift, employment type, screening and ops interviews, FADV, equipment familiarization, road test, drug test, offer status, start date and recruiting status.
   - Add Candidate can import a text-based FedEx / First Advantage application PDF and prefill supported profile fields.
   - Candidate profiles include DOB, CDL Number, CDL Expiry, and masked SSN. Only the last four SSN digits are stored.
   - Days in Process is calculated automatically and stops when a candidate is marked Hired, Rejected or Withdrew.
   - HR data is stored in: <Data Folder>/HR/hr_data.json

MAINTENANCE CALCULATIONS
- FedEx statement trips are grouped by VEHICLE number, so the app can calculate weekly miles for each tractor automatically.
- Average miles/week uses stored settlement weeks beginning with the tractor's first appearance in the statement library.
- The Motive mileage is an odometer baseline. Settlement-trip miles dated after the Motive "Mileage As Of" date are added to create Estimated Current Mileage.
- Next PM is calculated from the most recent applicable PM odometer:
  * PM1: last PM1 or PM2 odometer + 25,000 miles
  * PM2: last PM2 odometer + 100,000 miles
  * Whichever is due first is shown on the dashboard.
- Weeks Until Due = miles remaining / average miles per week.
- Past-due tractors are highlighted in red.
- If no PM history exists, the dashboard asks for a PM baseline rather than guessing a due mileage.

STATEMENT LIBRARY
- The app scans settlement CSV files in the selected data folder (excluding generated Reports).
- The browser remembers the selected folder using the File System Access API + IndexedDB.
- Use Refresh Statements if files were added to the folder outside the app.

DATES
- The app finds the latest dated activity in each settlement CSV (linehaul, spot, fuel, or Tractor Repair/Misc).
- Settlement Date = Friday of the following Monday-Sunday week after that latest activity date.
- Pay Date = one day before Settlement Date (Thursday).
- Example: if the latest date in the settlement is Friday, August 21, 2026, Settlement Date is Friday, August 28, 2026 and Pay Date is Thursday, August 27, 2026.
- Filenames are never used to calculate or display settlement/pay dates.

DRIVER PAY DEFAULTS
- Mileage: $0.65/mile
- D&H $12.75 event: $8.00 driver pay
- D&H $22.25 event: $15.00 driver pay

FILES STORED
Statements/<date>_<original-name>.csv
Reports/<settlement-date>/driver_pay.csv
Reports/<settlement-date>/summary.json
Reports/<settlement-date>/settlement_report.xlsx
Maintenance/maintenance_data.json
Maintenance/Imports/<timestamp>_<tractor-spreadsheet>
Maintenance/MMR/YYYY-MM/<monthly-record>.pdf
statement_index.json

Core settlement, payroll, maintenance, meetings and Revenue Finder features remain local. Motive integration requires an internet connection and the included local launcher; the Motive API key is stored only on the computer running the launcher and is not written into the shared NBL data folder.

V5 MAINTENANCE PDF UPDATE
- Tractor setup now includes Domicile Station / Hub.
- Maintenance screen includes monthly MGBA-355 PDF generation based on the supplied FedEx U.S. Monthly Maintenance Record layout.
- Generate one combined PDF containing one page per tractor, or use the PDF button in the PM Status table for an individual tractor.
- PDFs populate month, domicile, service provider, unit number, estimated current mileage, maintenance Yes/No, detailed maintenance work, authorized officer, and date completed.
- Generated PDFs are downloaded and, when folder write permission is available, also stored under Maintenance/MMR/YYYY-MM/.


V6 MAINTENANCE DATA UPDATE
- Maintenance records now store Shop Name, Mechanic Name, Service Type, Parts Cost, Labor Cost, and Total Cost (incl. tax).
- Cost fields are optional and appear in Maintenance History when entered.
- Tractor spreadsheets can be imported in .xlsx or .csv format.
- Supported tractor columns include Tractor Number, VIN, Make / Model (or separate Make and Model), Domicile, Current Mileage / Motive Mileage, and Mileage As Of.
- A Download Import Template button provides the recommended column layout.
- Imported source spreadsheets are archived under Maintenance/Imports/.


V7 MMR EXPORT FIX
- The MGBA-355 image template is embedded directly in app.js to avoid local-file canvas security restrictions.
- MMR export now requests write permission for the selected data folder before saving.
- The most recently generated MMR stays available through a Download Last Generated PDF button if automatic downloading is blocked by the browser.


v9 BRANDING / DATE UPDATE
- Uses the exact Nashbox Logistics PNG logo supplied by Nashbox.
- Settlement Date comes from the statement itself; activity-period inference was removed.
- Pay Date is Thursday of the same Monday-Sunday week as Settlement Date.


v10 date fix:
- Settlement/Pay dropdowns display dates only, never filenames.
- Settlement Date parser supports adjacent CSV cells, MM/DD/YY, MM/DD/YYYY, DD-MMM-YYYY, and written month dates.
- Pay Date remains Thursday of the same Monday-Sunday week as Settlement Date.
- Files with no readable Settlement Date are excluded from the date dropdown until re-uploaded/date assigned.


v11 DATE LOGIC UPDATE
- Removed direct Settlement Date parsing and filename/date fallback logic.
- Settlement Date is calculated from the latest dated activity in the settlement sheet: Friday of the following week.
- Pay Date is always one day before Settlement Date.


V12 - Meetings Module
- Added Meetings screen with Truck Inspection Reports and Management Meeting Items.
- Truck inspections track Tractor #, Driver Name, Issue, Priority and Addressed Y/N.
- Management items track Date, Topic, Notes, Responsible, Due Date and Closed Y/N.
- Meeting data is stored locally in Meetings/meeting_data.json inside the selected NBL data folder.

REVENUE FINDER (v14)
--------------------
Revenue Finder is a derived review screen. It rescans all settlement CSVs in the selected data folder whenever the folder is refreshed or a new statement is uploaded.

Broken Legs
- Uses linehaul leg origin/destination, tractor and driver information.
- Groups consecutive dated activity for each tractor/driver and flags an open dispatch balance when the movement does not close back to its starting station.
- Because settlement detail files do not include exact dispatch/arrival timestamps, these are labeled possible broken legs and require management review.

Missing Fuel Supplement
- Flags linehaul/spot movements with a zero fuel supplement.
- Attempts to derive a comparison fuel rate from the same leg/VMR category or comparable spot activity in the stored statements.
- Estimated missing revenue is shown only when a comparison rate is available.

Missing D&H Payment
- Flags linehaul movements where the D&H field is zero or blank.
- Attempts to infer expected D&H from comparable paid legs in the stored settlement history.

Revenue Finder data is not stored separately. It is recalculated from the settlement library each time the screen is rendered.

FINANCE SECURITY (v15)
----------------------
Driver Pay and Settlement Summary are protected by a shared Finance Access lock.

First use:
1. Open Driver Pay or Settlement Summary.
2. Click Unlock Finance / Finance Security.
3. Create a 4-10 digit numeric access code.
4. The code protects both finance modules and is stored only in the browser's local IndexedDB.
5. Finance access automatically locks after 15 minutes of inactivity and whenever the app/browser session is reopened.

Touch ID / Windows Hello (optional):
- Browser device authentication requires a secure browser context. Opening index.html as a file does not reliably provide this.
- macOS: double-click "Start NBL Business Analyzer.command". If macOS blocks it the first time, right-click it and choose Open.
- Windows: double-click "Start NBL Business Analyzer.bat".
- The launcher runs the app only on 127.0.0.1 (your own computer) at http://localhost:8765.
- After unlocking with your code, open Finance Security and click Enable Device Unlock.
- Chrome/Edge may then offer Touch ID, Windows Hello, or the platform authenticator configured on the computer.

IMPORTANT:
This is an application privacy lock. It prevents casual access to finance screens in the NBL Business Analyzer UI, but it does not encrypt the CSV, Excel, JSON, or other files in the local data folder. Use your computer's account password and disk encryption for file-level protection.

MEETINGS EXCEL EXPORT (v16)
---------------------------
The Meetings module includes an Export Meetings Excel button. The downloaded workbook contains two sheets:
- Truck Inspections: Date, Tractor #, Driver Name, Issue, Priority, Addressed
- Management Items: Date, Topic, Notes, Responsible, Due Date, Closed
Status cells are color-coded in the workbook for quick review.


MOTIVE INTEGRATION (v17)
------------------------
- Added a Motive screen for connecting the NBL Business Analyzer to the Motive Developer API.
- IMPORTANT: Motive requires the included local launcher. Do not open index.html directly when using Motive.
- macOS: use "Start NBL Business Analyzer.command". Windows: use "Start NBL Business Analyzer.bat".
- Paste a Motive API key into the Motive screen and click Save & Test.
- The API key is stored outside the NBL data folder in the current computer user's home directory under .nbl_business_analyzer/motive_api_key. It is not stored in Google Drive or in the app files.
- The connection test checks read access to the Motive Vehicles API and separately checks whether IFTA API access is available.
- Refresh Motive Fleet loads vehicle number, VIN, make/model, status, IFTA flag, current driver, current/last-known location and odometer readings.
- The app prefers Motive true_odometer when available and falls back to the standard odometer reading.
- Update Maintenance Odometers matches Motive vehicles to Maintenance tractors by Tractor Number first and VIN second, then refreshes the Motive mileage baseline and reading date.
- Motive API requests are sent by the local Python launcher to https://api.gomotive.com using the X-API-Key header.
- Test Mode API keys are suitable for this read-only connection; a dedicated NBL Business Analyzer key is recommended for long-term use.


IVMR MODULE (v20)
-------------------
- Added an IVMR screen using Motive IFTA trip data.
- Select Start Date and End Date, then click Load IVMR Data.
- The app reads Motive IFTA trip rows by tractor and jurisdiction, including beginning/ending odometer, miles, and GPS coordinates when Motive provides them.
- The IVMR by Tractor table summarizes total miles, jurisdiction miles, beginning/ending odometer and IFTA row count.
- Export an individual IVMR PDF from a tractor row or click Export PDFs for All Tractors.
- Export All saves one PDF per tractor under: IVMR/<start>_to_<end>/ and downloads a combined fleet PDF.
- A JSON snapshot of the Motive IFTA source rows is saved in the same reporting-period folder when local folder write permission is available.
- IVMR PDFs are generated from Motive IFTA data and should be reviewed against source records before regulatory filing.

TRACTOR DOMICILES (v20)
------------------------
- Domicile is required on manual tractor entry.
- Domicile is also required on tractor spreadsheet imports.
- The IVMR screen includes a Tractor Domiciles panel showing all tractor assignments.
- Motive vehicles that are not in the tractor master or tractors with no domicile are flagged.
- IVMR PDF export is blocked for a tractor until its tractor master record and domicile are complete.

MAC APP LAUNCHER (v20)
-----------------------
- Added "NBL Business Analyzer.app" for macOS. Double-click the app instead of the .command launcher.
- The Mac app silently starts the local Python integration service and opens NBL Business Analyzer in the default browser.
- Your previously saved Motive API key remains in ~/.nbl_business_analyzer/motive_api_key, so you do not need to enter it each time.
- The app bundle is not Apple notarized. Depending on macOS security settings, the first launch may still require right-click > Open or System Settings > Privacy & Security > Open Anyway. After that, normal double-click launching should work.


VERSION 20 NOTE
---------------
The Mac launcher now uses a fresh available localhost port on every launch. This prevents an older running NBL Business Analyzer server from serving an outdated interface. The sidebar must display "Version 20 • IVMR enabled" and show 06 IVMR / 07 Motive.



IVMR HIGHWAY / ROUTE RECONSTRUCTION (v23)
- Load Motive IFTA data for the reporting period.
- Click Build Highway Routes. The local launcher retrieves Motive historical GPS breadcrumbs for each tractor and map-matches them against OpenStreetMap/OSRM road data.
- Highway/Route Traveled is cached in <Data Folder>/IVMR/<period>/route_cache.json and included in the FedEx FL-001 PDF.
- Zero-mile IFTA rows do not require a route. Rows that cannot be confidently matched are left blank and marked Review rather than guessed.
- Exporting an IVMR automatically attempts to build any missing highway routes first.

IVMR PDF FORMAT (v23)
----------------------
IVMR exports now use the FedEx Ground FL-001 Individual Vehicle Mileage Record form as the page template.
The app populates Home Station from tractor domicile, Unit # from the tractor master, IC/ISP Entity Name/Number from the IVMR screen, driver names/numbers from stored settlement statements when available, and Motive IFTA date/jurisdiction/odometer details into the 20 FL-001 mileage rows.
Origin/destination station codes are pulled from matching settlement activity when available. The Highway/Route field remains blank when the connected Motive IFTA feed does not provide a route name.
The FL-001 instruction to start a new IVMR at the beginning of a new month is respected; longer selections create additional FL-001 pages, with a maximum of 20 detail rows per page.

VERSION 22 GPS DIAGNOSTIC
-------------------------
The Motive > Test Connection check now verifies three API capabilities:
1. Vehicles API
2. IFTA API
3. Historical GPS / breadcrumb access via v2/vehicle_locations/{vehicle_id}

A successful Historical GPS result means NBL Business Analyzer can receive timestamped latitude/longitude history from Motive, which can then be map-matched to highway/route names for FL-001 IVMR reports.


MOTIVE AUTO-REFRESH (v25)
-------------------------
When a Motive API key is configured and the app is launched through NBL Business Analyzer.app or the local launcher, the Motive fleet/vehicle data is refreshed automatically during app startup. The manual Refresh Motive Fleet button remains available for an on-demand refresh.


v25 IVMR route stability
-------------------------
Highway routes are built in small cached batches with progress and a stop/resume control. Slow map-matching requests time out instead of blocking the whole month. PDF export no longer waits for route reconstruction; if routes are missing, the app can export with those cells blank after confirmation.


v26 HYBRID IVMR ROUTE BUILDER
- Replaced the single strict 35-meter OSRM map-match with a three-stage route reconstruction process.
- Stage 1: OSRM Match with 75 m GPS tolerance, tidy=true and gaps=ignore.
- Stage 2: OSRM Match with 150 m tolerance for sparse/noisy Motive breadcrumbs.
- Stage 3: if Match still fails, OSRM Route follows up to 10 GPS anchor points distributed along the actual breadcrumb path.
- Route sequences preserve roads that are legitimately re-entered later instead of globally de-duplicating them.
- The IVMR detail table identifies GPS Match vs GPS Route fallback and shows the provider used.
- Route fallback compares computed route mileage to the Motive IFTA row; large variances are marked Review rather than silently accepted.
- Route cache format is upgraded to v26 and stores method/confidence/distance diagnostics.


DISPATCH PLANNER (v28)
----------------------
- Added a Nashville Dispatch module with a weekly Sun-Sat coverage chart.
- Runs, assigned drivers and availability are configured in the authenticated workspace.
- Drag driver cards between active run cells to test coverage scenarios. Drivers cannot be double-booked on the same day.
- Click a driver and then an active run cell as an alternative to drag-and-drop.
- Optimize Coverage builds a suggested plan that preserves the primary assigned runs and maximizes coverage with the listed URR drivers.
- Reset Starting Plan restores the two assigned runs and leaves the URR runs open.
- Coverage cards and daily gap indicators update immediately after every move.
- Dispatch changes are stored locally in Dispatch/dispatch_data.json inside the selected NBL data folder.


Version 28: Dispatch driver work schedules are editable. Schedule and domicile conflicts produce warnings but can be overridden.


Version 30: Fixed the Dispatch Edit Schedule control. The weekday editor now opens reliably from draggable driver cards, and schedule changes continue to warn rather than block conflicting assignments.


VERSION 30 — DISPATCH REVENUE PLANNER
- Route economics: miles/run, pay/mile, scheduled vs covered days, weekly miles/revenue, lost revenue.
- Driver weekly pay and utilization metrics.
- Revenue-aware dispatch optimizer prioritizes higher-value open runs.
- Export Dispatch Excel workbook with schedule/economics/driver utilization.
- Export Team Schedule PDF (financial values excluded) for team sharing.


V31 MULTI-LOCATION DISPATCH
- Dispatch locations are user-managed tabs. Nashville is retained from prior versions; add additional terminals with + Add Location.
- Runs can be added, edited or deleted and are assigned to a location.
- Each location has its own weekly coverage board, economics, decline-risk analysis, Excel export and team PDF.
- Drivers remain shared across locations so same-day double-booking is detected and warned.


DISPATCH DRIVER ROSTER (v32)
- Dispatch drivers are assigned to a specific dispatch location.
- Each location tab shows only the drivers assigned to that location.
- Manage Drivers scans every stored settlement statement and builds a deduplicated list of drivers using FedEx ID.
- Select All Available can add all settlement drivers that are not already in the Dispatch roster.
- Selected settlement drivers can be assigned to any dispatch location when imported.
- New drivers can also be added manually with name, optional FedEx ID, location, regular workdays and optional weekly pay.
- Edit Driver can change FedEx ID, dispatch location, schedule and weekly pay.
- Moving a driver to another location preserves existing assignments but warns if those assignments remain at a different location.
- Manual cross-location run assignments are still possible after a warning.
- Removing a driver from Dispatch removes that driver's schedule assignments and clears them as a primary run driver.


DISPATCH TRACTOR PLANNING (v33)
- Dispatch can pull tractors from the Motive fleet and assign each tractor to a dispatch location.
- Use Manage Tractors to add Motive tractors to Dispatch, move them between locations, or remove them from dispatch planning.
- Motive tractor metadata/odometer is refreshed when the app opens.
- Each location tab shows its run, driver and tractor counts.
- Dispatch summary shows tractors at the location, peak scheduled runs/day and simple tractor capacity versus peak runs.
- Dispatch Excel export includes a Tractor Roster sheet.


DISPATCH RUN TRACTOR ASSIGNMENT (v34)
------------------------------------
- Each Dispatch run can now be assigned a primary tractor from the Motive-backed tractor pool.
- Tractor assignment is editable directly on the run card or in Edit Run.
- Cross-location or overlapping run assignments produce a warning but can be kept if intentional.
- Tractor Capacity is highlighted red whenever capacity versus peak runs is zero or negative.
- Dispatch Excel and Team Schedule PDF exports include the assigned tractor number.


DISPATCH RUN COVERAGE EXPORT (v35)
----------------------------------
- Dispatch Excel Weekly Schedule and Run Coverage PDF now mirror the in-app coverage board.
- Assignment colors: primary driver = purple, manual = green, warning/override = yellow, open = red, non-operating = gray.
- Day headers include covered/required counts.
- Exported run information includes run type, origin, assigned tractor, operating schedule, miles/run, pay/mile, covered days and weekly route revenue.
- Assignment cells include the same status note shown in the app (Primary assignment, Manual assignment, Outside regular schedule, Different dispatch location, or Origin override).


Version 36: Dispatch team exports exclude pay rates, revenue, payroll, lost revenue, and other financial information.

Version 37: Dispatch can save multiple named coverage configurations per location. Saved tables persist in Dispatch/dispatch_data.json and can be loaded, updated, renamed, or deleted. Export All Plans PDF creates one team-facing PDF containing one saved coverage table per page.

Version 38: Maintenance historical odometer lookup. When a past service date is selected, the app matches the tractor to Motive and automatically retrieves the latest available historical odometer reading for that date. A Pull from Motive button provides a manual retry. The returned mileage can still be overridden, and records preserve whether the saved odometer came from Motive or was entered manually.


Version 40: Flexible Driver Payroll. Driver-specific pay profiles support Day Rate, Mileage + D&H, or Hybrid pay, optional weekly minimum guarantees, automatic days-worked detection with override, and pay-period adjustments for bonus, holiday, vacation, training, or other manual items. Payroll settings are stored locally in Payroll/payroll_data.json.

Version 41: Dynamic D&H Mapping. Driver Pay detects every positive D&H value in the selected settlement and lets the user map each settlement value to a driver payout. Mappings are stored in Payroll/payroll_data.json and payroll/export calculations use the mapped values instead of assuming fixed $12.75/$22.25 settlement amounts.


Version 42: Domicile MMR Exports. The fleet MMR export now groups tractors by domicile and creates one separate MGBA-355 PDF per domicile for the selected month. Each domicile PDF contains one page per tractor assigned to that domicile. Individual tractor PDF export remains available.


Version 43: Driver Pay Summary PDFs. Driver Pay now includes an individual PDF Summary button for every driver. Day-rate summaries show only day-rate information; mileage summaries show only mileage and driver-facing D&H payout information. Internal settlement D&H values are never shown on driver PDFs. Hybrid drivers receive both relevant sections. Weekly minimum adjustments and pay-period bonus/holiday/vacation/training/other adjustments are included, and generated PDFs are saved under Payroll/Driver Summaries/<pay date>/ when a data folder is connected.


Version 44: Driver Workday Tracking. Driver Pay now shows a Saturday-Friday workday grid for every driver with actual weekday/date headers (for example, Tue Sept 1). Settlement activity pre-checks known worked days, and the user can check or uncheck any day. The selected days are stored per pay period. Day-rate and hybrid pay calculations use the checked day count; mileage-rate pay remains mileage/D&H based while still recording attendance. Payroll CSV/XLSX exports include the seven dated workday columns.


Version 45: HOS Logs Access Test. Motive > Test Connection now also checks GET /v1/logs. If HOS Logs shows Available, the configured Motive API key can read driver HOS logs and can be used in a future payroll update to infer worked days from driving/on-duty activity.


Version 46: Motive HOS Workdays. Driver Pay can now refresh worked-day checkboxes from Motive HOS logs. The app fetches the Saturday-Friday pay week plus the preceding Friday, stitches chronological duty-status events, and counts a continuous On Duty/Driving session once on the date it began. A Friday-night session continuing into Saturday therefore does not count Saturday as a second workday. Motive matching uses driver company ID when it matches the FedEx ID, then exact/first-last name matching. Manual checkbox edits remain per-day overrides.

Version 47 additions
--------------------
- New Compliance Audit module based on the NBL Technology & Systems Compliance checklist.
- Audit dashboard, new-audit checklist, open findings, and audit history.
- Fail / Check results become corrective-action findings.
- Audit findings can be converted into linked Management Meeting Items.
- Closing/reopening a linked Management Meeting Item updates the audit finding status.
- Audit data is stored locally under Audit/audit_data.json in the selected NBL data folder.


Version 48: Resizable Meetings Columns
--------------------------------------
- Truck Inspection Reports and Management Meeting Items now support drag-to-resize table columns.
- Drag the divider on the right edge of any column header to adjust that column.
- Column widths are saved in Meetings/meeting_data.json so they persist between app launches.
- Each Meetings table includes a Reset Column Widths button to restore sensible defaults.
- Minimum widths prevent columns from collapsing, and horizontal scrolling remains available for wide layouts.
- Issue, Topic, and Notes content wraps within resized columns for easier reading.



Version 49: Settlement Analysis
-------------------------------
- Settlement is now split into Settlement Summary and Settlement Analysis sub-modules.
- Settlement Summary retains the existing most-recent metrics and settlement history.
- Settlement Analysis adds a settlement-date selector and breaks linehaul miles down by domicile.
- Linehaul domicile is matched primarily from the tractor master; if no master domicile is available, the settlement domicile/category field is used when present.
- Spot activity is grouped by client/customer name from the settlement Spot records.
- Analysis includes totals, percentages, trip counts, compact bar visuals, and clear review flags for unassigned mileage.

Version 50: HR Recruitment + Spot Run Type
------------------------------------------
- New HR module with Recruitment as the first sub-module.
- Recruitment tracks Name, Email, Phone, Location/Domicile, FedEx ID, Shift, Type, Date Added, Screening Interview, FADV Status, Notes, Ops Interview, Equipment Fam, Road Test, Offer Letter, Start Date, Recruitment Status, and Days in Process.
- Name, Email, and Phone remain frozen while the recruitment table scrolls horizontally.
- Days in Process is calculated automatically from Date Added and stops when a candidate is marked Hired, Rejected, or Withdrew.
- Recruitment includes candidate search, status filtering, summary cards, and add/edit/delete workflow.
- Recruitment data is stored locally under HR/hr_data.json in the selected NBL data folder.
- Dispatch Run Type now supports Spot in addition to Assigned and Unassigned / URR, including distinct board and PDF styling.


Version 51: Recruitment Scroll Fix + Drug Test
----------------------------------------------
- Fixed the HR Recruitment layout so the recruiting table is constrained to the app content area and scrolls horizontally as intended.
- Name, Email, and Phone remain frozen while the remaining recruitment columns scroll.
- Added Drug Test with Not Taken, Taken, Pass, and Fail statuses.
- Existing recruitment records are automatically treated as Not Taken until updated.


Version 52: Recruitment Data Grid
- Recruitment table headers are sortable by clicking the header label.
- Every recruitment column can be resized by dragging its right edge.
- Non-frozen workflow columns can be rearranged with the drag grip in the header.
- Name, Email and Phone remain frozen as the first three columns.
- Recruitment column widths and order are saved in HR/hr_data.json.
- Added Reset Columns control to restore the default widths and order.


Version 53: Recruitment Status Updates
- Equipment Fam now supports No, Sent, and Yes.
- Days in Process is green for 0-10 days, yellow for 11-20 days, and red for 21+ days.


Version 54: Recruitment Grid Reliability + Excel Export
--------------------------------------------------------
- Recruitment column resizing now uses a larger visible edge handle and applies the selected width directly to every cell, including frozen columns.
- Added Export Excel for the current filtered/sorted Recruitment view; the workbook follows the current column order and excludes the Actions column.
- Double-clicking any candidate row opens that candidate in the Edit Candidate window.


Version 55: Recruitment Column Resize Fix
- Only the Name column remains frozen in HR > Recruitment.
- Email and Phone now scroll with the remaining recruitment columns.
- Reworked recruitment column resizing to use direct mouse/touch drag listeners for improved reliability.
- Enlarged the resize grab area on every column divider.
- Recruitment Excel export now freezes only the Name column.

V57 PDF IMPORT FIX
------------------
- Bundles typing_extensions 4.16.0 so pypdf can load under older Apple system Python versions used by the Mac launcher.
- PDF parser startup errors now include the actual Python exception and interpreter version for easier troubleshooting.


Version 58: Protected Full SSN Reveal
-------------------------------------
- Candidate profiles continue to show SSNs masked by default as XXX-XX-1234.
- Full SSNs can be revealed only after entering the same Finance Access Code used for Driver Pay and Settlement.
- PDF application import now retains a full nine-digit SSN when the source application contains it, while still displaying it masked by default.
- Existing candidate records that contain only the last four digits remain supported; Reveal is disabled for those records until a full SSN is entered/imported.
- Full SSNs remain excluded from the Recruitment table and Recruitment Excel export.
- The finance lock is an app-level privacy control; local HR data files are not file-system encrypted by this feature.

Version 59: Dual First Advantage Import + SSN Access Fix
- Recruitment application import now supports both known First Advantage PDF layouts, including the newer character-spaced text-layer format.
- SSN reveal / Finance Access Code prompt now opens above the candidate editor.
- Reveal is available on existing candidate profiles. Older records that only retained the final four SSN digits can be securely unlocked so the full SSN can be entered once and saved for future protected reveal.


Version 60: Recruitment Status Groups
- Recruitment Status is now limited to In Progress, Hired, Rejected, and Terminated.
- Existing Active and On Hold records migrate to In Progress; existing Withdrew records migrate to Rejected.
- Recruitment drivers are visibly grouped by status in the main table, and the status filter uses the same four categories.
- Summary cards show counts for the four status groups.


Version 61: Recruitment Road Test Automation + Favicon
------------------------------------------------------
- Added a Road Test action for every candidate in HR > Recruitment.
- Road Test uses the supplied FedEx Ground OP-104S Tractor/Single Trailer form as the exact 5-page PDF template.
- Candidate name, FedEx ID and CDL number are pulled from the recruitment profile.
- The road-test date is set automatically and reused in Sections 1, 2, 10 and 11.
- Test Administrator name and FedEx ID, equipment-familiarization certificate number, tractor number and trailer number are entered once and reused throughout the form.
- Candidate and Test Administrator signature fields are generated from their respective names in Sections 2, Confirmation of Driver Candidate, Signature Confirmation for Uncoupling, Section 10 and Section 11.
- Existing form content stays unchanged, including evaluation Y marks, equipment-familiarization selection, automatic-transmission selection, 90-mile value, Nashbox Logistics employer/address/title details, and other pre-filled information.
- Exported PDFs are downloaded and, when a data folder is connected, also saved under HR/Road Tests.
- Road-test entry values are saved with the candidate so the form can be reopened/re-exported without retyping the administrator/vehicle information.
- Added the supplied Nashbox Logistics square logo as the browser favicon.


Version 62: Recruitment CDL Issuing State
- Adds CDL Issuing State to Candidate Details without adding another Recruitment table column.
- First Advantage PDF import fills the issuing state when present in either supported application format.
- Road Test export reuses the candidate CDL issuing state in Section 11.


Version 63: Electronic Road Test Signatures
-------------------------------------------
- Road Test signatures are now rendered in a cursive handwritten electronic-signature style instead of plain typed text.
- Candidate and Test Administrator names remain the source of each signature; no extra signature entry is required.
- Signature artwork is generated locally by the browser and stamped into the existing OP-104S PDF as transparent raster content, preserving the original form layout and avoiding bundled font files.
- Applies to every candidate/admin signature location already automated in Sections 2, Confirmation of Driver Candidate, uncoupling confirmation, Section 10 and Section 11.


Version 64: Sidebar Organization + Recruitment Doubles
- Reorganized the left navigation into Admin and Operations groups.
- Admin now contains Driver Pay, Settlement, IVMR, and HR > Recruitment.
- Operations now contains Meetings, Maintenance, Motive, and Audit.
- Revenue Finder and Dispatch remain top-level modules.
- Added a Doubles (Yes / No) field to Recruitment, including the candidate form, table, sorting, search, saved data, and Excel export.


Version 65: Existing Candidate First Advantage Updates
------------------------------------------------------
- Existing Recruitment profiles can now receive a new First Advantage application PDF directly from Candidate Details.
- Supported PDF fields update the existing profile automatically without clearing operational recruitment fields that are not present in the PDF.
- If the candidate name in the uploaded PDF differs from the existing profile, NBL shows both names and requires an explicit Accept Upload or Reject Upload decision before any data changes.
- Rejected uploads make no changes. Accepted uploads update and save supported fields immediately.
- SSN handling remains protected: full SSNs remain masked by default and use the Finance Access Code to reveal.
- Existing dual-format First Advantage parsing remains supported.


VERSION 66 - MOTIVE HISTORY DIAGNOSTIC
- Added IVMR > Motive Tractor History Test.
- Choose a tractor and date window for the diagnostic test.
- Diagnostic prefers Motive v3 historical vehicle locations and falls back to v2 if needed.
- Shows point counts, daily first/last readings, odometer delta, approximate GPS distance, raw Motive descriptions and a spread sample of raw history points.
- Diagnostic JSON can be downloaded for troubleshooting without changing IVMR data.

VERSION 67 - MOTIVE HISTORY ID / REQUEST DIAGNOSTIC
- Resolved test tractors strictly through Motive /v1/vehicles so fleet number and internal vehicle ID cannot be confused.
- Added detailed Motive HTTP error reporting and driving-period fallback diagnostics.

VERSION 68 - IVMR ROUTE RECONSTRUCTION
- Rebuilt Highway / Route Traveled around the dense Motive tractor history proven by the v66/v67 diagnostic.
- IVMR route building uses the validated v3-first historical-location request strategy.
- Route reconstruction fetches a one-day buffer on each side of the IFTA service date, then isolates each IFTA row primarily by start/end odometer.
- Endpoint matching is constrained to the service date when odometer data is unavailable, preventing repeated assigned routes from matching the wrong day's terminal visit.
- Highway reconstruction first map-matches the sampled full Motive trace; only difficult/long traces fall back to segmented map matching.
- Old pre-v68 route-cache results are ignored so Highway / Route values are rebuilt using the new engine.
- Browser processing is grouped by tractor/service-day and the local route request timeout was increased for long runs.
- IFTA remains the mileage/jurisdiction source; Motive tractor history supplies the route geometry used to determine Highway / Route Traveled.


v69 IVMR performance update
---------------------------
- Replaced the slow multi-stage OSRM map-matching loop with bounded GPS-anchor routing from the actual Motive breadcrumb trace.
- Groups all selected IFTA dates for a tractor into one backend request so Motive history is fetched once per tractor.
- Uses one route request per IFTA segment with at most one retry, and processes up to two route rows concurrently.
- Old pre-v69 route cache entries are ignored so slow/incomplete v68 results are rebuilt.
- Route build requests have a 90-second browser-side ceiling instead of appearing to run indefinitely.


VERSION 70 - MOTIVE V3 IVMR CLEANUP + CORRIDOR REUSE
-----------------------------------------------------
- Successful Motive v3 breadcrumb history is now the authoritative vehicle-history validation for IVMR.
- Removed the misleading single-day vehicle-ID validation dependency that could report "invalid time zone" even when v3 history succeeded.
- Driving-period diagnostics now run only as a fallback when breadcrumb history is unavailable.
- Motive History Test reports breadcrumb history as Verified when points are successfully returned.
- IVMR route building groups repeated GPS corridors inside a tractor build and reuses the first successful highway sequence for matching assigned-route days.
- Public route requests use fewer GPS anchors and shorter bounded timeouts to reduce long waits.
- Pre-v70 route caches are ignored so routes are rebuilt using the v70 engine.


VERSION 71 - PRODUCTION IVMR REBUILD
- Motive IFTA fragments are merged into contiguous same-day, same-jurisdiction IVMR travel segments.
- Highway / Route Traveled is matched from dense Motive v3 GPS history against official U.S. Census TIGER/Line 2025 Primary and Secondary Roads.
- Road files are downloaded once per state and cached locally under ~/.nbl_business_analyzer/road_data/tiger2025.
- Public OSRM is fallback-only rather than the primary production route engine.
- Failed route rows now display the backend failure detail directly in the IVMR table.
- Pre-v71 route caches are ignored.
- PyShp is bundled to read Census shapefiles locally.


VERSION 72 - MILEAGE REPORT IVMR FORMAT
- IVMR now rebuilds Mileage Report-style segment rows from the underlying Motive IFTA fragments, splitting at date, jurisdiction, recognized stop/city-spot, and zero-mile location boundaries.
- Highway / Route Traveled is generated per Mileage Report-style segment from Motive v3 history and Census TIGER/Line road geometry.
- Added a shared IVMR Origin / Destination Location Master stored in IVMR/ivmr_locations.json.
- Origin / Destination values use the Mileage Report display style, such as 419 - Clarksville, 379 - Knoxville, 293 - Spartanburg, and HUNTINGBURG EXPRESS - Huntingburg.
- Location matching prefers configured GPS proximity and uses Motive beginning-location descriptions as a conservative stop-only fallback.
- Zero-mile / near-zero IFTA rows are preserved as standalone IVMR rows, including rows whose Origin / Destination is blank.
- IVMR PDF export now uses the generated segment-level Origin / Destination and Highway / Route values directly.
- Pre-v72 route caches are ignored so the new segment format is rebuilt cleanly.


Version 73 - Road Test Save Workflow
------------------------------------
- Road Test information can now be saved without generating or downloading a PDF.
- The Road Test form now uses Save Road Test as its primary action.
- After a successful save, NBL asks whether to Export PDF or Save Only.
- Choosing Save Only closes the form while retaining all road-test values for the candidate.
- Reopening Road Test restores the saved administrator, certificate, tractor, trailer, and date information.
- Export PDF still uses the saved values and original OP-104S template/signature workflow.


Version 74 - Recruitment Export + Notes
- Recruitment export now exports the complete candidate list across all recruitment statuses to Excel.
- Reason Stuck was replaced by a general Notes field. Notes remain available regardless of FADV or Recruitment Status.
- Existing Reason Stuck text is migrated into Notes automatically.


Version 75 - Minimum Includes Additional Pay
- Weekly minimum calculations now include positive additional payments such as bonus, holiday, vacation, training, and other/manual pay.
- Example: $1,000 regular pay + $200 bonus satisfies a $1,200 weekly minimum with no minimum top-up.
- Negative payroll adjustments remain deductions after the minimum calculation and do not increase the minimum top-up.
- Driver Pay PDF summaries identify when additional pay was included in the minimum calculation.


Version 76 - Adjustment Minimum Override
- Each Driver Pay adjustment now has an individual checkbox: "Pay this adjustment in addition to the weekly minimum."
- Unchecked positive adjustments continue to count toward satisfying the weekly minimum.
- Checked positive adjustments are excluded from the minimum calculation and paid on top of the weekly minimum.
- Negative adjustments remain deductions and do not increase the minimum top-up.
- The Adjustments table and Driver Pay PDF summary show how each adjustment is treated.


Version 77 - NBL Cloud Online Bridge
------------------------------------
- Added Supabase email/password sign-in for the Nashbox Logistics online workspace.
- Added persistent authenticated cloud sessions using the Supabase publishable key; no service-role or secret key is embedded in the browser app.
- Added NBL Cloud status, sign out, and a Cloud Sync / Migration window.
- Added one-time Import / Upload Local NBL Data workflow. The local NBL folder remains unchanged and can continue to serve as a backup.
- Added cloud module snapshots for Recruitment / HR, Driver Pay, Maintenance, Meetings, Audit, Dispatch, Settlement / Revenue Finder, and IVMR.
- Existing v76 Driver Pay adjustment behavior is preserved, including the per-adjustment "Pay this adjustment in addition to the weekly minimum" setting.
- Full Social Security numbers are deliberately excluded from v77 cloud snapshots. Last four digits can be retained; full SSN cloud storage remains deferred until server-side encryption is implemented.
- Module saves now write to NBL Cloud when signed in and continue writing to the local data folder when one is connected.
- Settlement CSVs can be uploaded directly to the cloud session even when no local data folder is connected. Parsed settlement data is stored; the raw uploaded CSV is not retained in the v77 cloud snapshot.
- IVMR current-period data and the Origin / Destination location master can be saved to NBL Cloud.
- The Python backend is ready for hosted deployment: it accepts the platform PORT variable, can bind to 0.0.0.0, and supports MOTIVE_API_KEY as a server environment variable.
- All /api/* backend endpoints require a valid Supabase-authenticated NBL organization user. This prevents a public deployment from exposing Motive, HR PDF parsing, or Road Test generation endpoints anonymously.
- Added /health for hosted-service health checks.
- Added Railway deployment files. Hosting/custom-domain setup is the next deployment step; v77 itself does not claim that a public site has already been deployed.


Version 78 - Railway Runtime Fix
- Added a root Dockerfile using the official Python 3.12 runtime so Railway always has Python available.
- Added .dockerignore to keep the Mac application bundle and local-only clutter out of the Railway image.
- Railway continues to start the app with start_nbl_analyzer.py and uses Railway's PORT automatically.
- No NBL business data or Supabase schema changes are required for this update. Existing cloud snapshots remain intact.


Version 110 - Recruitment Address Import + Hiring Status Layout
- Recruitment application import selects the current address from Address History, with the most recent start date as a fallback.
- Road Test appears within Hiring Status immediately after Equipment Fam.


Version 111 - Recruitment Onboarding and Flexible Documents
- Added a separate Onboarding section for Safety Forward, ConnectTeams, ADP, Motive and Employee Handbook status.
- Replaced the two fixed document cards with five labeled document slots and optional expiration dates.
- Existing CDL and Medical Card uploads are automatically shown in the new slots.
- Added PDF, JPEG, PNG, HEIC, HEIF, DOC and DOCX support, with the existing 10 MB per-file limit.
- Run SUPABASE_v111_RECRUITMENT_DOCUMENT_TYPES.sql once before uploading HEIC or Word documents.


Version 112 - Weekly Dispatch Run Order and Toolbar
- Weekly Dispatch Planner shows Dedicated runs first, URRs alphabetically, and Spots alphabetically.
- Run type labels now use Dedicated, URR and Spot terminology.
- The top controls are grouped into Plan, Manage and Export actions, with Reset Plan visually separated.
- No database or Supabase changes are required for this version.


Version 79 - Cloud Maintenance + Motive Configuration
- Maintenance now renders from NBL Cloud even when no local data-folder handle exists.
- Maintenance header uses the active workspace label instead of assuming a local folder.
- Motive-to-Maintenance sync now works against the cloud-backed Maintenance workspace.
- Online Motive credentials are read from the MOTIVE_API_KEY Railway environment variable so they persist across deployments and remain server-side.
- The hosted app no longer pretends a browser-entered Motive key will persist in an ephemeral Railway container.


Version 80 - Multi-User Access + Owner Finance Lock
- Added owner-only User Access for online NBL profiles.
- Driver Pay, Settlement, and Revenue Finder are owner-only at both UI and Supabase RLS layers.
- Finance Access Code now protects Revenue Finder in addition to Driver Pay and Settlement.
- Non-owner profiles cannot see finance modules, Finance Security, statement upload controls, or the local data-folder bridge.
- Added My Profile for display name and password changes.
- Online user creation uses SUPABASE_SECRET_KEY only on the Railway server; the secret is never sent to the browser. A legacy SUPABASE_SERVICE_ROLE_KEY is still accepted as a fallback for older deployments.
