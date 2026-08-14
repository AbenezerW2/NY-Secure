import { env } from "cloudflare:workers";

type OrganizationSeed = {
  id: string;
  slug: string;
  name: string;
  type: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
};

type ZoneSeed = {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  securityTier: number;
  description: string;
  sortOrder: number;
};

type PersonSeed = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  ibxAccessPin: string;
  organizationId: string;
  relationshipType: string;
  jobFunction: string;
  badgeNumber: string;
};

type ProfileSeed = {
  id: string;
  key: string;
  name: string;
  description: string;
  relationshipType: string;
  zoneIds: string[];
};

const organizations: OrganizationSeed[] = [
  {
    id: "org-ny-secure",
    slug: "ny-secure",
    name: "NY-Secure",
    type: "DATA_CENTER_OPERATOR",
    contactEmail: "security@ny-secure.example",
    contactName: "Maya Brooks",
    contactPhone: "+1 212 555 0200",
  },
  {
    id: "org-northstar",
    slug: "citadel-securities",
    name: "Citadel Securities",
    type: "COLOCATION_CUSTOMER",
    contactEmail: "facilities@citadel-securities.example",
    contactName: "Jordan Lee",
    contactPhone: "+1 212 555 0201",
  },
  {
    id: "org-lumina",
    slug: "two-sigma",
    name: "Two Sigma",
    type: "COLOCATION_CUSTOMER",
    contactEmail: "infrastructure@two-sigma.example",
    contactName: "Priya Shah",
    contactPhone: "+1 212 555 0202",
  },
  {
    id: "org-redwood",
    slug: "hudson-river-trading",
    name: "Hudson River Trading",
    type: "COLOCATION_CUSTOMER",
    contactEmail: "datacenter@hudson-river-trading.example",
    contactName: "Daniel Kim",
    contactPhone: "+1 212 555 0203",
  },
  {
    id: "org-apex",
    slug: "jane-street",
    name: "Jane Street",
    type: "COLOCATION_CUSTOMER",
    contactEmail: "facilities@jane-street.example",
    contactName: "Morgan Chen",
    contactPhone: "+1 212 555 0204",
  },
  {
    id: "org-meridian",
    slug: "lumen-technologies",
    name: "Lumen Technologies",
    type: "NETWORK_PROVIDER",
    contactEmail: "field-service@lumen.example",
    contactName: "Alex Rivera",
    contactPhone: "+1 212 555 0205",
  },
  {
    id: "org-brightway",
    slug: "zayo",
    name: "Zayo",
    type: "NETWORK_PROVIDER",
    contactEmail: "operations@zayo.example",
    contactName: "Taylor Morgan",
    contactPhone: "+1 212 555 0206",
  },
  {
    id: "org-boldyn",
    slug: "boldyn-networks",
    name: "Boldyn Networks",
    type: "NETWORK_PROVIDER",
    contactEmail: "operations@boldyn.example",
    contactName: "Casey Williams",
    contactPhone: "+1 212 555 0207",
  },
];

