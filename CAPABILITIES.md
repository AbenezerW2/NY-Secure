# NY-Secure Capability Ledger

This file is the living system contract for NY-Secure. Update it whenever a capability is added, changed, or removed so someone reading the repository can understand what the security system actually knows how to do.

Legend:

- `IMPLEMENTED` — available in the current release
- `PARTIAL` — the data or interface exists, but enforcement is not complete
- `PLANNED` — intentionally reserved for a future release

## Release 0.2 — NY-Secure facility expansion

### Facility model — `IMPLEMENTED`

NY-Secure models an 81-zone canonical colocation environment containing two controlled mantraps and 62 customer cages:

```text
SITE NY-Secure DC-01
├── PERIMETER
│   └── Main Gate
├── COMMON / SECURITY
│   ├── Main Entrance
│   ├── Main Entrance Mantrap
│   ├── Security Lobby
│   └── Secure Spine
├── COLOCATION
│   ├── Colocation Hall A
│   │   └── Cages 11000–11300 in increments of 10 (31 cages)
│   └── Colocation Hall B
│       └── Cages 22000–22300 in increments of 10 (31 cages)
├── CRITICAL INFRASTRUCTURE
│   ├── UPS Room A
│   ├── UPS Room B
│   ├── East Generator Room
│   ├── West Generator Room
│   ├── Mechanical Plant
│   ├── Network Operations Center
│   └── Roof Access
└── LOGISTICS / SERVICE
    ├── Loading Dock
    ├── Loading Dock Mantrap
    ├── Receiving & Staging
    ├── Break Room
    └── Janitorial Supply Room
```

Each zone has a unique ID, category, location, security tier, operational status, and description.

### Organizations and colocation tenants — `IMPLEMENTED`

NY-Secure separates organizations from people. Current organization types include:

```text
DATA_CENTER_OPERATOR
COLOCATION_CUSTOMER
NETWORK_PROVIDER
```

Implemented fictional organization roster:

```text
NY-Secure              DATA_CENTER_OPERATOR
Citadel Securities     COLOCATION_CUSTOMER
Two Sigma               COLOCATION_CUSTOMER
Hudson River Trading    COLOCATION_CUSTOMER
Jane Street             COLOCATION_CUSTOMER
Lumen Technologies      NETWORK_PROVIDER
Zayo                    NETWORK_PROVIDER
Boldyn Networks         NETWORK_PROVIDER
```

The interface rotates the fictional HFT and network organizations across cage ownership labels for demonstration. The simulator does not claim real-world occupancy or customer relationships.

### People directory — `IMPLEMENTED`

The People tab is an identity/contact search database. It intentionally does not render a full roster before a query and does not expose badge, access-assignment, credential-status, or activity-log controls.

```text
SEARCH KEYS
first_name
last_name
OID
company

RESULT FIELDS
first_name
last_name
OID
company
phone_number
work_email
record_type
```

OID currently uses a stable human-readable value derived from the organization slug, such as `OID-CITADEL-SECURITIES`. A dedicated OID data model is reserved for the later organization-management phase.

Identity and authorization are deliberately separate:

```text
person.role DOES NOT automatically grant access
person + active_access_assignment + matching_zone_rule = possible access
```

Administrators can add a person with:

```text
first_name
last_name
work_email
phone_number
organization
record_type = CUSTOMER | INTERNAL_EMPLOYEE
job_function = required only for INTERNAL_EMPLOYEE
```

Internal employee job-function choices are Engineer, Technician, Facilities, Operations, and Other. Customer records do not have a job function. Security and Janitor are not selectable.

Visitor, contractor, and vendor creation is intentionally unavailable from this directory. These external records will be sourced from a separate ticket-intake workflow in a future phase.

The API retains a private unique directory reference to satisfy the existing simulator data model, but the People interface neither labels nor exposes it as a badge. Badge access and badge activity administration belong in a separate surface.

Legacy simulator seeds still include external identities so existing access-decision scenarios remain testable; this does not make those identity types creatable in the People form.

### Credentials — `IMPLEMENTED`

```text
ON person_created:
    badge_number = role_prefix + random_unique_identifier
    person_status = ACTIVE
    effective_access = NONE
```

The interface displays badge number and active/suspended state. All badge identifiers and people in the demo are fictional.

### Access profiles — `IMPLEMENTED`

Reusable profiles currently include:

```text
Customer · Cage 11000
Contractor · Facilities Maintenance
Engineer · Critical Infrastructure
Vendor · Delivery Route
Visitor · Escorted Common Areas
Janitorial · Common Areas
```

Each profile connects to one or more allowed facility zones. Profiles are assigned to people; they are not inherited from job titles.

Examples:

```text
PROFILE Customer · Cage 11000
ALLOW Main Gate, Main Entrance, Main Entrance Mantrap, Security Lobby
ALLOW Secure Spine, Colocation Hall A, Cage 11000, Break Room
DENY  Other customer cages, UPS, Generators, NOC

PROFILE Vendor · Delivery Route
ALLOW Main Gate, Main Entrance, Main Entrance Mantrap, Security Lobby
ALLOW Loading Dock, Loading Dock Mantrap, Receiving
DENY  Customer Cages, UPS, Generators, NOC
```

### Access assignment and revocation — `IMPLEMENTED`

Administrators can grant and remove a person's access without deleting historical records.

```text
ASSIGN_ACCESS(person, profile, expiration, reason):
    require person.status == ACTIVE
    require profile.status == ACTIVE
    reject duplicate active assignment
    create time-bounded assignment
    make assignment effective immediately

REVOKE_ACCESS(assignment, reason):
    assignment.active = FALSE
    assignment.revoked_at = NOW
    assignment.revoked_reason = reason
    preserve assignment for audit history
```

