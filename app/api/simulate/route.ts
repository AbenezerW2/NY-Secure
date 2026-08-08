import {
  ApiError,
  apiErrorResponse,
  readJsonObject,
  requiredString,
} from "@/db/api";
import { ensureDatabase } from "@/db/init";

type PersonRecord = {
  id: string;
  name: string;
  active: number;
};

type ZoneRecord = {
  id: string;
  name: string;
  active: number;
};

type MatchRecord = {
  assignmentId: string;
  profileId: string;
  profileName: string;
};

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const personId = requiredString(payload, "personId", "personId", 100);
    const zoneId = requiredString(payload, "zoneId", "zoneId", 100);
    const db = await ensureDatabase();
    const now = new Date().toISOString();

    const [person, zone] = await Promise.all([
      db
        .prepare(
          "SELECT id, first_name || ' ' || last_name AS name, active FROM people WHERE id = ?",
        )
        .bind(personId)
        .first<PersonRecord>(),
      db
        .prepare("SELECT id, name, active FROM zones WHERE id = ?")
        .bind(zoneId)
        .first<ZoneRecord>(),
    ]);

    if (!person) {
      throw new ApiError(404, "PERSON_NOT_FOUND", "The person was not found.");
    }
    if (!zone) {
      throw new ApiError(404, "ZONE_NOT_FOUND", "The zone was not found.");
    }

    let decision: "GRANTED" | "DENIED" = "DENIED";
    let reasonCode = "ZONE_NOT_PERMITTED";
    let explanation = "No active access profile permits this zone.";
    let match: MatchRecord | null = null;

    if (person.active !== 1) {
      reasonCode = "PERSON_INACTIVE";
      explanation = `${person.name} is inactive, so all access attempts are denied.`;
    } else if (zone.active !== 1) {
      reasonCode = "ZONE_INACTIVE";
      explanation = `${zone.name} is inactive and cannot accept access attempts.`;
    } else {
      match = await db
        .prepare(
          `SELECT
            a.id AS assignmentId,
            p.id AS profileId,
            p.name AS profileName
           FROM access_assignments a
           JOIN access_profiles p ON p.id = a.profile_id
           JOIN profile_zone_rules r ON r.profile_id = p.id
           WHERE a.person_id = ?
             AND a.active = 1
             AND p.active = 1
             AND r.zone_id = ?
             AND r.permission = 'ALLOW'
             AND datetime(a.valid_from) <= datetime(?)
             AND (a.valid_until IS NULL OR datetime(a.valid_until) >= datetime(?))
           ORDER BY a.created_at DESC, a.id DESC
           LIMIT 1`,
        )
        .bind(personId, zoneId, now, now)
        .first<MatchRecord>();

      if (match) {
        decision = "GRANTED";
        reasonCode = "PROFILE_RULE_MATCH";
        explanation = `${match.profileName} permits access to ${zone.name}.`;
      } else {
        const activeAssignment = await db
          .prepare(
            `SELECT a.id
             FROM access_assignments a
             JOIN access_profiles p ON p.id = a.profile_id
             WHERE a.person_id = ? AND a.active = 1 AND p.active = 1
               AND datetime(a.valid_from) <= datetime(?)
               AND (a.valid_until IS NULL OR datetime(a.valid_until) >= datetime(?))
             LIMIT 1`,
          )
          .bind(personId, now, now)
          .first<{ id: string }>();

        if (!activeAssignment) {
          reasonCode = "NO_ACTIVE_ASSIGNMENT";
          explanation = `${person.name} has no active, in-date access assignment.`;
        } else {
          reasonCode = "ZONE_NOT_PERMITTED";
          explanation = `Active access exists, but none of its profiles permits ${zone.name}.`;
        }
      }
    }

    const eventId = `event-${crypto.randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO access_events
          (id, person_id, zone_id, assignment_id, profile_id, decision,
           reason_code, explanation, attempted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        eventId,
        personId,
        zoneId,
        match?.assignmentId ?? null,
        match?.profileId ?? null,
        decision,
        reasonCode,
        explanation,
        now,
      )
      .run();

    const event = {
      id: eventId,
      personId,
      personName: person.name,
      zoneId,
      zoneName: zone.name,
      assignmentId: match?.assignmentId ?? null,
      profileId: match?.profileId ?? null,
      profileName: match?.profileName ?? null,
      decision,
      reasonCode,
      explanation,
      attemptedAt: now,
    };

    return Response.json({
      event,
      decision,
      reasonCode,
      explanation,
      ...(match ? { matchedProfileName: match.profileName } : {}),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

