import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TABLES = [
  "meal_logs","habits","meal_library","week_plans",
  "body_measurements","oura_readiness","coach_sessions","user_settings",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
  const cronSecret  = Deno.env.get("CRON_SECRET") || "";

  const admin = createClient(supabaseUrl, serviceKey);

  // Two callers: weekly cron (uses CRON_SECRET) or authenticated user (uses JWT)
  const isCron = authHeader === `Bearer ${cronSecret}`;
  let userIds: string[];

  if (isCron) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    userIds = users.map(u => u.id);
  } else {
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await caller.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userIds = [user.id];
  }

  const date = new Date().toISOString().split("T")[0];
  const results: { user_id: string; path: string; success: boolean; error?: string }[] = [];

  for (const userId of userIds) {
    try {
      const fetches = await Promise.all(
        TABLES.map(t => admin.from(t).select("*").eq("user_id", userId))
      );
      const backup = {
        backed_up_at: new Date().toISOString(),
        data: Object.fromEntries(TABLES.map((t, i) => [t, fetches[i].data || []])),
      };

      const path = `${userId}/${date}.json`;
      const { error } = await admin.storage
        .from("backups")
        .upload(path, JSON.stringify(backup, null, 2), {
          contentType: "application/json",
          upsert: true,
        });

      results.push({ user_id: userId, path, success: !error, error: error?.message });
    } catch (err) {
      results.push({ user_id: userId, path: "", success: false, error: String(err) });
    }
  }

  return new Response(JSON.stringify({ backed_up: results.length, date, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