### Explainable access-decision engine — `IMPLEMENTED`

Every simulated badge presentation follows a default-deny policy:

```text
PRESENT_CREDENTIAL(person, zone, time):
    if person does not exist:
        DENY PERSON_NOT_FOUND

    if person is inactive:
        DENY PERSON_INACTIVE

    if zone is inactive:
        DENY ZONE_INACTIVE

    assignments = active assignments for person at time

    if assignments is empty:
        DENY NO_ACTIVE_ASSIGNMENT

    if any assignment.profile allows zone:
        GRANT PROFILE_RULE_MATCH

    otherwise:
        DENY ZONE_NOT_PERMITTED

    ALWAYS write decision to access event history
```

The operator sees the identity, credential, matching policy, assignment window, result, reason code, and plain-language explanation.

### Audit and activity history — `IMPLEMENTED`

Each simulated decision records:

```text
event_id
person_id
zone_id
matched_assignment_id or null
matched_profile_id or null
decision = GRANTED | DENIED
reason_code
plain_language_explanation
timestamp
```

Access revocation is a soft revocation. NY-Secure preserves assignments and events instead of deleting security history.

### Secure mantrap routing — `IMPLEMENTED`

The facility model makes both secure transitions explicit:

```text
PEOPLE ROUTE
Main Entrance → Main Entrance Mantrap → Security Lobby → permitted destination

LOGISTICS ROUTE
Loading Dock → Loading Dock Mantrap → Receiving & Staging → permitted destination
```

The customer, contractor, vendor, visitor, and janitorial profiles include the Main Entrance Mantrap where their route requires it. Contractor, vendor, and full-facility engineer access include the Loading Dock Mantrap. A mantrap decision is evaluated and recorded using the same default-deny rules as every other controlled zone.

### Overview drill-down logs — `IMPLEMENTED`

The four overview summary cards are buttons that open focused, photo-backed log drawers:

```text
People on site      → active occupants, organization, last verified area
Active credentials → badge holder, organization, badge ID, credential state
Access granted     → granted events, zone, explanation, timestamp
Access denied      → denied events, zone, reason context, timestamp
```

These views derive their identities and event details from the current simulator state. The portraits are visual demo assets and are not biometric records.

### Visual theme — `IMPLEMENTED`

NY-Secure uses a white-and-cobalt-blue light theme and a fully surfaced navy dark theme. Display settings provide small, comfortable, and large text sizes plus compact and comfortable data density. Preferences are stored in browser storage and do not move identities, assignments, zones, or event history out of D1.

### Configurable overview — `IMPLEMENTED`

The overview begins as a blank canvas. An operator can independently enable:

```text
Security summary
Facility map
Recent activity
Needs attention
On-site roster
```

Any combination is supported, including no widgets. The choice is device-local and can be changed from the overview action or global settings menu.

### Simplified activity history — `IMPLEMENTED`

The activity page uses a five-field visual model:

```text
Time  = 24-hour local clock time
Who   = person or presented credential
What  = access granted or access denied, plus reason
Where = controlled zone and reader
When  = calendar date and relative age
```

Organization and event ID are intentionally omitted from the visual activity table. Search, decision and location filters, responsive cards, and CSV export follow the same field model. The underlying immutable event record still retains its full relational IDs.

### Operations interface — `IMPLEMENTED`

```text
Overview dashboard
Blank-canvas widget customization
Clickable photo-backed summary logs
Live facility map
Light/dark theme switcher
Adjustable text size and layout density
Search-first People identity/contact directory
Organization and tenant directory
Access policy catalog
Facility hierarchy and zone inspector
Badge-presentation simulator
Activity log
Five-field, 24-hour activity presentation
Responsive desktop, tablet, and mobile layouts
```

The product is explicitly marked as a simulation and does not communicate with physical readers, panels, locks, or doors.

## Enforcement still to add

### Scheduled profile enforcement — `PARTIAL`

The UI communicates schedule intent such as `24×7`, `delivery hours`, `visit window`, and `night cleaning`. Assignment start and expiration times are enforced. Recurring weekday/time windows and holiday exceptions are not yet enforced by the decision engine.

### Visitor escort enforcement — `PARTIAL`

The escorted visitor profile and visitor identity type exist. NY-Secure does not yet require a checked-in authorized escort at decision time.

## Planned capability queue

```text
PLANNED administrator authentication and role-based permissions
PLANNED separate badge-access administration surface
PLANNED ticket-sourced external identity intake
PLANNED reader, door, and controller inventory
PLANNED recurring schedules and holiday exceptions
PLANNED visitor sponsors, check-in, check-out, and escort validation
PLANNED badge suspension, loss reporting, and replacement workflow
PLANNED approval workflow and ticket references
PLANNED anti-passback and occupancy awareness
PLANNED two-person rule for high-security spaces
PLANNED alerts for forced, held, offline, and tampered doors
PLANNED immutable administrative change log
PLANNED CSV reporting and compliance exports
PLANNED integration boundary for real access-control hardware
```

## Update template

Add new capability entries in this format:

```text
### Capability name — IMPLEMENTED | PARTIAL | PLANNED

USER VALUE:
    What problem does this solve?

BEHAVIOR:
    WHEN <event>
    IF <condition>
    THEN <result>
    ALWAYS <audit or safety behavior>

DATA:
    Records created or changed

LIMITS:
    What is intentionally not handled yet?
```
