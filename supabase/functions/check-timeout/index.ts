import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { booking_id, global } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    if (global) {
      const { data, error } = await admin.rpc("check_all_timeouts");
      if (error) throw error;
      return new Response(JSON.stringify({ message: "Global check complete", details: data }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (!booking_id) return new Response(JSON.stringify({ error: "Missing booking_id" }), { status: 400, headers: corsHeaders });

    // Find the latest pending attempt for this booking
    const { data: attempt } = await admin
      .from("assignment_attempts")
      .select("*")
      .eq("booking_id", booking_id)
      .is("response", null)
      .order("offered_at", { ascending: false })
      .limit(1)
      .single();

    if (!attempt) return new Response(JSON.stringify({ message: "No pending attempt" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check if expired
    if (new Date(attempt.expires_at) > new Date()) {
      return new Response(JSON.stringify({ message: "Offer still active" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as timeout
    await admin.from("assignment_attempts").update({ response: "timeout", responded_at: new Date().toISOString() }).eq("id", attempt.id);

    // Block helper
    await admin.from("helper_blocks").insert({
      helper_id: attempt.helper_id,
      booking_id: booking_id,
      blocked_until: new Date(Date.now() + 120000).toISOString(),
      reason: "timeout",
    });

    // Re-run assignment via RPC
    const { data: result, error: rpcErr } = await admin.rpc("request_next_assignment", {
      _booking_id: booking_id,
    });

    if (rpcErr) throw rpcErr;

    return new Response(JSON.stringify({ ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
