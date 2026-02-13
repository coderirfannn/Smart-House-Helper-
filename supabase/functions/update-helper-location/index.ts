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

    const { lat, lng } = await req.json();
    if (lat == null || lng == null) return new Response(JSON.stringify({ error: "Missing lat/lng" }), { status: 400, headers: corsHeaders });

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify user is a helper
    const { data: profile } = await admin.from("profiles").select("role").eq("id", helperId).single();
    if (!profile || profile.role !== "helper") {
      return new Response(JSON.stringify({ error: "Not a helper" }), { status: 403, headers: corsHeaders });
    }

    const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;
    await admin.from("helper_profiles").update({
      last_location: locationWkt,
      last_location_at: new Date().toISOString(),
    }).eq("helper_id", helperId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