const zones: ZoneSeed[] = [
  {
    id: "zone-main-gate",
    code: "PER-GATE-01",
    name: "Main Gate",
    category: "PERIMETER",
    location: "South perimeter",
    securityTier: 1,
    description: "Primary vehicle checkpoint and guard post.",
    sortOrder: 10,
  },
  {
    id: "zone-main-entrance",
    code: "COM-ENT-01",
    name: "Main Entrance",
    category: "COMMON",
    location: "Building 1 · Level 1",
    securityTier: 1,
    description: "Badge-controlled public entrance.",
    sortOrder: 20,
  },
  {
    id: "zone-entrance-mantrap",
    code: "SEC-MAN-ENT",
    name: "Main Entrance Mantrap",
    category: "SECURITY",
    location: "Building 1 · Level 1",
    securityTier: 4,
    description: "Interlocked two-door identity checkpoint immediately after the main entrance.",
    sortOrder: 25,
  },
  {
    id: "zone-security-lobby",
    code: "COM-LOB-01",
    name: "Security Lobby",
    category: "COMMON",
    location: "Building 1 · Level 1",
    securityTier: 2,
    description: "Reception, badging, and visitor processing area.",
    sortOrder: 30,
  },
  {
    id: "zone-secure-spine",
    code: "SEC-SPINE-01",
    name: "Secure Spine",
    category: "SECURITY",
    location: "Building 1 · Level 1",
    securityTier: 3,
    description: "Controlled circulation corridor connecting secure facility zones.",
    sortOrder: 50,
  },
  {
    id: "zone-colo-hall-a",
    code: "COLO-HALL-A",
    name: "Colocation Hall A",
    category: "CUSTOMER_HALL",
    location: "Building 1 · Level 1",
    securityTier: 3,
    description: "Tenant hall containing cages 11000 through 11300.",
    sortOrder: 60,
  },
  {
    id: "zone-colo-hall-b",
    code: "COLO-HALL-B",
    name: "Colocation Hall B",
    category: "CUSTOMER_HALL",
    location: "Building 1 · Level 1",
    securityTier: 3,
    description: "Tenant hall containing cages 22000 through 22300.",
    sortOrder: 70,
  },
  ...Array.from({ length: 31 }, (_, index): ZoneSeed => {
    const cage = 11000 + index * 10;
    return { id: `zone-cage-${cage}`, code: `CAGE-${cage}`, name: `Cage ${cage}`, category: "CUSTOMER_CAGE", location: "Hall A", securityTier: 4, description: `Dedicated Hall A colocation cage ${cage}.`, sortOrder: 1000 + index };
  }),
  ...Array.from({ length: 31 }, (_, index): ZoneSeed => {
    const cage = 22000 + index * 10;
    return { id: `zone-cage-${cage}`, code: `CAGE-${cage}`, name: `Cage ${cage}`, category: "CUSTOMER_CAGE", location: "Hall B", securityTier: 4, description: `Dedicated Hall B colocation cage ${cage}.`, sortOrder: 2000 + index };
  }),
  {
    id: "zone-ups-a",
    code: "ELEC-UPS-A",
    name: "UPS Room A",
    category: "CRITICAL_INFRASTRUCTURE",
    location: "Central utility spine",
    securityTier: 5,
    description: "A-side uninterruptible power systems and batteries.",
    sortOrder: 200,
  },
  {
    id: "zone-ups-b",
    code: "ELEC-UPS-B",
    name: "UPS Room B",
    category: "CRITICAL_INFRASTRUCTURE",
    location: "Central utility spine",
    securityTier: 5,
    description: "B-side uninterruptible power systems and batteries.",
    sortOrder: 210,
  },
  {
    id: "zone-generator-east",
    code: "ELEC-GEN-E",
    name: "East Generator Room",
    category: "CRITICAL_INFRASTRUCTURE",
    location: "East utility yard",
    securityTier: 5,
    description: "East standby generators and transfer equipment.",
    sortOrder: 220,
  },
  {
    id: "zone-generator-west",
    code: "ELEC-GEN-W",
    name: "West Generator Room",
    category: "CRITICAL_INFRASTRUCTURE",
    location: "West utility yard",
    securityTier: 5,
    description: "West standby generators and transfer equipment.",
    sortOrder: 230,
  },
  {
    id: "zone-loading-dock",
    code: "LOG-DOCK-01",
    name: "Loading Dock",
    category: "LOGISTICS",
    location: "Building 1 · West",
    securityTier: 2,
    description: "Controlled freight delivery and pickup point.",
    sortOrder: 300,
  },
  {
    id: "zone-loading-mantrap",
    code: "SEC-MAN-DOCK",
    name: "Loading Dock Mantrap",
    category: "SECURITY",
    location: "Building 1 · West",
    securityTier: 4,
    description: "Interlocked screening checkpoint between the loading dock and receiving.",
    sortOrder: 305,
  },
  {
    id: "zone-receiving",
    code: "LOG-RECV-01",
    name: "Receiving & Staging",
    category: "LOGISTICS",
    location: "Building 1 · West",
    securityTier: 2,
    description: "Inspection and short-term staging for deliveries.",
    sortOrder: 310,
  },
  {
    id: "zone-mechanical",
    code: "MECH-PLANT-01",
    name: "Mechanical Plant",
    category: "CRITICAL_INFRASTRUCTURE",
    location: "Building 1 · Level 1",
    securityTier: 4,
    description: "Cooling distribution and mechanical controls.",
    sortOrder: 400,
  },
  {
    id: "zone-noc",
    code: "OPS-NOC-01",
    name: "Network Operations Center",
    category: "OPERATIONS",
    location: "Building 1 · Level 2",
    securityTier: 4,
    description: "Twenty-four-hour operational command center.",
    sortOrder: 410,
  },
  {
    id: "zone-roof",
    code: "MECH-ROOF-01",
    name: "Roof Access",
    category: "CRITICAL_INFRASTRUCTURE",
    location: "Building 1 · Roof",
    securityTier: 4,
    description: "Restricted access to rooftop cooling equipment.",
    sortOrder: 420,
  },
  {
    id: "zone-break-room",
    code: "COM-BRK-01",
    name: "Break Room",
    category: "COMMON",
    location: "Building 1 · Level 1",
    securityTier: 1,
    description: "Shared customer and staff amenity space.",
    sortOrder: 500,
  },
  {
    id: "zone-janitor-closet",
    code: "SVC-JAN-01",
    name: "Janitorial Supply Room",
    category: "SERVICE",
    location: "Building 1 · Level 1",
    securityTier: 2,
    description: "Secured custodial supplies and equipment.",
    sortOrder: 510,
  },
];

const profiles: ProfileSeed[] = [
  {
    id: "profile-customer-cage-111",
    key: "customer-cage-11000",
    name: "Customer · Cage 11000",
    description: "Common-area path and Cage 11000 access for a colocated customer.",
    relationshipType: "CUSTOMER",
    zoneIds: [
      "zone-main-gate",
      "zone-main-entrance",
      "zone-entrance-mantrap",
      "zone-security-lobby",
      "zone-secure-spine",
      "zone-colo-hall-a",
      "zone-cage-11000",
      "zone-break-room",
    ],
  },
  {
    id: "profile-contractor-facilities",
    key: "contractor-facilities",
    name: "Contractor · Facilities Maintenance",
    description: "Service route to power, cooling, receiving, and staging areas.",
    relationshipType: "CONTRACTOR",
    zoneIds: [
      "zone-main-gate",
      "zone-main-entrance",
      "zone-entrance-mantrap",
      "zone-security-lobby",
      "zone-secure-spine",
      "zone-ups-a",
      "zone-ups-b",
      "zone-loading-dock",
      "zone-loading-mantrap",
      "zone-receiving",
      "zone-mechanical",
      "zone-break-room",
    ],
  },
  {
    id: "profile-engineer-critical",
    key: "engineer-critical-infrastructure",
    name: "Engineer · Critical Infrastructure",
    description: "Full facility operations access for an NY-Secure duty engineer.",
    relationshipType: "ENGINEER",
    zoneIds: zones.map((zone) => zone.id),
  },
  {
    id: "profile-vendor-delivery",
    key: "vendor-delivery",
    name: "Vendor · Delivery Route",
    description: "Perimeter, lobby, loading dock, and receiving access.",
    relationshipType: "VENDOR",
    zoneIds: [
      "zone-main-gate",
      "zone-main-entrance",
      "zone-entrance-mantrap",
      "zone-security-lobby",
      "zone-loading-dock",
      "zone-loading-mantrap",
      "zone-receiving",
    ],
  },
  {
    id: "profile-visitor-escorted",
    key: "visitor-escorted",
    name: "Visitor · Escorted Common Areas",
    description: "Short-duration access to reception and common amenity areas.",
    relationshipType: "VISITOR",
    zoneIds: [
      "zone-main-entrance",
      "zone-entrance-mantrap",
      "zone-security-lobby",
      "zone-break-room",
    ],
  },
  {
    id: "profile-janitorial-common",
    key: "janitorial-common-areas",
    name: "Janitorial · Common Areas",
    description: "Common-area and custodial supply-room access.",
    relationshipType: "JANITOR",
    zoneIds: [
      "zone-main-entrance",
      "zone-entrance-mantrap",
      "zone-security-lobby",
      "zone-break-room",
      "zone-janitor-closet",
    ],
  },
];

