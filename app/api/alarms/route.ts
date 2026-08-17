import {
  ApiError,
  apiErrorResponse,
  readJsonObject,
  requiredString,
} from "@/db/api";
import { ensureDatabase } from "@/db/init";

const OPERATOR_NAME = "Maya Brooks";
const ACTIONS = ["ATTEMPT_CLEAR", "RESOLVE", "ADD_COMMENT"] as const;

type AlarmAction = (typeof ACTIONS)[number];

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const alarmId = requiredString(payload, "alarmId", "Alarm", 100);
    const action = requiredString(payload, "action", "Alarm action", 30).toUpperCase() as AlarmAction;
    if (!ACTIONS.includes(action)) {
      throw new ApiError(400, "INVALID_ALARM_ACTION", `Action must be one of: ${ACTIONS.join(", ")}.`);
    }

    const db = await ensureDatabase();
    const alarm = await db
      .prepare("SELECT id, status FROM alarms WHERE id = ?")
      .bind(alarmId)
      .first<{ id: string; status: "ACTIVE" | "ACKNOWLEDGED" | "CLEARED" }>();
    if (!alarm) throw new ApiError(404, "ALARM_NOT_FOUND", "The selected alarm is unavailable.");

    const now = new Date().toISOString();
    if (action === "ADD_COMMENT") {
      const comment = requiredString(payload, "comment", "Comment", 1000);
      await db
        .prepare(
          `INSERT INTO alarm_comments
            (id, alarm_id, author_name, body, kind, created_at)
           VALUES (?, ?, ?, ?, 'NOTE', ?)`,
        )
        .bind(`alarm-comment-${crypto.randomUUID()}`, alarmId, OPERATOR_NAME, comment, now)
        .run();
      return Response.json({ alarmId, action, status: alarm.status });
    }

    if (action === "ATTEMPT_CLEAR") {
      if (alarm.status !== "ACTIVE") {
        throw new ApiError(409, "ALARM_ALREADY_ATTEMPTED", "This alarm already has a clear attempt recorded.");
      }
      await db.batch([
        db.prepare("UPDATE alarms SET status = 'ACKNOWLEDGED' WHERE id = ?").bind(alarmId),
        db.prepare(
          `INSERT INTO alarm_comments
            (id, alarm_id, author_name, body, kind, created_at)
           VALUES (?, ?, ?, ?, 'ACTION', ?)`,
        ).bind(
          `alarm-comment-${crypto.randomUUID()}`,
          alarmId,
          OPERATOR_NAME,
          "Clear attempt recorded. The condition remains active pending door or sensor confirmation.",
          now,
        ),
      ]);
      return Response.json({ alarmId, action, status: "ACKNOWLEDGED" });
    }

    if (alarm.status !== "ACKNOWLEDGED") {
      throw new ApiError(409, "CLEAR_ATTEMPT_REQUIRED", alarm.status === "CLEARED" ? "This alarm is already resolved." : "Attempt to clear this alarm before marking it resolved.");
    }
    await db.batch([
      db.prepare("UPDATE alarms SET status = 'CLEARED' WHERE id = ?").bind(alarmId),
      db.prepare(
        `INSERT INTO alarm_comments
          (id, alarm_id, author_name, body, kind, created_at)
         VALUES (?, ?, ?, ?, 'ACTION', ?)`,
      ).bind(
        `alarm-comment-${crypto.randomUUID()}`,
        alarmId,
        OPERATOR_NAME,
        "Alarm confirmed resolved. The door or monitored condition returned to normal after the initial response.",
        now,
      ),
    ]);
    return Response.json({ alarmId, action, status: "CLEARED" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
