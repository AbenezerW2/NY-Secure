# NY-Secure Physical Security

NY-Secure is an enterprise physical-security simulator for a colocation facility. It combines identity records, customer and visitor workflows, facility access policies, scheduled visits, alarms, access-event history, and last-known-location reporting in one operator console.

The current private deployment is available at [atlas-dc-access-lab.abine26.chatgpt.site](https://atlas-dc-access-lab.abine26.chatgpt.site/).

For the detailed access-control rules and facility contract, see [CAPABILITIES.md](./CAPABILITIES.md).

> NY-Secure is a simulation. It does not communicate with real readers, controllers, doors, credentials, identity systems, or customer records. All organizations, people, badge numbers, visits, alarms, and events are fictional.

## Current product areas

The console uses a two-level navigation model. The bottom taskbar switches between the main product areas, while the side navigation shows the pages within the active area. The signed-in operator profile is located at the far-right of the taskbar.

### Workspace

- **Overview** — a device-configurable dashboard that can show security totals, the facility map, recent activity, the attention queue, and the on-site roster. Operators can leave the overview blank or enable any combination of widgets.
- **Live operations** — presents a credential at a selected access point and explains the resulting default-deny decision, matched policy, reason code, and audit event.
- **Facility** — explores the DC-01 hierarchy and interactive floor plan, including entrances, mantraps, common areas, critical infrastructure, logistics spaces, and 62 customer cages.
- **Access policies** — shows reusable, scheduled permission profiles, their covered zones, and current assignees.

### Customer data

- **People** — separates directory search, search results, open profiles, a searchable contact-card roster for people currently on site, pending security verification, and sign-in history.
- **Organizations** — displays customers, the data-center operator, network providers, contacts, people, and assigned cage inventory.
- **Scheduled visits** — creates and tracks temporary customer- or NOC-sponsored work-visit tickets with visitor, access, timing, cabinet, comment, and delivery details.

### Alarm center

- **Locator** — searches the complete activity log with separate first-name, last-name, and card-number fields. Submitting all fields empty returns each person’s single latest scan from the past 48 hours.
- **Alarms** — provides a dedicated alarm report with severity and type filters, CSV export, and person-linked actions.
- **Activity log** — provides the searchable grant/denial audit trail with decision and location filters plus CSV export.

## People, presence, and profiles

The People workspace is search-first and does not expose the complete directory before a search is submitted. First name, last name, company, and organization ID (OID) are independent search parameters; populated fields are combined with AND matching.

Search results appear as contact cards in an internal results tab. Multiple person profiles can remain open inside the workspace. Each profile includes:

- identity, company, OID, six-digit IBX access PIN, and credit-hold state;
- current cage and cabinet access derived from active assignments;
- access history with decision, location, date, and 24-hour time; and
- person and organizational contact details.

The add-person workflow creates either a **Customer** or **Internal employee** directory record. It creates identity/contact data only; access is managed through profiles and assignments.

Customer, vendor, visitor, and contractor arrivals use the site check-in workflow:

1. A portal or kiosk request creates a **Pending** check-in.
2. Security can verify and move the person to **On-site**, or reject the request.
3. Security signs the person out when the visit ends.
4. **History** records the actual sign-in time, sign-out time, and total time on site.

The People-on-site dashboard total and roster are based on verified, open check-ins rather than the entire directory.

## Scheduled visits

DC-01 visit tickets use the format `01-XXXXXX`. A ticket records:

- requesting customer or NY-Secure NOC;
- requester and visitor identity/contact details;
- customer cage and permitted cabinet references;
- start time and a validity duration from 1 to 168 hours;
- optional comments; and
- delivery status, package count, and package details.

The visit board shows upcoming, active, delivery, and status information. Each column has its own search field in addition to the general search and status filter.

Selecting a ticket number or double-clicking its row opens that work visit in an internal tab. The ticket view shows the requester/point of contact, work-visit number, customer cage, cabinet scope, approved start/end date and time, comments, delivery details, and the visitor’s contact record. Security must confirm the visitor photo before selecting **Verify photo & start ticket**; starting the ticket is persisted in D1 and changes the visit to active.

Expired tickets disappear immediately when the visitor is not signed in. If the visitor remains signed in after the valid window ends, the ticket stays visible as **Signed in · overdue** and the row receives a red warning outline. Security verification and sign-out update the matching scheduled ticket when the person and ticket identity can be correlated.

## Alarms and activity

Alarms are separated from customer-directory data and use the report columns:

```text
Time (24-hour) | When | Who | What | Where
```

The seeded alarm scenarios currently include:

- Door held
- Door forced
- Unknown card
- Wrong door
- Wrong time
- Expired card
- Incorrect time
- Monitoring point alarm
- Repeated invalid scan

Known-person alarms support a right-click or overflow action that opens either the person’s contact card or their scan locations from the previous 24 hours.

The activity log remains a separate access-decision report using:

```text
Time (24-hour) | Who | What | Where | When
```

Every simulated access decision records the person, zone, matched assignment/profile when present, grant or denial, reason code, plain-language explanation, and timestamp.

## Locator

Locator has two operating modes:

- Enter a first name, last name, card number, or any combination of those fields to find the most recent matching access event in the complete log. Every populated field must match, and each field supports `*` wildcards.
- Leave all three fields blank and select **Locate everyone** to return one last-known scan per person from the past 48 hours.

Results include the person, customer, last location, decision, and scan timestamp.

## Wildcard search

Search fields across the console support `*` as a wildcard:

```text
*some*  contains "some"
*ome    ends with "ome"
som*    starts with "som"
```

Without `*`, searches use case-insensitive contains matching. Wildcards are available in global people search, directory fields, scheduled visits and their individual columns, locator, alarms, activity, policies, and other searchable records.

## Facility and access decisions

The simulated DC-01 facility contains 81 modeled zones, including 62 customer cages:

```text
Hall A: 11000, 11010, 11020, ... 11290, 11300  (31 cages)
Hall B: 22000, 22010, 22020, ... 22290, 22300  (31 cages)
```

The primary people route places the Main Entrance Mantrap immediately after the Main Entrance. The logistics route places the Loading Dock Mantrap between the Loading Dock and Receiving & Staging.

Access is profile-driven rather than role-driven. A simulated credential presentation follows a default-deny policy:

1. Confirm that the person and destination exist and are active.
2. Find active assignments inside their validity windows.
3. Grant when an assigned profile permits the selected zone.
4. Deny otherwise with a specific reason code.
5. Persist the decision as an access event.

Revocation soft-disables an assignment instead of deleting historical evidence.

## Display and responsive behavior

- Light and dark themes
- Small, comfortable, and large text sizes
- Compact and comfortable information density
- Configurable overview widgets
- Persistent device-local display preferences
- Desktop sidebar with independent scrolling
- Fixed bottom main-area taskbar
- Compact two-row navigation on mobile

Identity, access, visit, alarm, and check-in records remain in D1; only display preferences are stored in the browser.

## Technology

- React 19 and TypeScript
- vinext/Vite application runtime
- Cloudflare Workers-compatible server output
- Cloudflare D1 persistence
- Drizzle schema and migrations
- Next-compatible routing and API handlers

## Run locally

Requirements: Node.js `22.13.0` or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm test
npm run lint
npx tsc --noEmit
npm run db:generate
```

## Data model

The D1 schema separates identity, authorization, operations, and history:

- `organizations` — operators, customers, and network/service providers
- `people` — identity, contact, organization, PIN, credential reference, and status
- `zones` — controlled facility spaces
- `access_profiles` — reusable policy intent
- `profile_zone_rules` — allowed zones for each profile
- `access_assignments` — time-bounded profile grants and soft revocation
- `access_events` — immutable simulated grants and denials
- `alarms` — alarm type, severity, person/actor, zone, source, status, and time
- `scheduled_visits` — temporary visit scope, valid window, deliveries, and sign-in state
- `site_check_ins` — pending, on-site, rejected, and signed-out presence records

Database initialization is idempotent and the repository includes generated Drizzle migrations for deployment.

## Repository notes

- [CAPABILITIES.md](./CAPABILITIES.md) is the detailed facility and decision-logic ledger.
- The original Python sketch is retained unchanged in `work/original/` as a record of the project’s starting point.
