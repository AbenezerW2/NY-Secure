import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("defines the NY-Secure access-control product experience", async () => {
  const [layout, consoleSource] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ny-secure-console.tsx", import.meta.url), "utf8"),
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
  assert.match(consoleSource, /Access history/);
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
  assert.doesNotMatch(consoleSource, /Manage access/);
  assert.match(layout, /title:\s*"NY-Secure Physical Security"/);
  assert.match(schema, /accessAssignments/);
  assert.match(schema, /accessEvents/);
  assert.match(schema, /phoneNumber:\s*text\("phone_number"\)/);
  assert.match(schema, /ibxAccessPin:\s*text\("ibx_access_pin"\)/);
  assert.match(schema, /creditHold:\s*integer\("credit_hold"/);
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
