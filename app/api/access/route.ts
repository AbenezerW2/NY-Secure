import {
  ApiError,
  apiErrorResponse,
  getAssignment,
  optionalString,
  parseOptionalFutureDate,
  readJsonObject,
  requiredString,
} from "@/db/api";
import { ensureDatabase } from "@/db/init";

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const personId = requiredString(payload, "personId", "personId", 100);
    const profileId = requiredString(payload, "profileId", "profileId", 100);
    const validUntil = parseOptionalFutureDate(payload.validUntil);
    const reason = optionalString(payload, "reason", 500) ?? "Access granted by administrator";
    const now = new Date().toISOString();
    const db = await ensureDatabase();

    const [person, profile] = await Promise.all([
      db
        .prepare("SELECT id, active FROM people WHERE id = ?")
        .bind(personId)
        .first<{ id: string; active: number }>(),
      db
        .prepare("SELECT id, active FROM access_profiles WHERE id = ?")
        .bind(profileId)
        .first<{ id: string; active: number }>(),
    ]);

    if (!person) {
      throw new ApiError(404, "PERSON_NOT_FOUND", "The person was not found.");
    }
    if (person.active !== 1) {
      throw new ApiError(
        409,
        "PERSON_INACTIVE",
        "Access cannot be assigned to an inactive person.",
      );
    }
    if (!profile) {
      throw new ApiError(404, "PROFILE_NOT_FOUND", "The access profile was not found.");
    }
    if (profile.active !== 1) {
      throw new ApiError(
        409,
        "PROFILE_INACTIVE",
        "An inactive access profile cannot be assigned.",
      );
    }

    const duplicate = await db
      .prepare(
        `SELECT id
         FROM access_assignments
         WHERE person_id = ? AND profile_id = ? AND active = 1
           AND datetime(valid_from) <= datetime(?)
           AND (valid_until IS NULL OR datetime(valid_until) >= datetime(?))
         LIMIT 1`,
      )
      .bind(personId, profileId, now, now)
      .first<{ id: string }>();
    if (duplicate) {
      throw new ApiError(
        409,
        "ASSIGNMENT_ALREADY_ACTIVE",
        "This person already has an active assignment for that profile.",
      );
    }

    const id = `assignment-${crypto.randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO access_assignments
          (id, person_id, profile_id, valid_from, valid_until, reason,
           active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(id, personId, profileId, now, validUntil, reason, now, now)
      .run();

    const assignment = await getAssignment(db, id);
    if (!assignment) {
      throw new Error("The new assignment could not be read after creation.");
    }
    return Response.json({ assignment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const assignmentId = requiredString(
      payload,
      "assignmentId",
      "assignmentId",
      100,
    );
    const reason = optionalString(payload, "reason", 500) ?? "Access revoked by administrator";
    const db = await ensureDatabase();
    const existing = await db
      .prepare("SELECT id, active FROM access_assignments WHERE id = ?")
      .bind(assignmentId)
      .first<{ id: string; active: number }>();

    if (!existing) {
      throw new ApiError(404, "ASSIGNMENT_NOT_FOUND", "The access assignment was not found.");
    }
    if (existing.active !== 1) {
      throw new ApiError(
        409,
        "ASSIGNMENT_ALREADY_REVOKED",
        "The access assignment has already been revoked.",
      );
    }

    const now = new Date().toISOString();
    await db
      .prepare(
        `UPDATE access_assignments
         SET active = 0, revoked_at = ?, revoked_reason = ?, updated_at = ?
         WHERE id = ? AND active = 1`,
      )
      .bind(now, reason, now, assignmentId)
      .run();

    const assignment = await getAssignment(db, assignmentId);
    if (!assignment) {
      throw new Error("The revoked assignment could not be read after update.");
    }
    return Response.json({ assignment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