const people: PersonSeed[] = [
  {
    id: "person-amara-okafor",
    firstName: "Amara",
    lastName: "Okafor",
    email: "amara.okafor@ny-secure.example",
    phoneNumber: "+1 212 555 0101",
    ibxAccessPin: "000001",
    organizationId: "org-ny-secure",
    relationshipType: "ENGINEER",
    jobFunction: "Critical Facilities Engineer",
    badgeNumber: "ATL-2041",
  },
  {
    id: "person-eli-mercer",
    firstName: "Eli",
    lastName: "Mercer",
    email: "eli.mercer@citadel-securities.example",
    phoneNumber: "+1 212 555 0102",
    ibxAccessPin: "000002",
    organizationId: "org-northstar",
    relationshipType: "CUSTOMER",
    jobFunction: "Infrastructure Lead",
    badgeNumber: "NS-1117",
  },
  {
    id: "person-sofia-reyes",
    firstName: "Sofia",
    lastName: "Reyes",
    email: "sofia.reyes@jane-street.example",
    phoneNumber: "+1 212 555 0103",
    ibxAccessPin: "000003",
    organizationId: "org-apex",
    relationshipType: "CONTRACTOR",
    jobFunction: "HVAC Technician",
    badgeNumber: "APX-4932",
  },
  {
    id: "person-noah-patel",
    firstName: "Noah",
    lastName: "Patel",
    email: "noah.patel@lumen.example",
    phoneNumber: "+1 212 555 0104",
    ibxAccessPin: "000004",
    organizationId: "org-meridian",
    relationshipType: "VENDOR",
    jobFunction: "Field Service Representative",
    badgeNumber: "MPS-7834",
  },
  {
    id: "person-lena-park",
    firstName: "Lena",
    lastName: "Park",
    email: "lena.park@citadel-securities.example",
    phoneNumber: "+1 212 555 0105",
    ibxAccessPin: "000005",
    organizationId: "org-northstar",
    relationshipType: "VISITOR",
    jobFunction: "Audit Visitor",
    badgeNumber: "VIS-0208",
  },
  {
    id: "person-caleb-johnson",
    firstName: "Caleb",
    lastName: "Johnson",
    email: "caleb.johnson@zayo.example",
    phoneNumber: "+1 212 555 0106",
    ibxAccessPin: "000006",
    organizationId: "org-brightway",
    relationshipType: "JANITOR",
    jobFunction: "Custodial Technician",
    badgeNumber: "BFC-6119",
  },
];

