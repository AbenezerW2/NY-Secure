import { apiErrorResponse } from "@/db/api";
import { ensureDatabase } from "@/db/init";
import { getState } from "@/db/state";

export async function GET() {
  try {
    const db = await ensureDatabase();
    const state = await getState(db);
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

