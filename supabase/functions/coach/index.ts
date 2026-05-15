import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify the caller is an authenticated Supabase user before touching Anthropic
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { type, messages, systemPrompt, description, imageData, imageType } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    let body: object;

    if (type === "estimate") {
      const content = imageData
        ? [
            { type: "image", source: { type: "base64", media_type: imageType, data: imageData } },
            { type: "text", text: `Estimate macros. User: "${description || "this"}". Restaurant portions. JSON only: {"name":"","cal":0,"protein":0,"carbs":0,"fat":0,"confidence":"high|medium|low","note":""}` },
          ]
        : `Estimate macros for: "${description}". Restaurant portions. JSON only: {"name":"","cal":0,"protein":0,"carbs":0,"fat":0,"confidence":"high|medium|low","note":""}`;
      body = { model: "claude-sonnet-4-6", max_tokens: 400, messages: [{ role: "user", content }] };
    } else {
      body = { model: "claude-sonnet-4-6", max_tokens: 2048, system: systemPrompt, messages };
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Anthropic error ${res.status}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
