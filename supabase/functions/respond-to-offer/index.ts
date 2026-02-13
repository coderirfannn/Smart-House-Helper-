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
    const helperId = user.id;

    const { attempt_id, response } = await req.json();
    if (!attempt_id || !["accepted", "rejected"].includes(response)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Get attempt
    const { data: attempt } = await admin.from("assignment_attempts").select("*").eq("id", attempt_id).single();
    if (!attempt) return new Response(JSON.stringify({ error: "Attempt not found" }), { status: 404, headers: corsHeaders });
    if (attempt.helper_id !== helperId) return new Response(JSON.stringify({ error: "Not your offer" }), { status: 403, headers: corsHeaders });
    if (attempt.response) return new Response(JSON.stringify({ error: "Already responded" }), { status: 400, headers: corsHeaders });

    // Check if expired
    if (new Date(attempt.expires_at) < new Date()) {
      await admin.from("assignment_attempts").update({ response: "timeout", responded_at: new Date().toISOString() }).eq("id", attempt_id);
      return new Response(JSON.stringify({ error: "Offer expired" }), { status: 400, headers: corsHeaders });
    }

    const bookingId = attempt.booking_id;

    if (response === "accepted") {
      // Check booking is still available (race condition protection)
      const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
      if (!booking || !["searching", "offered"].includes(booking.status)) {
        return new Response(JSON.stringify({ error: "Booking already assigned" }), { status: 409, headers: corsHeaders });
      }

      await admin.from("assignment_attempts").update({ response: "accepted", responded_at: new Date().toISOString() }).eq("id", attempt_id);
      await admin.from("bookings").update({ status: "assigned", assigned_helper_id: helperId }).eq("id", bookingId);
      await admin.from("helper_profiles").update({ status: "busy" }).eq("helper_id", helperId);

      return new Response(JSON.stringify({ success: true, status: "assigned" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      // Rejected
      await admin.from("assignment_attempts").update({ response: "rejected", responded_at: new Date().toISOString() }).eq("id", attempt_id);

      // Block helper for 2 minutes
      await admin.from("helper_blocks").insert({
        helper_id: helperId,
        booking_id: bookingId,
        blocked_until: new Date(Date.now() + 120000).toISOString(),
        reason: "rejected",
      });

      // Re-run assignment pipeline via RPC
      const { data: result, error: rpcErr } = await admin.rpc("request_next_assignment", {
        _booking_id: bookingId,
      });

      if (rpcErr) throw rpcErr;

      return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
