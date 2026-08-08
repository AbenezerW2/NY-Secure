import {
  ApiError,
  apiErrorResponse,
  getPerson,
  parseRelationshipType,
  readJsonObject,
  requiredString,
} from "@/db/api";
import { ensureDatabase } from "@/db/init";

function createDirectoryReference() {
  return `DIR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const firstName = requiredString(payload, "firstName", "firstName", 80);
    const lastName = requiredString(payload, "lastName", "lastName", 80);
    const email = requiredString(payload, "email", "email", 254).toLowerCase();
    const phoneNumber = requiredString(payload, "phoneNumber", "phoneNumber", 40);
    const organizationId = requiredString(
      payload,
      "organizationId",
      "organizationId",
      100,
    );
    const relationshipType = parseRelationshipType(
      requiredString(payload, "relationshipType", "relationshipType", 30),
    );
    const requestedJobFunction = requiredString(payload, "jobFunction", "jobFunction", 120);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "INVALID_EMAIL", "email must be a valid email address.");
    }
    if (!/^[+()0-9.\-\s]{7,40}$/.test(phoneNumber)) {
      throw new ApiError(400, "INVALID_PHONE", "phoneNumber must be a valid phone number.");
    }
    if (relationshipType !== "CUSTOMER" && relationshipType !== "ENGINEER") {
      throw new ApiError(400, "INVALID_DIRECTORY_TYPE", "This directory accepts only customers and internal employees.");
    }
    const jobFunction = relationshipType === "ENGINEER" ? requestedJobFunction : "NOT_APPLICABLE";

    const db = await ensureDatabase();
    const organization = await db
      .prepare("SELECT id, active FROM organizations WHERE id = ?")
      .bind(organizationId)
      .first<{ id: string; active: number }>();
    if (!organization) {
      throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "The organization was not found.");
    }
    if (organization.active !== 1) {
      throw new ApiError(
        409,
        "ORGANIZATION_INACTIVE",
        "People cannot be added to an inactive organization.",
      );
    }

    const existing = await db
      .prepare("SELECT id FROM people WHERE lower(email) = lower(?)")
      .bind(email)
      .first<{ id: string }>();
    if (existing) {
      throw new ApiError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "A person with this email address already exists.",
      );
    }

    const id = `person-${crypto.randomUUID()}`;
    // The legacy schema requires a unique reference. It is intentionally not exposed as a badge.
    const badgeNumber = createDirectoryReference();
    const highestPin = await db
      .prepare("SELECT COALESCE(MAX(CAST(ibx_access_pin AS INTEGER)), 0) AS value FROM people")
      .first<{ value: number }>();
    const ibxAccessPin = String(Number(highestPin?.value ?? 0) + 1).padStart(6, "0");
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO people
          (id, first_name, last_name, email, phone_number, ibx_access_pin, organization_id, relationship_type,
           job_function, badge_number, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(
        id,
        firstName,
        lastName,
        email,
        phoneNumber,
        ibxAccessPin,
        organizationId,
        relationshipType,
        jobFunction,
        badgeNumber,
        now,
        now,
      )
      .run();

    const person = await getPerson(db, id);
    if (!person) {
      throw new Error("The new person could not be read after creation.");
    }
    return Response.json({ person }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed: people.email")
    ) {
      return apiErrorResponse(
        new ApiError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "A person with this email address already exists.",
        ),
      );
    }
    return apiErrorResponse(error);
  }
}
