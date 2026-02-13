import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Demo credentials
    const demoPassword = "demo123456";

    // Check if demo user exists
    const { data: existingUsers } = await admin.from("profiles").select("id").eq("full_name", "Demo User").limit(1);
    if (existingUsers && existingUsers.length > 0) {
      return new Response(JSON.stringify({ message: "Demo data already exists" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create demo user
    const { data: demoUser, error: userErr } = await admin.auth.admin.createUser({
      email: "demo-user@smarthelper.app",
      password: demoPassword,
      email_confirm: true,
      user_metadata: { role: "user", full_name: "Demo User" },
    });
    if (userErr) throw userErr;

    await admin.from("profiles").insert({ id: demoUser.user.id, role: "user", full_name: "Demo User", phone: "+1234567890" });

    // Create demo helpers
    const helperData = [
      { email: "demo-helper1@smarthelper.app", name: "Raj Kumar", skills: ["cleaning", "gardening"], rating: 4.8, lat: 28.6200, lng: 77.2100 },
      { email: "demo-helper2@smarthelper.app", name: "Priya Sharma", skills: ["cooking", "cleaning"], rating: 4.6, lat: 28.6100, lng: 77.2050 },
      { email: "demo-helper3@smarthelper.app", name: "Amit Singh", skills: ["plumbing", "electrician"], rating: 4.9, lat: 28.6180, lng: 77.2150 },
      { email: "demo-helper4@smarthelper.app", name: "Sunita Devi", skills: ["cleaning", "cooking", "gardening"], rating: 4.3, lat: 28.6050, lng: 77.2000 },
      { email: "demo-helper5@smarthelper.app", name: "Vikram Patel", skills: ["electrician", "plumbing", "painting"], rating: 4.7, lat: 28.6250, lng: 77.2200 },
    ];

    for (const h of helperData) {
      const { data: helperUser, error: hErr } = await admin.auth.admin.createUser({
        email: h.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { role: "helper", full_name: h.name },
      });
      if (hErr) { console.error("Helper create error:", hErr.message); continue; }

      await admin.from("profiles").insert({ id: helperUser.user.id, role: "helper", full_name: h.name });
      await admin.from("helper_profiles").insert({
        helper_id: helperUser.user.id,
        skills: h.skills,
        rating: h.rating,
        rating_count: Math.floor(Math.random() * 50) + 10,
        status: "available",
        last_location: `SRID=4326;POINT(${h.lng} ${h.lat})`,
        last_location_at: new Date().toISOString(),
      });
    }

    // Create demo admin
    const { data: adminUser, error: adminErr } = await admin.auth.admin.createUser({
      email: "demo-admin@smarthelper.app",
      password: demoPassword,
      email_confirm: true,
      user_metadata: { role: "admin", full_name: "Admin" },
    });
    if (!adminErr && adminUser) {
      await admin.from("profiles").insert({ id: adminUser.user.id, role: "admin", full_name: "Admin" });
    }

    return new Response(JSON.stringify({ message: "Demo data seeded successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
