import {
  ApiError,
  apiErrorResponse,
  readJsonObject,
  requiredString,
} from "@/db/api";
import { ensureDatabase } from "@/db/init";

const OPERATOR_NAME = "Maya Brooks";
const ACTIONS = ["UNLOCK", "LOCK", "NORMAL", "GRANT_PERSON"] as const;

type DoorAction = (typeof ACTIONS)[number];

async function ensureDoorRows(db: D1Database) {
  await db.prepare(
    `INSERT OR IGNORE INTO door_controls (zone_id, mode, updated_by)
     SELECT id, 'NORMAL', ? FROM zones WHERE active = 1`,
  ).bind(OPERATOR_NAME).run();
}

export async function GET() {
  try {
    const db = await ensureDatabase();
    await ensureDoorRows(db);
    const now = new Date().toISOString();
    const [doors, events] = await Promise.all([
      db.prepare(
        `SELECT z.id AS zoneId, z.code AS zoneCode, z.name AS zoneName,
          z.category, z.location, z.security_tier AS securityTier,
          c.mode, c.updated_by AS updatedBy, c.updated_at AS updatedAt,
          CASE WHEN datetime(c.grant_expires_at) >= datetime(?) THEN c.granted_person_id ELSE NULL END AS grantedPersonId,
          CASE WHEN datetime(c.grant_expires_at) >= datetime(?) THEN c.grant_expires_at ELSE NULL END AS grantExpiresAt,
          CASE WHEN datetime(c.grant_expires_at) >= datetime(?) THEN p.first_name || ' ' || p.last_name ELSE NULL END AS grantedPersonName
         FROM zones z
         JOIN door_controls c ON c.zone_id = z.id
         LEFT JOIN people p ON p.id = c.granted_person_id
         WHERE z.active = 1
         ORDER BY z.sort_order, z.name`,
      ).bind(now, now, now).all(),
      db.prepare(
        `SELECT e.id, e.zone_id AS zoneId, z.name AS zoneName,
          e.person_id AS personId,
          CASE WHEN p.id IS NULL THEN NULL ELSE p.first_name || ' ' || p.last_name END AS personName,
          e.action, e.detail, e.operator_name AS operatorName, e.created_at AS createdAt
         FROM door_control_events e
         JOIN zones z ON z.id = e.zone_id
         LEFT JOIN people p ON p.id = e.person_id
         ORDER BY e.created_at DESC
         LIMIT 40`,
      ).all(),
    ]);
    return Response.json({ doors: doors.results, events: events.results });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const zoneId = requiredString(payload, "zoneId", "Door", 100);
    const action = requiredString(payload, "action", "Control action", 30).toUpperCase() as DoorAction;
    if (!ACTIONS.includes(action)) {
      throw new ApiError(400, "INVALID_DOOR_ACTION", `Action must be one of: ${ACTIONS.join(", ")}.`);
    }

    const db = await ensureDatabase();
    await ensureDoorRows(db);
    const zone = await db.prepare("SELECT id, name, active FROM zones WHERE id = ?").bind(zoneId).first<{ id: string; name: string; active: number }>();
    if (!zone || zone.active !== 1) throw new ApiError(404, "DOOR_NOT_FOUND", "The selected door is unavailable.");

    const now = new Date();
    let personId: string | null = null;
    let detail = "";
    if (action === "GRANT_PERSON") {
      personId = requiredString(payload, "personId", "Person", 100);
      const durationMinutes = Number(payload.durationMinutes ?? 60);
      if (![15, 60, 480].includes(durationMinutes)) {
        throw new ApiError(400, "INVALID_GRANT_DURATION", "Person access must be 15 minutes, 1 hour, or 8 hours.");
      }
      const [person, control] = await Promise.all([
        db.prepare("SELECT id, first_name || ' ' || last_name AS name, active FROM people WHERE id = ?").bind(personId).first<{ id: string; name: string; active: number }>(),
        db.prepare("SELECT mode FROM door_controls WHERE zone_id = ?").bind(zoneId).first<{ mode: string }>(),
      ]);
      if (!person || person.active !== 1) throw new ApiError(404, "PERSON_NOT_FOUND", "The selected person is unavailable.");
      if (control?.mode === "LOCKED") throw new ApiError(409, "DOOR_LOCKED", "Return this door to badge control before granting person access.");
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
      await db.prepare(
        `UPDATE door_controls
         SET granted_person_id = ?, grant_expires_at = ?, updated_by = ?, updated_at = ?
         WHERE zone_id = ?`,
      ).bind(personId, expiresAt, OPERATOR_NAME, now.toISOString(), zoneId).run();
      detail = `${person.name} received door access for ${durationMinutes === 60 ? "1 hour" : durationMinutes === 480 ? "8 hours" : "15 minutes"}.`;
    } else {
      const mode = action === "UNLOCK" ? "UNLOCKED" : action === "LOCK" ? "LOCKED" : "NORMAL";
      await db.prepare(
        `UPDATE door_controls
         SET mode = ?, granted_person_id = NULL, grant_expires_at = NULL,
             updated_by = ?, updated_at = ?
         WHERE zone_id = ?`,
      ).bind(mode, OPERATOR_NAME, now.toISOString(), zoneId).run();
      detail = action === "UNLOCK"
        ? `${zone.name} is remotely unlocked; badge scans are bypassed.`
        : action === "LOCK"
          ? `${zone.name} is locked down; all badge access is denied.`
          : `${zone.name} returned to normal badge-controlled access.`;
    }

    await db.prepare(
      `INSERT INTO door_control_events
        (id, zone_id, person_id, action, detail, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(`door-event-${crypto.randomUUID()}`, zoneId, personId, action, detail, OPERATOR_NAME, now.toISOString()).run();

    return Response.json({ zoneId, action, detail });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
