# Atlas Capability Ledger

This file is the living system contract for Atlas. Update it whenever a capability is added, changed, or removed so someone reading the repository can understand what the security system actually knows how to do.

Legend:

- `IMPLEMENTED` — available in the current release
- `PARTIAL` — the data or interface exists, but enforcement is not complete
- `PLANNED` — intentionally reserved for a future release

## Release 0.1 — Colocation access-control foundation

### Facility model — `IMPLEMENTED`

Atlas models a 22-zone colocation environment containing:

```text
SITE Atlas DC-01
├── PERIMETER
│   └── Main Gate
├── COMMON / SECURITY
│   ├── Main Entrance
│   ├── Security Lobby
│   ├── Data Hall Mantrap
│   └── Secure Spine
├── COLOCATION
│   ├── Colocation Hall A
│   │   ├── Customer Cage 111 → Northstar Analytics
│   │   └── Customer Cage 112 → Lumina Commerce
│   └── Colocation Hall B
│       ├── Customer Cage 113 → Redwood Biotech
│       └── Customer Cage 114 → Available
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
    ├── Receiving & Staging
    ├── Break Room
    └── Janitorial Supply Room
```

Each zone has a unique ID, category, location, security tier, operational status, and description.

### Organizations and colocation tenants — `IMPLEMENTED`

Atlas separates organizations from people. Current organization types include:

```text
DATA_CENTER_OPERATOR
COLOCATION_CUSTOMER
CONTRACTOR
VENDOR
SERVICE_PROVIDER
```

Implemented tenant examples:

```text
Northstar Analytics  OWNS Cage 111
Lumina Commerce      OWNS Cage 112
Redwood Biotech      OWNS Cage 113
Cage 114             IS available
```

### People and operational roles — `IMPLEMENTED`

Supported relationship types:

```text
CUSTOMER
CONTRACTOR
ENGINEER
VENDOR
VISITOR
JANITOR
```

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
organization
relationship_type
job_function
```

New people receive a generated simulated badge but begin with no access. Default deny applies until an administrator assigns an access profile.

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
Customer · Cage 111
Contractor · Facilities Maintenance
Engineer · Critical Infrastructure
Vendor · Delivery Route
Visitor · Escorted Common Areas
Janitorial · Common Areas
```

Each profile connects to one or more allowed facility zones. Profiles are assigned to people; they are not inherited from job titles.

Examples:

```text
PROFILE Customer · Cage 111
ALLOW Main Gate, Main Entrance, Security Lobby, Mantrap
ALLOW Secure Spine, Colocation Hall A, Cage 111, Break Room
DENY  Cage 112, Cage 113, Cage 114, UPS, Generators, NOC

PROFILE Vendor · Delivery Route
ALLOW Main Gate, Main Entrance, Security Lobby, Loading Dock, Receiving
DENY  Mantrap, Customer Cages, UPS, Generators, NOC
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

Access revocation is a soft revocation. Atlas preserves assignments and events instead of deleting security history.

### Operations interface — `IMPLEMENTED`

```text
Overview dashboard
Live facility map
People and credential directory
Organization and tenant directory
Access policy catalog
Facility hierarchy and zone inspector
Badge-presentation simulator
Activity log
Responsive desktop, tablet, and mobile layouts
```

The product is explicitly marked as a simulation and does not communicate with physical readers, panels, locks, or doors.

## Enforcement still to add

### Scheduled profile enforcement — `PARTIAL`

The UI communicates schedule intent such as `24×7`, `delivery hours`, `visit window`, and `night cleaning`. Assignment start and expiration times are enforced. Recurring weekday/time windows and holiday exceptions are not yet enforced by the decision engine.

### Visitor escort enforcement — `PARTIAL`

The escorted visitor profile and visitor identity type exist. Atlas does not yet require a checked-in authorized escort at decision time.

## Planned capability queue

```text
PLANNED administrator authentication and role-based permissions
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
