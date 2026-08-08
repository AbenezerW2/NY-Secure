import {
  asBoolean,
  AssignmentRow,
  isCurrentlyValidAssignment,
  mapAssignment,
  PersonRow,
} from "./api";

type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  type: string;
  contactEmail: string | null;
  contactName: string;
  contactPhone: string;
  active: number | boolean;
  createdAt: string;
  updatedAt: string;
};

type ZoneRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  securityTier: number;
  description: string;
  active: number | boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type ProfileRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  relationshipType: string;
  active: number | boolean;
  createdAt: string;
  updatedAt: string;
};

type RuleRow = {
  id: string;
  profileId: string;
  zoneId: string;
  zoneName: string;
  permission: "ALLOW";
};

type EventRow = {
  id: string;
  personId: string;
  personName: string;
  zoneId: string;
  zoneName: string;
  assignmentId: string | null;
  profileId: string | null;
  profileName: string | null;
  decision: "GRANTED" | "DENIED";
  reasonCode: string;
  explanation: string;
  attemptedAt: string;
};

type CountRow = {
  totalPeople: number;
  activePeople: number;
  activeAssignments: number;
  grantedToday: number;
  deniedToday: number;
};

export async function getState(db: D1Database) {
  const now = new Date().toISOString();
  const [
    organizationResult,
    zoneResult,
    peopleResult,
    profileResult,
    ruleResult,
    assignmentResult,
    eventResult,
    countResult,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT
          id, slug, name, organization_type AS type,
          contact_email AS contactEmail, contact_name AS contactName,
          contact_phone AS contactPhone, active,
          created_at AS createdAt, updated_at AS updatedAt
         FROM organizations
         ORDER BY name`,
      )
      .all<OrganizationRow>(),
    db
      .prepare(
        `SELECT
          id, code, name, category, location,
          security_tier AS securityTier, description, active,
          sort_order AS sortOrder, created_at AS createdAt,
          updated_at AS updatedAt
         FROM zones
         ORDER BY sort_order, name`,
      )
      .all<ZoneRow>(),
    db
      .prepare(
        `SELECT
          p.id, p.first_name AS firstName, p.last_name AS lastName,
          p.email, p.phone_number AS phoneNumber,
          p.ibx_access_pin AS ibxAccessPin, p.credit_hold AS creditHold,
          p.organization_id AS organizationId,
          o.name AS organizationName, o.organization_type AS organizationType,
          p.relationship_type AS relationshipType,
          p.job_function AS jobFunction, p.badge_number AS badgeNumber,
          p.active, p.created_at AS createdAt, p.updated_at AS updatedAt
         FROM people p
         JOIN organizations o ON o.id = p.organization_id
         ORDER BY p.last_name, p.first_name`,
      )
      .all<PersonRow>(),
    db
      .prepare(
        `SELECT
          id, profile_key AS key, name, description,
          relationship_type AS relationshipType, active,
          created_at AS createdAt, updated_at AS updatedAt
         FROM access_profiles
         ORDER BY name`,
      )
      .all<ProfileRow>(),
    db
      .prepare(
        `SELECT
          r.id, r.profile_id AS profileId, r.zone_id AS zoneId,
          z.name AS zoneName, r.permission
         FROM profile_zone_rules r
         JOIN zones z ON z.id = r.zone_id
         ORDER BY r.profile_id, z.sort_order, z.name`,
      )
      .all<RuleRow>(),
    db
      .prepare(
        `SELECT
          a.id, a.person_id AS personId,
          pe.first_name || ' ' || pe.last_name AS personName,
          a.profile_id AS profileId, pr.name AS profileName,
          a.valid_from AS validFrom, a.valid_until AS validUntil,
          a.reason, a.active, a.revoked_at AS revokedAt,
          a.revoked_reason AS revokedReason,
          a.created_at AS createdAt, a.updated_at AS updatedAt
         FROM access_assignments a
         JOIN people pe ON pe.id = a.person_id
         JOIN access_profiles pr ON pr.id = a.profile_id
         ORDER BY a.created_at DESC, a.id DESC`,
      )
      .all<AssignmentRow>(),
    db
      .prepare(
        `SELECT
          e.id, e.person_id AS personId,
          pe.first_name || ' ' || pe.last_name AS personName,
          e.zone_id AS zoneId, z.name AS zoneName,
          e.assignment_id AS assignmentId, e.profile_id AS profileId,
          pr.name AS profileName, e.decision,
          e.reason_code AS reasonCode, e.explanation,
          e.attempted_at AS attemptedAt
         FROM access_events e
         JOIN people pe ON pe.id = e.person_id
         JOIN zones z ON z.id = e.zone_id
         LEFT JOIN access_profiles pr ON pr.id = e.profile_id
         ORDER BY e.attempted_at DESC
         LIMIT 100`,
      )
      .all<EventRow>(),
    db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM people) AS totalPeople,
          (SELECT COUNT(*) FROM people WHERE active = 1) AS activePeople,
          (SELECT COUNT(*) FROM access_assignments a
            JOIN access_profiles p ON p.id = a.profile_id
            WHERE a.active = 1 AND p.active = 1
              AND datetime(a.valid_from) <= datetime(?)
              AND (a.valid_until IS NULL OR datetime(a.valid_until) >= datetime(?))) AS activeAssignments,
          (SELECT COUNT(*) FROM access_events
            WHERE decision = 'GRANTED' AND date(attempted_at) = date(?)) AS grantedToday,
          (SELECT COUNT(*) FROM access_events
            WHERE decision = 'DENIED' AND date(attempted_at) = date(?)) AS deniedToday`,
      )
      .bind(now, now, now, now)
      .first<CountRow>(),
  ]);

  const assignments = assignmentResult.results.map(mapAssignment);
  const assignmentsByPerson = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    if (!assignment.isCurrentlyValid) continue;
    const current = assignmentsByPerson.get(assignment.personId) ?? [];
    current.push(assignment);
    assignmentsByPerson.set(assignment.personId, current);
  }

  const rulesByProfile = new Map<string, RuleRow[]>();
  for (const rule of ruleResult.results) {
    const current = rulesByProfile.get(rule.profileId) ?? [];
    current.push(rule);
    rulesByProfile.set(rule.profileId, current);
  }

  const organizations = organizationResult.results.map((organization) => ({
    ...organization,
    active: asBoolean(organization.active),
  }));
  const zones = zoneResult.results.map((zone) => ({
    ...zone,
    active: asBoolean(zone.active),
  }));
  const people = peopleResult.results.map((person) => ({
    ...person,
    active: asBoolean(person.active),
    creditHold: asBoolean(person.creditHold),
    activeAssignments: assignmentsByPerson.get(person.id) ?? [],
  }));
  const profiles = profileResult.results.map((profile) => {
    const rules = rulesByProfile.get(profile.id) ?? [];
    return {
      ...profile,
      active: asBoolean(profile.active),
      zoneCount: rules.length,
      zoneIds: rules.map((rule) => rule.zoneId),
      zones: rules.map((rule) => ({
        id: rule.zoneId,
        name: rule.zoneName,
        permission: rule.permission,
      })),
    };
  });

  const count = countResult ?? {
    totalPeople: people.length,
    activePeople: people.filter((person) => person.active).length,
    activeAssignments: assignments.filter(isCurrentlyValidAssignment).length,
    grantedToday: 0,
    deniedToday: 0,
  };
  const decisionsToday = count.grantedToday + count.deniedToday;

  return {
    organizations,
    zones,
    people,
    profiles,
    assignments,
    events: eventResult.results,
    stats: {
      organizationCount: organizations.filter((organization) => organization.active)
        .length,
      totalZones: zones.length,
      activeZones: zones.filter((zone) => zone.active).length,
      totalPeople: count.totalPeople,
      activePeople: count.activePeople,
      activeAssignments: count.activeAssignments,
      grantedToday: count.grantedToday,
      deniedToday: count.deniedToday,
      decisionsToday,
      grantRateToday:
        decisionsToday === 0
          ? null
          : Math.round((count.grantedToday / decisionsToday) * 100),
    },
  };
}
