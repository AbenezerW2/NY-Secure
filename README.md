# NY-Secure Physical Security

NY-Secure is an enterprise physical-security simulator designed to make a colocation facility understandable through clear, explainable access control. It models tenants, people, credentials, mantraps, cage inventories, reusable access profiles, time-bounded assignments, and an immutable badge-decision trail.

**Live private demo:** [NY-Secure Physical Security](https://atlas-dc-access-lab.abine26.chatgpt.site)

For the living record of implemented behavior and decision logic, see [CAPABILITIES.md](./CAPABILITIES.md).

The prototype intentionally does not communicate with real readers, controllers, doors, or identity systems. Every organization, person, badge number, and event is fictional.

## Included in this version

- NY-Secure branding with a white-and-blue visual system and a device-local light/dark theme preference
- Interactive DC-01 floor plan with a Main Entrance Mantrap, Loading Dock Mantrap, secure spine, UPS rooms, generator rooms, NOC, receiving, and supporting areas
- Complete 62-cage inventory: Hall A uses `11000` through `11300` and Hall B uses `22000` through `22300`, both in increments of 10
- Clickable People on site, Active credentials, Access granted, and Access denied summary cards with photo-backed detail logs
- Fictional HFT and network tenants including Citadel Securities, Two Sigma, Hudson River Trading, Jane Street, Lumen Technologies, Zayo, and Boldyn Networks
- Customer, contractor, engineer, vendor, visitor, and janitorial identities
- Organization and tenant directory
- Admin workflow to add people, assign profiles, and immediately revoke assignments
- Default-deny badge simulator with a plain-language decision path
- Persistent Cloudflare D1 records and access-event history
- Idempotent local seed data and a generated Drizzle migration
- Responsive desktop, tablet, and mobile layouts

## Facility numbering and secure paths

Hall cage identifiers are deterministic and inclusive:

```text
Hall A: 11000, 11010, 11020, ... 11290, 11300  (31 cages)
Hall B: 22000, 22010, 22020, ... 22290, 22300  (31 cages)
```

The primary people route places the Main Entrance Mantrap immediately after the Main Entrance. The logistics route places the Loading Dock Mantrap between the Loading Dock and Receiving & Staging. Access profiles include the relevant mantrap so the simulator evaluates each controlled transition explicitly.

## Dashboard logs and theme

Each overview summary card is an interactive tab into a focused log drawer:

- **People on site** shows active occupants, photos, organization, last verified area, and relationship type.
- **Active credentials** shows active badge holders, photos, badge identifiers, and credential status.
- **Access granted** shows successful access events with photos, zones, explanations, and timestamps.
- **Access denied** shows denied events with photos, reason context, zones, and timestamps.

The light/dark selector is a device-local display preference stored in the browser. Security identities, assignments, zones, and access events remain durable D1 records.

## Run locally

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm test
npm run db:generate
```

## Data model

The D1 schema separates identity from authorization:

- `organizations` own people and represent operators, customers, contractors, and vendors
- `zones` represent controlled facility spaces
- `people` hold operational identity and badge information
- `access_profiles` group reusable policy intent
- `profile_zone_rules` connect profiles to allowed zones
- `access_assignments` grant a profile to a person for a validity window
- `access_events` preserve every simulated grant or denial

Revoking access soft-disables the assignment rather than deleting historical evidence.

## Origin

The original Python sketch is retained unchanged in `work/original/` as a record of where the idea started.
