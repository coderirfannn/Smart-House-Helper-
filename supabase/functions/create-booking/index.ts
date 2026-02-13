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

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = user.id;

    const { service_type, lat, lng, address_text, notes } = await req.json();
    if (!service_type || lat == null || lng == null) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Create booking
    const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .insert({
        user_id: userId,
        service_type,
        user_location: locationWkt,
        address_text: address_text || null,
        notes: notes || null,
        status: "searching",
      })
      .select("id")
      .single();

    if (bookingErr) throw bookingErr;

    // Run assignment pipeline via RPC
    const { data: result, error: rpcErr } = await admin.rpc("request_next_assignment", {
      _booking_id: booking.id,
    });

    if (rpcErr) throw rpcErr;

    return new Response(JSON.stringify({ booking_id: booking.id, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