const assignments = [
  ["assignment-amara-engineer", "person-amara-okafor", "profile-engineer-critical", "NY-Secure duty engineer access"],
  ["assignment-eli-cage-111", "person-eli-mercer", "profile-customer-cage-111", "Citadel Cage 11000 authorization"],
  ["assignment-sofia-facilities", "person-sofia-reyes", "profile-contractor-facilities", "Preventive maintenance service window"],
  ["assignment-noah-delivery", "person-noah-patel", "profile-vendor-delivery", "Approved delivery and receiving route"],
  ["assignment-lena-visitor", "person-lena-park", "profile-visitor-escorted", "Quarterly controls audit visit"],
  ["assignment-caleb-janitorial", "person-caleb-johnson", "profile-janitorial-common", "Scheduled common-area custodial services"],
] as const;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    organization_type TEXT NOT NULL,
    contact_email TEXT,
    contact_name TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    security_tier INTEGER NOT NULL DEFAULT 1 CHECK (security_tier BETWEEN 1 AND 5),
    description TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL DEFAULT '',
    ibx_access_pin TEXT NOT NULL DEFAULT '',
    credit_hold INTEGER NOT NULL DEFAULT 0 CHECK (credit_hold IN (0, 1)),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('CUSTOMER', 'CONTRACTOR', 'ENGINEER', 'VENDOR', 'VISITOR', 'JANITOR')),
    job_function TEXT NOT NULL,
    badge_number TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS access_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    profile_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('CUSTOMER', 'CONTRACTOR', 'ENGINEER', 'VENDOR', 'VISITOR', 'JANITOR')),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS profile_zone_rules (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES access_profiles(id) ON DELETE CASCADE,
    zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'ALLOW' CHECK (permission IN ('ALLOW')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (profile_id, zone_id)
  )`,
  `CREATE TABLE IF NOT EXISTS access_assignments (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL REFERENCES people(id),
    profile_id TEXT NOT NULL REFERENCES access_profiles(id),
    valid_from TEXT NOT NULL,
    valid_until TEXT,
    reason TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    revoked_at TEXT,
    revoked_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_until IS NULL OR datetime(valid_until) > datetime(valid_from))
  )`,
  `CREATE TABLE IF NOT EXISTS access_events (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL REFERENCES people(id),
    zone_id TEXT NOT NULL REFERENCES zones(id),
    assignment_id TEXT REFERENCES access_assignments(id),
    profile_id TEXT REFERENCES access_profiles(id),
    decision TEXT NOT NULL CHECK (decision IN ('GRANTED', 'DENIED')),
    reason_code TEXT NOT NULL,
    explanation TEXT NOT NULL,
    attempted_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS alarms (
    id TEXT PRIMARY KEY NOT NULL,
    alarm_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    person_id TEXT REFERENCES people(id),
    actor_label TEXT NOT NULL DEFAULT 'System',
    zone_id TEXT NOT NULL REFERENCES zones(id),
    source TEXT NOT NULL DEFAULT 'Access control',
    detail TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'CLEARED')),
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS door_controls (
    zone_id TEXT PRIMARY KEY NOT NULL REFERENCES zones(id),
    mode TEXT NOT NULL DEFAULT 'NORMAL' CHECK (mode IN ('NORMAL', 'UNLOCKED', 'LOCKED')),
    granted_person_id TEXT REFERENCES people(id),
    grant_expires_at TEXT,
    updated_by TEXT NOT NULL DEFAULT 'Maya Brooks',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS door_control_events (
    id TEXT PRIMARY KEY NOT NULL,
    zone_id TEXT NOT NULL REFERENCES zones(id),
    person_id TEXT REFERENCES people(id),
    action TEXT NOT NULL CHECK (action IN ('UNLOCK', 'LOCK', 'NORMAL', 'GRANT_PERSON')),
    detail TEXT NOT NULL DEFAULT '',
    operator_name TEXT NOT NULL DEFAULT 'Maya Brooks',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS scheduled_visits (
    ticket_number TEXT PRIMARY KEY NOT NULL,
    site_code TEXT NOT NULL DEFAULT 'DC-01',
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    requester_name TEXT NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    visitor_phone TEXT,
    cage_zone_id TEXT NOT NULL REFERENCES zones(id),
    cabinet_access TEXT NOT NULL DEFAULT '[]',
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    comments TEXT NOT NULL DEFAULT '',
    allowed_hours TEXT NOT NULL DEFAULT '{}',
    has_delivery INTEGER NOT NULL DEFAULT 0 CHECK (has_delivery IN (0, 1)),
    package_count INTEGER NOT NULL DEFAULT 0 CHECK (package_count >= 0),
    package_details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CANCELLED')),
    signed_in_at TEXT,
    signed_out_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (datetime(valid_until) > datetime(valid_from))
  )`,
  `CREATE TABLE IF NOT EXISTS site_check_ins (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL REFERENCES people(id),
    source TEXT NOT NULL DEFAULT 'KIOSK' CHECK (source IN ('PORTAL', 'KIOSK')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ON_SITE', 'SIGNED_OUT', 'REJECTED')),
    requested_at TEXT NOT NULL,
    verified_at TEXT,
    verified_by TEXT,
    signed_out_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS idx_zones_category_active ON zones(category, active)",
  "CREATE INDEX IF NOT EXISTS idx_people_organization_active ON people(organization_id, active)",
  "CREATE INDEX IF NOT EXISTS idx_people_relationship_type ON people(relationship_type)",
  "CREATE INDEX IF NOT EXISTS idx_access_profiles_relationship_active ON access_profiles(relationship_type, active)",
  "CREATE INDEX IF NOT EXISTS idx_profile_zone_rules_zone_permission ON profile_zone_rules(zone_id, permission)",
  "CREATE INDEX IF NOT EXISTS idx_access_assignments_person_active ON access_assignments(person_id, active)",
  "CREATE INDEX IF NOT EXISTS idx_access_assignments_profile_active ON access_assignments(profile_id, active)",
  "CREATE INDEX IF NOT EXISTS idx_access_events_attempted_at ON access_events(attempted_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_access_events_person_attempted_at ON access_events(person_id, attempted_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_access_events_zone_attempted_at ON access_events(zone_id, attempted_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_access_events_decision_attempted_at ON access_events(decision, attempted_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_alarms_occurred_at ON alarms(occurred_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_alarms_type_status ON alarms(alarm_type, status)",
  "CREATE INDEX IF NOT EXISTS idx_alarms_zone_occurred_at ON alarms(zone_id, occurred_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_door_controls_mode ON door_controls(mode)",
  "CREATE INDEX IF NOT EXISTS idx_door_control_events_created_at ON door_control_events(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_door_control_events_zone_created_at ON door_control_events(zone_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_scheduled_visits_valid_from ON scheduled_visits(valid_from DESC)",
  "CREATE INDEX IF NOT EXISTS idx_scheduled_visits_organization_valid_from ON scheduled_visits(organization_id, valid_from DESC)",
  "CREATE INDEX IF NOT EXISTS idx_site_check_ins_status_requested_at ON site_check_ins(status, requested_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_site_check_ins_person_requested_at ON site_check_ins(person_id, requested_at DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_site_check_ins_person_open ON site_check_ins(person_id) WHERE status IN ('PENDING', 'ON_SITE')",
];

let initializationPromise: Promise<void> | undefined;

export function getDatabase(): D1Database {
  if (!env.DB) {
    throw new Error(
      "The NY-Secure database is unavailable because the D1 binding `DB` is not configured.",
    );
  }
  return env.DB;
}

async function createSchema(db: D1Database) {
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
}

async function seedDatabase(db: D1Database) {
  const now = new Date();
  const validFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const visitorValidUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const allHoursForRange = (start: Date, end: Date) => {
    const dates = new Set<string>();
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
    for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 60 * 60 * 1000) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(cursor)).map((part) => [part.type, part.value]));
      dates.add(`${parts.year}-${parts.month}-${parts.day}`);
    }
    const endParts = Object.fromEntries(formatter.formatToParts(end).map((part) => [part.type, part.value]));
    dates.add(`${endParts.year}-${endParts.month}-${endParts.day}`);
    return JSON.stringify(Object.fromEntries([...dates].map((date) => [date, Array.from({ length: 24 }, (_, hour) => hour)])));
  };

  // Release the unique slug before inserting the renamed operator record.
  // Existing installations can still have the former operator ID attached to
  // this slug, which otherwise makes the upsert below fail before the legacy
  // people records can be migrated.
  const legacyOperatorId = "org-atlas";
  await db
    .prepare(
      "UPDATE organizations SET slug = 'ny-secure-legacy', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND slug = 'ny-secure'",
    )
    .bind(legacyOperatorId)
    .run();

  await db.batch(
    organizations.map((organization) =>
      db
        .prepare(
          `INSERT INTO organizations
            (id, slug, name, organization_type, contact_email, contact_name, contact_phone)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             slug = excluded.slug, name = excluded.name,
             organization_type = excluded.organization_type,
             contact_email = excluded.contact_email,
             contact_name = excluded.contact_name,
             contact_phone = excluded.contact_phone,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          organization.id,
          organization.slug,
          organization.name,
          organization.type,
          organization.contactEmail,
          organization.contactName,
          organization.contactPhone,
        ),
    ),
  );

  // Preserve existing NY-Secure employee records created under the legacy operator ID.
  await db.batch([
    db.prepare(
      "UPDATE people SET organization_id = 'org-ny-secure', updated_at = CURRENT_TIMESTAMP WHERE organization_id = ?",
    ).bind(legacyOperatorId),
    db.prepare("DELETE FROM organizations WHERE id = ?").bind(legacyOperatorId),
  ]);

  await db.batch(
    zones.map((zone) =>
      db
        .prepare(
          `INSERT INTO zones
            (id, code, name, category, location, security_tier, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             code = excluded.code, name = excluded.name,
             category = excluded.category, location = excluded.location,
             security_tier = excluded.security_tier,
             description = excluded.description, sort_order = excluded.sort_order,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          zone.id,
          zone.code,
          zone.name,
          zone.category,
          zone.location,
          zone.securityTier,
          zone.description,
          zone.sortOrder,
        ),
    ),
  );

  await db.batch([
    db.prepare("UPDATE access_events SET zone_id = 'zone-cage-11000' WHERE zone_id = 'zone-cage-111'"),
    db.prepare("UPDATE access_events SET zone_id = 'zone-cage-11010' WHERE zone_id = 'zone-cage-112'"),
    db.prepare("UPDATE access_events SET zone_id = 'zone-cage-22000' WHERE zone_id = 'zone-cage-113'"),
    db.prepare("UPDATE access_events SET zone_id = 'zone-cage-22010' WHERE zone_id = 'zone-cage-114'"),
    db.prepare("UPDATE access_events SET zone_id = 'zone-entrance-mantrap' WHERE zone_id = 'zone-mantrap'"),
    db.prepare("DELETE FROM profile_zone_rules WHERE zone_id IN ('zone-cage-111', 'zone-cage-112', 'zone-cage-113', 'zone-cage-114', 'zone-mantrap')"),
    db.prepare("DELETE FROM zones WHERE id IN ('zone-cage-111', 'zone-cage-112', 'zone-cage-113', 'zone-cage-114', 'zone-mantrap')"),
  ]);

  await db.batch(
    profiles.map((profile) =>
      db
        .prepare(
          `INSERT INTO access_profiles
            (id, profile_key, name, description, relationship_type)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             profile_key = excluded.profile_key, name = excluded.name,
             description = excluded.description,
             relationship_type = excluded.relationship_type,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          profile.id,
          profile.key,
          profile.name,
          profile.description,
          profile.relationshipType,
        ),
    ),
  );

  const rules = profiles.flatMap((profile) =>
    profile.zoneIds.map((zoneId) => ({
      id: `rule-${profile.key}-${zoneId.replace("zone-", "")}`,
      profileId: profile.id,
      zoneId,
    })),
  );

  await db.batch(
    rules.map((rule) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO profile_zone_rules
            (id, profile_id, zone_id, permission)
           VALUES (?, ?, ?, 'ALLOW')`,
        )
        .bind(rule.id, rule.profileId, rule.zoneId),
    ),
  );

  await db.batch(
    people.map((person) =>
      db
        .prepare(
          `INSERT INTO people
            (id, first_name, last_name, email, phone_number, ibx_access_pin, organization_id, relationship_type, job_function, badge_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             first_name = excluded.first_name, last_name = excluded.last_name,
             email = excluded.email, phone_number = excluded.phone_number,
             ibx_access_pin = excluded.ibx_access_pin,
             organization_id = excluded.organization_id,
             relationship_type = excluded.relationship_type,
             job_function = excluded.job_function, badge_number = excluded.badge_number,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          person.id,
          person.firstName,
          person.lastName,
          person.email,
          person.phoneNumber,
          person.ibxAccessPin,
          person.organizationId,
          person.relationshipType,
          person.jobFunction,
          person.badgeNumber,
        ),
    ),
  );

  await db.batch(
    assignments.map(([id, personId, profileId, reason]) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO access_assignments
            (id, person_id, profile_id, valid_from, valid_until, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          personId,
          profileId,
          validFrom,
          id === "assignment-lena-visitor" ? visitorValidUntil : null,
          reason,
        ),
    ),
  );

  const seededEvents = [
    {
      id: "event-seed-001",
      personId: "person-eli-mercer",
      zoneId: "zone-cage-11000",
      assignmentId: "assignment-eli-cage-111",
      profileId: "profile-customer-cage-111",
      decision: "GRANTED",
      reasonCode: "PROFILE_RULE_MATCH",
      explanation: "Customer · Cage 11000 permits access to Cage 11000.",
      minutesAgo: 8,
    },
    {
      id: "event-seed-002",
      personId: "person-eli-mercer",
      zoneId: "zone-cage-11010",
      assignmentId: null,
      profileId: null,
      decision: "DENIED",
      reasonCode: "ZONE_NOT_PERMITTED",
      explanation: "Active access exists, but none of its profiles permits Cage 11010.",
      minutesAgo: 21,
    },
    {
      id: "event-seed-003",
      personId: "person-amara-okafor",
      zoneId: "zone-generator-west",
      assignmentId: "assignment-amara-engineer",
      profileId: "profile-engineer-critical",
      decision: "GRANTED",
      reasonCode: "PROFILE_RULE_MATCH",
      explanation: "Engineer · Critical Infrastructure permits access to West Generator Room.",
      minutesAgo: 37,
    },
    {
      id: "event-seed-004",
      personId: "person-sofia-reyes",
      zoneId: "zone-ups-a",
      assignmentId: "assignment-sofia-facilities",
      profileId: "profile-contractor-facilities",
      decision: "GRANTED",
      reasonCode: "PROFILE_RULE_MATCH",
      explanation: "Contractor · Facilities Maintenance permits access to UPS Room A.",
      minutesAgo: 54,
    },
    {
      id: "event-seed-005",
      personId: "person-noah-patel",
      zoneId: "zone-generator-east",
      assignmentId: null,
      profileId: null,
      decision: "DENIED",
      reasonCode: "ZONE_NOT_PERMITTED",
      explanation: "Active access exists, but none of its profiles permits East Generator Room.",
      minutesAgo: 76,
    },
    {
      id: "event-seed-006",
      personId: "person-caleb-johnson",
      zoneId: "zone-break-room",
      assignmentId: "assignment-caleb-janitorial",
      profileId: "profile-janitorial-common",
      decision: "GRANTED",
      reasonCode: "PROFILE_RULE_MATCH",
      explanation: "Janitorial · Common Areas permits access to Break Room.",
      minutesAgo: 95,
    },
  ];

  await db.batch(
    seededEvents.map((event) =>
      db
        .prepare(
          `INSERT INTO access_events
            (id, person_id, zone_id, assignment_id, profile_id, decision, reason_code, explanation, attempted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             person_id = excluded.person_id, zone_id = excluded.zone_id,
             assignment_id = excluded.assignment_id, profile_id = excluded.profile_id,
             decision = excluded.decision, reason_code = excluded.reason_code,
             explanation = excluded.explanation`,
        )
        .bind(
          event.id,
          event.personId,
          event.zoneId,
          event.assignmentId,
          event.profileId,
          event.decision,
          event.reasonCode,
          event.explanation,
          new Date(now.getTime() - event.minutesAgo * 60 * 1000).toISOString(),
        ),
    ),
  );

  const seededAlarms = [
    { id: "alarm-seed-001", type: "DOOR_HELD", severity: "HIGH", personId: "person-noah-patel", actor: "Noah Patel", zoneId: "zone-loading-dock", source: "Door contact LD-01", detail: "Loading Dock door remained open beyond the configured 30-second threshold.", status: "ACTIVE", minutesAgo: 4 },
    { id: "alarm-seed-002", type: "DOOR_FORCED", severity: "CRITICAL", personId: null, actor: "Unknown person", zoneId: "zone-roof", source: "Door contact RF-01", detail: "Roof access opened without a preceding valid credential read.", status: "ACTIVE", minutesAgo: 13 },
    { id: "alarm-seed-003", type: "UNKNOWN_CARD", severity: "MEDIUM", personId: null, actor: "Unknown credential", zoneId: "zone-main-entrance", source: "Reader EN-01", detail: "Card data could not be matched to an issued NY-Secure credential.", status: "ACKNOWLEDGED", minutesAgo: 28 },
    { id: "alarm-seed-004", type: "WRONG_DOOR", severity: "MEDIUM", personId: "person-eli-mercer", actor: "Eli Mercer", zoneId: "zone-cage-11010", source: "Reader C11010-01", detail: "The credential is active but has no permission for this door.", status: "ACTIVE", minutesAgo: 46 },
    { id: "alarm-seed-005", type: "WRONG_TIME", severity: "MEDIUM", personId: "person-caleb-johnson", actor: "Caleb Johnson", zoneId: "zone-janitor-closet", source: "Reader JC-01", detail: "Credential presented outside the assigned access schedule.", status: "CLEARED", minutesAgo: 68 },
    { id: "alarm-seed-006", type: "EXPIRED_CARD", severity: "HIGH", personId: "person-lena-park", actor: "Lena Park", zoneId: "zone-security-lobby", source: "Reader SL-02", detail: "The presented visitor credential is past its valid-until date.", status: "ACTIVE", minutesAgo: 91 },
    { id: "alarm-seed-007", type: "INCORRECT_TIME", severity: "LOW", personId: "person-sofia-reyes", actor: "Sofia Reyes", zoneId: "zone-ups-b", source: "Reader UPSB-01", detail: "Reader and controller timestamps differed beyond the allowed tolerance.", status: "ACKNOWLEDGED", minutesAgo: 126 },
    { id: "alarm-seed-008", type: "MONITORING_POINT_ALARM", severity: "HIGH", personId: null, actor: "Environmental monitoring", zoneId: "zone-generator-east", source: "Monitoring point GEN-E-07", detail: "Generator-room monitoring input changed to an alarm state.", status: "ACTIVE", minutesAgo: 173 },
    { id: "alarm-seed-009", type: "REPEATED_INVALID_SCAN", severity: "MEDIUM", personId: null, actor: "Unknown credential", zoneId: "zone-entrance-mantrap", source: "Reader MT-01", detail: "Five unreadable or incomplete credential scans occurred within two minutes.", status: "ACTIVE", minutesAgo: 214 },
  ] as const;

  await db.batch(
    seededAlarms.map((alarm) =>
      db
        .prepare(
          `INSERT INTO alarms
            (id, alarm_type, severity, person_id, actor_label, zone_id, source, detail, status, occurred_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             alarm_type = excluded.alarm_type, severity = excluded.severity,
             person_id = excluded.person_id, actor_label = excluded.actor_label,
             zone_id = excluded.zone_id, source = excluded.source,
             detail = excluded.detail, status = excluded.status`,
        )
        .bind(
          alarm.id,
          alarm.type,
          alarm.severity,
          alarm.personId,
          alarm.actor,
          alarm.zoneId,
          alarm.source,
          alarm.detail,
          alarm.status,
          new Date(now.getTime() - alarm.minutesAgo * 60 * 1000).toISOString(),
        ),
    ),
  );

  const seededVisits = [
    {
      ticketNumber: "01-482731",
      organizationId: "org-northstar",
      requesterName: "Jordan Lee · Customer NOC",
      visitorName: "Marcus Reed",
      visitorEmail: "marcus.reed@field-service.example",
      visitorPhone: "+1 917 555 0142",
      cageZoneId: "zone-cage-11000",
      cabinets: ["CAB-11001", "CAB-11002"],
      startsInMinutes: -30,
      durationMinutes: 240,
      comments: "Escort from the lobby to Cage 11000. Contact the Citadel NOC on arrival.",
      hasDelivery: 1,
      packageCount: 2,
      packageDetails: "Two sealed replacement network switches.",
    },
    {
      ticketNumber: "01-593204",
      organizationId: "org-lumina",
      requesterName: "Priya Shah · Customer NOC",
      visitorName: "Daniel Cho",
      visitorEmail: "daniel.cho@optics-lab.example",
      visitorPhone: "+1 646 555 0188",
      cageZoneId: "zone-cage-22000",
      cabinets: ["CAB-22004"],
      startsInMinutes: -5,
      durationMinutes: 24 * 60,
      comments: "Fiber inspection only. No equipment removal is authorized.",
      hasDelivery: 0,
      packageCount: 0,
      packageDetails: "",
    },
    {
      ticketNumber: "01-318845",
      organizationId: "org-apex",
      requesterName: "Morgan Chen · Customer operations",
      visitorName: "Alicia Grant",
      visitorEmail: "alicia.grant@secure-courier.example",
      visitorPhone: "+1 347 555 0160",
      cageZoneId: "zone-cage-11030",
      cabinets: ["CAB-11031", "CAB-11032", "CAB-11035"],
      startsInMinutes: -48 * 60,
      durationMinutes: 480,
      comments: "Completed supervised hardware delivery.",
      hasDelivery: 1,
      packageCount: 4,
      packageDetails: "Four tamper-evident server cartons.",
    },
  ] as const;

  await db.batch(
    seededVisits.map((visit) => {
      const validFrom = new Date(now.getTime() + visit.startsInMinutes * 60 * 1000);
      const validUntil = new Date(validFrom.getTime() + visit.durationMinutes * 60 * 1000);
      return db
        .prepare(
          `INSERT INTO scheduled_visits
            (ticket_number, site_code, organization_id, requester_name, visitor_name,
             visitor_email, visitor_phone, cage_zone_id, cabinet_access,
             valid_from, valid_until, comments, allowed_hours, has_delivery, package_count,
             package_details, status)
           VALUES (?, 'DC-01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
           ON CONFLICT(ticket_number) DO UPDATE SET
             organization_id = excluded.organization_id,
             requester_name = excluded.requester_name,
             visitor_name = excluded.visitor_name,
             visitor_email = excluded.visitor_email,
             visitor_phone = excluded.visitor_phone,
             cage_zone_id = excluded.cage_zone_id,
             cabinet_access = excluded.cabinet_access,
             comments = excluded.comments,
             has_delivery = excluded.has_delivery,
             package_count = excluded.package_count,
             package_details = excluded.package_details,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          visit.ticketNumber,
          visit.organizationId,
          visit.requesterName,
          visit.visitorName,
          visit.visitorEmail,
          visit.visitorPhone,
          visit.cageZoneId,
          JSON.stringify(visit.cabinets),
          validFrom.toISOString(),
          validUntil.toISOString(),
          visit.comments,
          allHoursForRange(validFrom, validUntil),
          visit.hasDelivery,
          visit.packageCount,
          visit.packageDetails,
        );
    }),
  );
  const danielVisitStart = new Date(now.getTime() - 5 * 60 * 1000);
  const danielVisitEnd = new Date(danielVisitStart.getTime() + 24 * 60 * 60 * 1000);
  await db
    .prepare(
      `UPDATE scheduled_visits
       SET valid_from = ?, valid_until = ?, allowed_hours = ?, updated_at = CURRENT_TIMESTAMP
       WHERE ticket_number = '01-593204'
         AND signed_in_at IS NULL AND signed_out_at IS NULL
         AND datetime(valid_from) > datetime(?)`,
    )
    .bind(
      danielVisitStart.toISOString(),
      danielVisitEnd.toISOString(),
      allHoursForRange(danielVisitStart, danielVisitEnd),
      now.toISOString(),
    )
    .run();
  await db
    .prepare(
      `UPDATE scheduled_visits
       SET signed_in_at = COALESCE(signed_in_at, ?), updated_at = CURRENT_TIMESTAMP
       WHERE ticket_number = '01-482731' AND signed_out_at IS NULL`,
    )
    .bind(new Date(now.getTime() - 20 * 60 * 1000).toISOString())
    .run();

  const seededCheckIns = [
    { id: "checkin-seed-eli", personId: "person-eli-mercer", source: "PORTAL", status: "ON_SITE", minutesAgo: 132, verifiedAfterMinutes: 4 },
    { id: "checkin-seed-sofia", personId: "person-sofia-reyes", source: "KIOSK", status: "ON_SITE", minutesAgo: 86, verifiedAfterMinutes: 3 },
    { id: "checkin-seed-noah", personId: "person-noah-patel", source: "KIOSK", status: "ON_SITE", minutesAgo: 41, verifiedAfterMinutes: 2 },
    { id: "checkin-seed-lena", personId: "person-lena-park", source: "PORTAL", status: "PENDING", minutesAgo: 11, verifiedAfterMinutes: null },
  ] as const;

  await db.batch(
    seededCheckIns.map((checkIn) => {
      const requestedAt = new Date(now.getTime() - checkIn.minutesAgo * 60 * 1000);
      const verifiedAt = checkIn.verifiedAfterMinutes === null
        ? null
        : new Date(requestedAt.getTime() + checkIn.verifiedAfterMinutes * 60 * 1000).toISOString();
      return db
        .prepare(
          `INSERT OR IGNORE INTO site_check_ins
            (id, person_id, source, status, requested_at, verified_at, verified_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          checkIn.id,
          checkIn.personId,
          checkIn.source,
          checkIn.status,
          requestedAt.toISOString(),
          verifiedAt,
          verifiedAt ? "Maya Brooks" : null,
        );
    }),
  );

  const previousRequestedAt = new Date(now.getTime() - 31 * 60 * 60 * 1000);
  const previousVerifiedAt = new Date(previousRequestedAt.getTime() + 5 * 60 * 1000);
  const previousSignedOutAt = new Date(previousVerifiedAt.getTime() + 4.5 * 60 * 60 * 1000);
  await db
    .prepare(
      `INSERT OR IGNORE INTO site_check_ins
        (id, person_id, source, status, requested_at, verified_at,
         verified_by, signed_out_at, notes)
       VALUES ('checkin-history-eli-001', 'person-eli-mercer', 'PORTAL',
         'SIGNED_OUT', ?, ?, 'Maya Brooks', ?, 'Completed customer maintenance visit.')`,
    )
    .bind(previousRequestedAt.toISOString(), previousVerifiedAt.toISOString(), previousSignedOutAt.toISOString())
    .run();

  await db.prepare("PRAGMA optimize").run();
}

export async function ensureDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = getDatabase();
      await createSchema(db);
      const peopleColumns = await db.prepare("PRAGMA table_info(people)").all<{ name: string }>();
      if (!peopleColumns.results.some((column) => column.name === "phone_number")) {
        await db.prepare("ALTER TABLE people ADD COLUMN phone_number TEXT NOT NULL DEFAULT ''").run();
      }
      if (!peopleColumns.results.some((column) => column.name === "ibx_access_pin")) {
        await db.prepare("ALTER TABLE people ADD COLUMN ibx_access_pin TEXT NOT NULL DEFAULT ''").run();
      }
      if (!peopleColumns.results.some((column) => column.name === "credit_hold")) {
        await db.prepare("ALTER TABLE people ADD COLUMN credit_hold INTEGER NOT NULL DEFAULT 0 CHECK (credit_hold IN (0, 1))").run();
      }
      const organizationColumns = await db.prepare("PRAGMA table_info(organizations)").all<{ name: string }>();
      if (!organizationColumns.results.some((column) => column.name === "contact_name")) {
        await db.prepare("ALTER TABLE organizations ADD COLUMN contact_name TEXT NOT NULL DEFAULT ''").run();
      }
      if (!organizationColumns.results.some((column) => column.name === "contact_phone")) {
        await db.prepare("ALTER TABLE organizations ADD COLUMN contact_phone TEXT NOT NULL DEFAULT ''").run();
      }
      const scheduledVisitColumns = await db.prepare("PRAGMA table_info(scheduled_visits)").all<{ name: string }>();
      if (!scheduledVisitColumns.results.some((column) => column.name === "signed_in_at")) {
        await db.prepare("ALTER TABLE scheduled_visits ADD COLUMN signed_in_at TEXT").run();
      }
      if (!scheduledVisitColumns.results.some((column) => column.name === "signed_out_at")) {
        await db.prepare("ALTER TABLE scheduled_visits ADD COLUMN signed_out_at TEXT").run();
      }
      if (!scheduledVisitColumns.results.some((column) => column.name === "allowed_hours")) {
        await db.prepare("ALTER TABLE scheduled_visits ADD COLUMN allowed_hours TEXT NOT NULL DEFAULT '{}'").run();
      }
      await seedDatabase(db);
      const missingPins = await db.prepare("SELECT id FROM people WHERE ibx_access_pin = '' ORDER BY created_at, id").all<{ id: string }>();
      const maxPin = await db.prepare("SELECT COALESCE(MAX(CAST(ibx_access_pin AS INTEGER)), 0) AS value FROM people").first<{ value: number }>();
      if (missingPins.results.length > 0) {
        await db.batch(missingPins.results.map((person, index) =>
          db.prepare("UPDATE people SET ibx_access_pin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(String(Number(maxPin?.value ?? 0) + index + 1).padStart(6, "0"), person.id),
        ));
      }
    })().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }

  await initializationPromise;
  return getDatabase();
}
