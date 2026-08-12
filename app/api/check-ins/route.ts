import {
  ApiError,
  apiErrorResponse,
  optionalString,
  readJsonObject,
  requiredString,
} from "@/db/api";
import { ensureDatabase } from "@/db/init";

const allowedSources = ["PORTAL", "KIOSK"] as const;
const allowedActions = ["VERIFY", "SIGN_OUT", "REJECT"] as const;

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const personId = requiredString(payload, "personId", "Person", 100);
    const source = requiredString(payload, "source", "Sign-in source", 20).toUpperCase();
    const notes = optionalString(payload, "notes", 500) ?? "";
    if (!allowedSources.includes(source as (typeof allowedSources)[number])) {
      throw new ApiError(400, "INVALID_CHECK_IN_SOURCE", "Sign-in source must be PORTAL or KIOSK.");
    }

    const db = await ensureDatabase();
    const person = await db
      .prepare("SELECT id, relationship_type AS relationshipType, active FROM people WHERE id = ?")
      .bind(personId)
      .first<{ id: string; relationshipType: string; active: number }>();
    if (!person || person.active !== 1) {
      throw new ApiError(404, "PERSON_NOT_FOUND", "The selected person is unavailable.");
    }
    if (!["CUSTOMER", "VENDOR", "VISITOR", "CONTRACTOR"].includes(person.relationshipType)) {
      throw new ApiError(400, "CHECK_IN_NOT_REQUIRED", "This person does not use the customer, vendor, or visitor check-in workflow.");
    }

    const openCheckIn = await db
      .prepare("SELECT id FROM site_check_ins WHERE person_id = ? AND status IN ('PENDING', 'ON_SITE')")
      .bind(personId)
      .first<{ id: string }>();
    if (openCheckIn) {
      throw new ApiError(409, "CHECK_IN_ALREADY_OPEN", "This person already has a pending or on-site check-in.");
    }

    const id = `checkin-${crypto.randomUUID()}`;
    const requestedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO site_check_ins
          (id, person_id, source, status, requested_at, notes)
         VALUES (?, ?, ?, 'PENDING', ?, ?)`,
      )
      .bind(id, personId, source, requestedAt, notes)
      .run();
    return Response.json({ id, status: "PENDING", requestedAt }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const id = requiredString(payload, "id", "Check-in", 120);
    const action = requiredString(payload, "action", "Action", 20).toUpperCase();
    if (!allowedActions.includes(action as (typeof allowedActions)[number])) {
      throw new ApiError(400, "INVALID_CHECK_IN_ACTION", "Action must be VERIFY, SIGN_OUT, or REJECT.");
    }

    const db = await ensureDatabase();
    const now = new Date().toISOString();
    const checkInIdentity = await db
      .prepare(
        `SELECT p.first_name || ' ' || p.last_name AS personName, p.email
         FROM site_check_ins c JOIN people p ON p.id = c.person_id
         WHERE c.id = ?`,
      )
      .bind(id)
      .first<{ personName: string; email: string }>();
    const command = action === "VERIFY"
      ? db.prepare(
        `UPDATE site_check_ins SET status = 'ON_SITE', verified_at = ?,
          verified_by = 'Maya Brooks', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'PENDING'`,
      ).bind(now, id)
      : action === "SIGN_OUT"
        ? db.prepare(
          `UPDATE site_check_ins SET status = 'SIGNED_OUT', signed_out_at = ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'ON_SITE'`,
        ).bind(now, id)
        : db.prepare(
          `UPDATE site_check_ins SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'PENDING'`,
        ).bind(id);
    const result = await command.run() as { meta: { changes?: number } };
    if (Number(result.meta.changes ?? 0) === 0) {
      throw new ApiError(409, "CHECK_IN_STATE_CHANGED", "This check-in is no longer in the required state.");
    }
    if (checkInIdentity && action === "VERIFY") {
      await db
        .prepare(
          `UPDATE scheduled_visits SET signed_in_at = ?, updated_at = CURRENT_TIMESTAMP
           WHERE ticket_number = (
             SELECT ticket_number FROM scheduled_visits
             WHERE signed_out_at IS NULL
               AND (lower(visitor_email) = lower(?) OR lower(visitor_name) = lower(?))
             ORDER BY abs(julianday(valid_from) - julianday(?)) LIMIT 1
           )`,
        )
        .bind(now, checkInIdentity.email, checkInIdentity.personName, now)
        .run();
    }
    if (checkInIdentity && action === "SIGN_OUT") {
      await db
        .prepare(
          `UPDATE scheduled_visits SET signed_out_at = ?, updated_at = CURRENT_TIMESTAMP
           WHERE ticket_number = (
             SELECT ticket_number FROM scheduled_visits
             WHERE signed_in_at IS NOT NULL AND signed_out_at IS NULL
               AND (lower(visitor_email) = lower(?) OR lower(visitor_name) = lower(?))
             ORDER BY signed_in_at DESC LIMIT 1
           )`,
        )
        .bind(now, checkInIdentity.email, checkInIdentity.personName)
        .run();
    }
    return Response.json({ id, status: action === "VERIFY" ? "ON_SITE" : action === "SIGN_OUT" ? "SIGNED_OUT" : "REJECTED" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
