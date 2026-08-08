# NY-Secure Physical Security

NY-Secure is an enterprise physical-security simulator designed to make a colocation facility understandable through clear, explainable access control. It models tenants, people, credentials, mantraps, cage inventories, reusable access profiles, time-bounded assignments, and an immutable badge-decision trail.

The live private demo is published through OpenAI Sites.

For the living record of implemented behavior and decision logic, see [CAPABILITIES.md](./CAPABILITIES.md).

The prototype intentionally does not communicate with real readers, controllers, doors, or identity systems. Every organization, person, badge number, and event is fictional.

## Included in this version

- Interactive DC-01 floor plan with cages 111–114, secure entry, mantrap, UPS rooms, generator rooms, NOC, loading dock, receiving, and supporting areas
- Customer, contractor, engineer, vendor, visitor, and janitorial identities
- Organization and tenant directory
- Admin workflow to add people, assign profiles, and immediately revoke assignments
- Default-deny badge simulator with a plain-language decision path
- Persistent Cloudflare D1 records and access-event history
- Idempotent local seed data and a generated Drizzle migration
- Responsive desktop, tablet, and mobile layouts

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
