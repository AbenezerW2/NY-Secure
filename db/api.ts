export const relationshipTypes = [
  "CUSTOMER",
  "CONTRACTOR",
  "ENGINEER",
  "VENDOR",
  "VISITOR",
  "JANITOR",
] as const;

export type RelationshipType = (typeof relationshipTypes)[number];

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("NY-Secure access API error", error);
  return Response.json(
    {
      error: "The access-control database could not complete this request.",
      code: "DATABASE_ERROR",
    },
    { status: 500 },
  );
}

export async function readJsonObject(request: Request) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_BODY", "The request body must be a JSON object.");
  }

  return value as Record<string, unknown>;
}

export function requiredString(
  payload: Record<string, unknown>,
  field: string,
  label = field,
  maximumLength = 200,
) {
  const value = payload[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, "VALIDATION_ERROR", `${label} is required.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maximumLength) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `${label} must be ${maximumLength} characters or fewer.`,
    );
  }
  return trimmed;
}

export function optionalString(
  payload: Record<string, unknown>,
  field: string,
  maximumLength = 500,
) {
  const value = payload[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ApiError(400, "VALIDATION_ERROR", `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maximumLength) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `${field} must be ${maximumLength} characters or fewer.`,
    );
  }
  return trimmed || null;
}

export function asBoolean(value: unknown) {
  return value === true || value === 1;
}

export function parseRelationshipType(value: string): RelationshipType {
  const normalized = value.trim().toUpperCase();
  if (!relationshipTypes.includes(normalized as RelationshipType)) {
    throw new ApiError(
      400,
      "INVALID_RELATIONSHIP_TYPE",
      `relationshipType must be one of: ${relationshipTypes.join(", ")}.`,
    );
  }
  return normalized as RelationshipType;
}

export function parseOptionalFutureDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ApiError(
      400,
      "INVALID_VALID_UNTIL",
      "validUntil must be an ISO-8601 date-time string.",
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      400,
      "INVALID_VALID_UNTIL",
      "validUntil must be a valid ISO-8601 date-time string.",
    );
  }
  if (date.getTime() <= Date.now()) {
    throw new ApiError(
      400,
      "INVALID_VALID_UNTIL",
      "validUntil must be in the future.",
    );
  }
  return date.toISOString();
}

export function isCurrentlyValidAssignment(row: {
  active: unknown;
  validFrom: string;
  validUntil: string | null;
}) {
  const now = Date.now();
  return (
    asBoolean(row.active) &&
    new Date(row.validFrom).getTime() <= now &&
    (row.validUntil === null || new Date(row.validUntil).getTime() >= now)
  );
}

export type AssignmentRow = {
  id: string;
  personId: string;
  personName: string;
  profileId: string;
  profileName: string;
  validFrom: string;
  validUntil: string | null;
  reason: string;
  active: number | boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export function mapAssignment(row: AssignmentRow) {
  return {
    ...row,
    active: asBoolean(row.active),
    isCurrentlyValid: isCurrentlyValidAssignment(row),
  };
}

export async function getAssignment(db: D1Database, assignmentId: string) {
  const row = await db
    .prepare(
      `SELECT
        a.id,
        a.person_id AS personId,
        pe.first_name || ' ' || pe.last_name AS personName,
        a.profile_id AS profileId,
        pr.name AS profileName,
        a.valid_from AS validFrom,
        a.valid_until AS validUntil,
        a.reason,
        a.active,
        a.revoked_at AS revokedAt,
        a.revoked_reason AS revokedReason,
        a.created_at AS createdAt,
        a.updated_at AS updatedAt
       FROM access_assignments a
       JOIN people pe ON pe.id = a.person_id
       JOIN access_profiles pr ON pr.id = a.profile_id
       WHERE a.id = ?`,
    )
    .bind(assignmentId)
    .first<AssignmentRow>();

  return row ? mapAssignment(row) : null;
}

export type PersonRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  relationshipType: RelationshipType;
  jobFunction: string;
  badgeNumber: string;
  active: number | boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapPerson(row: PersonRow) {
  return { ...row, active: asBoolean(row.active), activeAssignments: [] };
}

export async function getPerson(db: D1Database, personId: string) {
  const row = await db
    .prepare(
      `SELECT
        p.id,
        p.first_name AS firstName,
        p.last_name AS lastName,
        p.email,
        p.organization_id AS organizationId,
        o.name AS organizationName,
        o.organization_type AS organizationType,
        p.relationship_type AS relationshipType,
        p.job_function AS jobFunction,
        p.badge_number AS badgeNumber,
        p.active,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt
       FROM people p
       JOIN organizations o ON o.id = p.organization_id
       WHERE p.id = ?`,
    )
    .bind(personId)
    .first<PersonRow>();

  return row ? mapPerson(row) : null;
}
