import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("defines the NY-Secure access-control product experience", async () => {
  const [layout, consoleSource, initSource, styles, visitsRoute] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ny-secure-console.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/init.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/visits/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /title:\s*"NY-Secure Physical Security"/);
  assert.match(consoleSource, /Simulation environment/);
  assert.match(consoleSource, /Good morning, Maya/);
  assert.match(consoleSource, /NY-Secure · DC-01/);
  assert.match(consoleSource, /StatLogDrawer/);
  assert.match(consoleSource, /zone-cage-11000/);
  assert.match(consoleSource, /Start with a clean canvas/);
  assert.match(consoleSource, /Open display and dashboard settings/);
  assert.match(consoleSource, /Time<\/th><th>Who<\/th><th>What<\/th><th>Where<\/th><th>When/);
  assert.match(consoleSource, /Time<\/th><th>When<\/th><th>Who<\/th><th>What<\/th><th>Where/);
  assert.match(initSource, /DOOR_HELD/);
  assert.match(initSource, /MONITORING_POINT_ALARM/);
  assert.match(consoleSource, /Filter by alarm type/);
  assert.match(consoleSource, /Customer data/);
  assert.match(consoleSource, /Alarm center/);
  assert.match(consoleSource, /aria-label="Main sections"/);
  assert.match(consoleSource, /taskbar-profile/);
  assert.match(consoleSource, /Open Maya Brooks operator profile/);
  assert.doesNotMatch(consoleSource, /operator-card/);
  assert.match(consoleSource, /activeNavGroup/);
  assert.match(consoleSource, /sidebar-navigation/);
  assert.match(styles, /\.section-taskbar/);
  assert.match(styles, /\.sidebar-navigation[\s\S]*overflow-y:\s*auto/);
  assert.match(consoleSource, /Last-known access point/);
  assert.match(consoleSource, /Find a last-known scan/);
  assert.match(consoleSource, /aria-label="Locate by first name"/);
  assert.match(consoleSource, /aria-label="Locate by last name"/);
  assert.match(consoleSource, /aria-label="Locate by card number"/);
  assert.match(consoleSource, /Populated fields must all match/);
  assert.match(consoleSource, /Locate everyone/);
  assert.match(consoleSource, /48 \* 60 \* 60 \* 1000/);
  assert.match(consoleSource, /Everyone’s latest scan/);
  assert.match(consoleSource, /Right-click an alarm/);
  assert.match(consoleSource, /Open contact card/);
  assert.match(consoleSource, /View 24-hour scans/);
  assert.match(consoleSource, /Scheduled visits/);
  assert.match(consoleSource, /01-XXXXXX/);
  assert.match(consoleSource, /Customer cage/);
  assert.match(consoleSource, /Filter Ticket column/);
  assert.match(consoleSource, /Filter Visitor column/);
  assert.match(consoleSource, /Filter Customer or requester column/);
  assert.match(consoleSource, /Filter Cage and cabinets column/);
  assert.match(consoleSource, /Filter Valid window column/);
  assert.match(consoleSource, /Filter Delivery column/);
  assert.match(consoleSource, /Filter Status column/);
  assert.match(consoleSource, /Open scheduled visit tabs/);
  assert.match(consoleSource, /Double-click to open this work visit/);
  assert.match(consoleSource, /Point of contact/);
  assert.match(consoleSource, /Work visit number/);
  assert.match(consoleSource, /Photo verified/);
  assert.match(consoleSource, /Verify photo & start ticket/);
  assert.match(consoleSource, /method: "PATCH"/);
  assert.match(visitsRoute, /export async function PATCH/);
  assert.match(visitsRoute, /PHOTO_VERIFICATION_REQUIRED/);
  assert.match(visitsRoute, /SET signed_in_at = \?, status = 'ACTIVE'/);
  assert.match(consoleSource, /Signed in · overdue/);
  assert.match(consoleSource, /effectiveVisitStatus/);
  assert.match(consoleSource, /setInterval\(\(\) => setVisitClock\(Date\.now\(\)\), 1000\)/);
  assert.match(consoleSource, /hour12:\s*false/);
  assert.match(consoleSource, /Simulate access/);
  assert.match(consoleSource, /Search by first name, last name, OID, or company/);
  assert.match(consoleSource, /aria-label="Search by first name"/);
  assert.match(consoleSource, /aria-label="Search by last name"/);
  assert.match(consoleSource, /aria-label="Search by company name"/);
  assert.match(consoleSource, /aria-label="Search by OID"/);
  assert.doesNotMatch(consoleSource, /records are indexed/);
  assert.doesNotMatch(consoleSource, /onClick=\{onAdd\}/);
  assert.match(consoleSource, /people-search-button/);
  assert.match(consoleSource, /type="submit"/);
  assert.match(consoleSource, /PersonProfileCard/);
  assert.match(consoleSource, /People currently on-site/);
  assert.match(consoleSource, /Search people currently on-site/);
  assert.match(consoleSource, /onsite-contact-card/);
  assert.match(consoleSource, /Showing \{filteredOnSite\.length\} of \{onSite\.length\}/);
  assert.match(consoleSource, /Pending security verification/);
  assert.match(consoleSource, /Verify & sign in/);
  assert.match(consoleSource, /Sign-in history/);
  assert.match(consoleSource, /Time on-site/);
  assert.match(consoleSource, /formatOnSiteDuration/);
  assert.match(consoleSource, /function wildcardMatch/);
  assert.match(consoleSource, /function wildcardMatchAny/);
  assert.match(consoleSource, /\*some\*/);
  assert.match(consoleSource, /Use \* to match any characters/);
  assert.match(consoleSource, /\/api\/check-ins/);
  assert.match(consoleSource, /people-workspace-tabs/);
  assert.match(consoleSource, /Directory search/);
  assert.match(consoleSource, /Search results/);
  assert.match(consoleSource, /person-contact-card/);
  assert.match(consoleSource, /contact-card-type/);
  assert.match(consoleSource, /Customer/);
  assert.match(consoleSource, /Internal/);
  assert.match(consoleSource, /closeProfile/);
  assert.doesNotMatch(consoleSource, /profile-card-backdrop/);
  assert.match(consoleSource, /IBX access PIN/);
  assert.match(consoleSource, /24-hour scans/);
  assert.match(consoleSource, /Scan locations/);
  assert.match(consoleSource, /Point of contact/);
  assert.match(consoleSource, /blank-contact-photo/);
  assert.match(consoleSource, /name="phoneNumber"/);
  assert.match(consoleSource, /Internal employee/);
  assert.match(consoleSource, /Badge access and activity are managed outside this board/);
  assert.doesNotMatch(consoleSource, /<option>VISITOR<\/option>/);
  assert.doesNotMatch(consoleSource, /<option>JANITOR<\/option>/);
  assert.doesNotMatch(`${layout}\n${consoleSource}`, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships durable access-control capabilities instead of starter artifacts", async () => {
  const [page, consoleSource, layout, schema, hosting, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ny-secure-console.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<NySecureConsole \/>/);
  assert.match(consoleSource, /\/api\/people/);
  assert.match(consoleSource, /\/api\/simulate/);
  assert.match(consoleSource, /\/api\/visits/);
  assert.doesNotMatch(consoleSource, /Manage access/);
  assert.match(layout, /title:\s*"NY-Secure Physical Security"/);
  assert.match(schema, /accessAssignments/);
  assert.match(schema, /accessEvents/);
  assert.match(schema, /export const alarms/);
  assert.match(schema, /export const scheduledVisits/);
  assert.match(schema, /signedInAt:\s*text\("signed_in_at"\)/);
  assert.match(schema, /export const siteCheckIns/);
  assert.match(schema, /idx_site_check_ins_person_open/);
  assert.match(schema, /phoneNumber:\s*text\("phone_number"\)/);
  assert.match(schema, /ibxAccessPin:\s*text\("ibx_access_pin"\)/);
  assert.match(schema, /creditHold:\s*integer\("credit_hold"/);
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
