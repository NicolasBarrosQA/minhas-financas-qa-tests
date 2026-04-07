import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCorsHeaders } from "../_shared/cors.ts";

type ProcessBody = {
  limit?: number;
  mode?: "user" | "system";
};

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function toJson(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function asPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return toJson(req, { error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return toJson(req, { error: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const reqCronSecret = req.headers.get("x-cron-secret") || "";
  const isTrustedCron = cronSecret.length > 0 && reqCronSecret === cronSecret;

  let body: ProcessBody = {};
  try {
    body = (await req.json()) as ProcessBody;
  } catch {
    body = {};
  }

  const limit = asPositiveInt(body.limit, DEFAULT_LIMIT);
  const mode = body.mode === "system" ? "system" : "user";

  if (isTrustedCron || mode === "system") {
    if (!isTrustedCron) {
      return toJson(req, { error: "System mode requires cron secret" }, 403);
    }

    const { data, error } = await admin.rpc("process_due_recurrences_system", {
      p_limit: limit,
    });

    if (error) {
      console.error("System recurrence processing failed", error.message);
      return toJson(req, { error: "Failed to process recurrences" }, 500);
    }

    return toJson(req, { processed: Number(data || 0), mode: "system" }, 200);
  }

  const token = getBearerToken(req);
  if (!token) {
    return toJson(req, { error: "Missing bearer token" }, 401);
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return toJson(req, { error: "Invalid or expired token" }, 401);
  }

  const { data, error } = await admin.rpc("process_due_recurrences_for_user", {
    p_user_id: userData.user.id,
    p_limit: limit,
  });

  if (error) {
    console.error("User recurrence processing failed", {
      userId: userData.user.id,
      error: error.message,
    });
    return toJson(req, { error: "Failed to process recurrences" }, 500);
  }

  return toJson(
    req,
    {
      processed: Number(data || 0),
      mode: "user",
      userId: userData.user.id,
    },
    200,
  );
});

