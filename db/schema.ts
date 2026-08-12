import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    organizationType: text("organization_type").notNull(),
    contactEmail: text("contact_email"),
    contactName: text("contact_name").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_organizations_slug").on(table.slug)],
);

export const zones = sqliteTable(
  "zones",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    location: text("location").notNull(),
    securityTier: integer("security_tier").notNull().default(1),
    description: text("description").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_zones_code").on(table.code),
    index("idx_zones_category_active").on(table.category, table.active),
  ],
);

export const people = sqliteTable(
  "people",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phoneNumber: text("phone_number").notNull().default(""),
    ibxAccessPin: text("ibx_access_pin").notNull().default(""),
    creditHold: integer("credit_hold", { mode: "boolean" }).notNull().default(false),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    relationshipType: text("relationship_type").notNull(),
    jobFunction: text("job_function").notNull(),
    badgeNumber: text("badge_number").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_people_email").on(table.email),
    uniqueIndex("idx_people_badge_number").on(table.badgeNumber),
    index("idx_people_organization_active").on(
      table.organizationId,
      table.active,
    ),
    index("idx_people_relationship_type").on(table.relationshipType),
  ],
);

export const accessProfiles = sqliteTable(
  "access_profiles",
  {
    id: text("id").primaryKey(),
    key: text("profile_key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    relationshipType: text("relationship_type").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_access_profiles_key").on(table.key),
    index("idx_access_profiles_relationship_active").on(
      table.relationshipType,
      table.active,
    ),
  ],
);

export const profileZoneRules = sqliteTable(
  "profile_zone_rules",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => accessProfiles.id, { onDelete: "cascade" }),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    permission: text("permission").notNull().default("ALLOW"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_profile_zone_rules_profile_zone").on(
      table.profileId,
      table.zoneId,
    ),
    index("idx_profile_zone_rules_zone_permission").on(
      table.zoneId,
      table.permission,
    ),
  ],
);

export const accessAssignments = sqliteTable(
  "access_assignments",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id),
    profileId: text("profile_id")
      .notNull()
      .references(() => accessProfiles.id),
    validFrom: text("valid_from").notNull(),
    validUntil: text("valid_until"),
    reason: text("reason").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    revokedAt: text("revoked_at"),
    revokedReason: text("revoked_reason"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_access_assignments_person_active").on(
      table.personId,
      table.active,
    ),
    index("idx_access_assignments_profile_active").on(
      table.profileId,
      table.active,
    ),
  ],
);

export const accessEvents = sqliteTable(
  "access_events",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id),
    assignmentId: text("assignment_id").references(() => accessAssignments.id),
    profileId: text("profile_id").references(() => accessProfiles.id),
    decision: text("decision").notNull(),
    reasonCode: text("reason_code").notNull(),
    explanation: text("explanation").notNull(),
    attemptedAt: text("attempted_at").notNull(),
  },
  (table) => [
    index("idx_access_events_attempted_at").on(table.attemptedAt),
    index("idx_access_events_person_attempted_at").on(
      table.personId,
      table.attemptedAt,
    ),
    index("idx_access_events_zone_attempted_at").on(
      table.zoneId,
      table.attemptedAt,
    ),
    index("idx_access_events_decision_attempted_at").on(
      table.decision,
      table.attemptedAt,
    ),
  ],
);

export const alarms = sqliteTable(
  "alarms",
  {
    id: text("id").primaryKey(),
    alarmType: text("alarm_type").notNull(),
    severity: text("severity").notNull().default("MEDIUM"),
    personId: text("person_id").references(() => people.id),
    actorLabel: text("actor_label").notNull().default("System"),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id),
    source: text("source").notNull().default("Access control"),
    detail: text("detail").notNull().default(""),
    status: text("status").notNull().default("ACTIVE"),
    occurredAt: text("occurred_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_alarms_occurred_at").on(table.occurredAt),
    index("idx_alarms_type_status").on(table.alarmType, table.status),
    index("idx_alarms_zone_occurred_at").on(table.zoneId, table.occurredAt),
  ],
);
