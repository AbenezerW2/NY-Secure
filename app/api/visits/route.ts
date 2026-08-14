import {
  ApiError,
  apiErrorResponse,
  optionalString,
  readJsonObject,
  requiredString,
} from "@/db/api";
import { ensureDatabase } from "@/db/init";

const SITE_CODE = "DC-01";
const TICKET_PREFIX = "01";

function parseDateTime(value: string, field: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_VISIT_TIME", `${field} must be a valid date and time.`);
  }
  return date;
}

function parseCabinets(value: unknown) {
  const values = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(",")
      : [];
  const cabinets = Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
  if (cabinets.length === 0) {
    throw new ApiError(400, "CABINETS_REQUIRED", "At least one cabinet is required.");
  }
  if (cabinets.length > 30 || cabinets.some((cabinet) => cabinet.length > 50)) {
    throw new ApiError(400, "INVALID_CABINETS", "Provide no more than 30 cabinet references of 50 characters each.");
  }
  return cabinets;
}

function nextTicketNumber() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return `${TICKET_PREFIX}-${String(value).padStart(6, "0")}`;
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const organizationId = requiredString(payload, "organizationId", "Customer / organization", 100);
    const requesterName = requiredString(payload, "requesterName", "Requested by", 120);
    const visitorName = requiredString(payload, "visitorName", "Visitor name", 120);
    const visitorEmail = optionalString(payload, "visitorEmail", 254);
    const visitorPhone = optionalString(payload, "visitorPhone", 40);
    const cageZoneId = requiredString(payload, "cageZoneId", "Cage", 100);
    const cabinets = parseCabinets(payload.cabinets);
    const validFrom = parseDateTime(requiredString(payload, "validFrom", "Visit start", 80), "Visit start");
    const durationHours = Number(payload.durationHours);
    const comments = optionalString(payload, "comments", 1000) ?? "";
    const hasDelivery = payload.hasDelivery === true || payload.hasDelivery === "true" || payload.hasDelivery === "on";
    const packageDetails = hasDelivery ? optionalString(payload, "packageDetails", 500) ?? "" : "";
    const packageCount = hasDelivery ? Number(payload.packageCount || 1) : 0;

    if (visitorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
      throw new ApiError(400, "INVALID_EMAIL", "Visitor email must be a valid email address.");
    }
    if (visitorPhone && !/^[+()0-9.\-\s]{7,40}$/.test(visitorPhone)) {
      throw new ApiError(400, "INVALID_PHONE", "Visitor phone must be a valid phone number.");
    }
    if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 168) {
      throw new ApiError(400, "INVALID_DURATION", "Visit duration must be between 1 and 168 hours.");
    }
    if (!Number.isInteger(packageCount) || packageCount < 0 || packageCount > 999) {
      throw new ApiError(400, "INVALID_PACKAGE_COUNT", "Package count must be between 0 and 999.");
    }
    if (validFrom.getTime() < Date.now() - 5 * 60 * 1000) {
      throw new ApiError(400, "VISIT_START_IN_PAST", "Visit start cannot be in the past.");
    }

    const validUntil = new Date(validFrom.getTime() + durationHours * 60 * 60 * 1000);
    const db = await ensureDatabase();
    const [organization, cage] = await Promise.all([
      db
        .prepare("SELECT id, organization_type AS type, active FROM organizations WHERE id = ?")
        .bind(organizationId)
        .first<{ id: string; type: string; active: number }>(),
      db
        .prepare("SELECT id, category, active FROM zones WHERE id = ?")
        .bind(cageZoneId)
        .first<{ id: string; category: string; active: number }>(),
    ]);

    if (!organization || organization.active !== 1) {
      throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "The selected organization is unavailable.");
    }
    if (!["DATA_CENTER_OPERATOR", "COLOCATION_CUSTOMER"].includes(organization.type)) {
      throw new ApiError(400, "INVALID_REQUESTER", "Visit tickets can be requested only by a customer or the NY-Secure NOC.");
    }
    if (!cage || cage.active !== 1 || cage.category !== "CUSTOMER_CAGE") {
      throw new ApiError(404, "CAGE_NOT_FOUND", "The selected customer cage is unavailable.");
    }

    const now = new Date().toISOString();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const ticketNumber = nextTicketNumber();
      const result = await db
        .prepare(
          `INSERT OR IGNORE INTO scheduled_visits
            (ticket_number, site_code, organization_id, requester_name, visitor_name,
             visitor_email, visitor_phone, cage_zone_id, cabinet_access,
             valid_from, valid_until, comments, has_delivery, package_count,
             package_details, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)`,
        )
        .bind(
          ticketNumber,
          SITE_CODE,
          organizationId,
          requesterName,
          visitorName,
          visitorEmail,
          visitorPhone,
          cageZoneId,
          JSON.stringify(cabinets),
          validFrom.toISOString(),
          validUntil.toISOString(),
          comments,
          hasDelivery ? 1 : 0,
          packageCount,
          packageDetails,
          now,
          now,
        )
        .run() as { meta: { changes?: number } };
      if (Number(result.meta.changes ?? 0) > 0) {
        return Response.json({ ticketNumber }, { status: 201 });
      }
    }

    throw new Error("A unique visit ticket number could not be generated.");
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const ticketNumber = requiredString(payload, "ticketNumber", "Work visit number", 30);
    const action = requiredString(payload, "action", "Action", 20).toUpperCase();
    if (action !== "START") {
      throw new ApiError(400, "INVALID_VISIT_ACTION", "Action must be START.");
    }
    if (payload.photoVerified !== true) {
      throw new ApiError(400, "PHOTO_VERIFICATION_REQUIRED", "Security must verify the visitor photo before starting the ticket.");
    }

    const db = await ensureDatabase();
    const visit = await db
      .prepare(
        `SELECT ticket_number AS ticketNumber, status, valid_from AS validFrom,
          valid_until AS validUntil, signed_in_at AS signedInAt,
          signed_out_at AS signedOutAt
         FROM scheduled_visits WHERE ticket_number = ?`,
      )
      .bind(ticketNumber)
      .first<{ ticketNumber: string; status: string; validFrom: string; validUntil: string; signedInAt: string | null; signedOutAt: string | null }>();

    if (!visit) {
      throw new ApiError(404, "VISIT_NOT_FOUND", "The work visit ticket was not found.");
    }
    if (visit.status === "CANCELLED") {
      throw new ApiError(409, "VISIT_CANCELLED", "A cancelled work visit cannot be started.");
    }
    if (visit.signedOutAt) {
      throw new ApiError(409, "VISIT_COMPLETED", "This work visit has already been completed.");
    }
    if (visit.signedInAt) {
      return Response.json({ ticketNumber, status: "ACTIVE", signedInAt: visit.signedInAt, alreadyStarted: true });
    }

    const now = new Date();
    if (now.getTime() < new Date(visit.validFrom).getTime()) {
      throw new ApiError(409, "VISIT_NOT_STARTED", "The approved work-visit window has not started yet.");
    }
    if (now.getTime() > new Date(visit.validUntil).getTime()) {
      throw new ApiError(409, "VISIT_EXPIRED", "The work-visit ticket has expired.");
    }

    const signedInAt = now.toISOString();
    const result = await db
      .prepare(
        `UPDATE scheduled_visits
         SET signed_in_at = ?, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
         WHERE ticket_number = ? AND signed_in_at IS NULL AND signed_out_at IS NULL`,
      )
      .bind(signedInAt, ticketNumber)
      .run() as { meta: { changes?: number } };
    if (Number(result.meta.changes ?? 0) === 0) {
      throw new ApiError(409, "VISIT_STATE_CHANGED", "The work visit changed before it could be started. Refresh and try again.");
    }

    return Response.json({ ticketNumber, status: "ACTIVE", signedInAt });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
