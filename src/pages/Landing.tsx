import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import { Zap, Clock, MapPin, Star, ArrowRight, Shield, Users, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";

const SERVICES = [
  { icon: "🧹", name: "Cleaning", desc: "Deep clean, regular maintenance" },
  { icon: "🔧", name: "Plumbing", desc: "Repairs, installations, leaks" },
  { icon: "🍳", name: "Cooking", desc: "Home meals, party prep" },
  { icon: "⚡", name: "Electrician", desc: "Wiring, fixtures, repairs" },
  { icon: "🌿", name: "Gardening", desc: "Lawn care, landscaping" },
  { icon: "🎨", name: "Painting", desc: "Interior, exterior painting" },
];

const STEPS = [
  { icon: MapPin, title: "Share Location", desc: "We detect your GPS or you enter an address" },
  { icon: Zap, title: "Auto-Match", desc: "Our algorithm finds the nearest skilled helper in seconds" },
  { icon: Clock, title: "15-Min Promise", desc: "Your matched helper arrives within 15 minutes" },
  { icon: Star, title: "Rate & Review", desc: "Help us maintain quality by rating your experience" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async (role: "user" | "helper") => {
    setDemoLoading(true);
    try {
      // First seed demo data
      await supabase.functions.invoke("seed-demo-data", { body: {} });

      const email = role === "user" ? "demo-user@smarthelper.app" : "demo-helper1@smarthelper.app";
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "demo123456",
      });
      if (error) throw error;
      toast.success(`Logged in as demo ${role}`);
      setTimeout(() => navigate(role === "user" ? "/dashboard" : "/helper"), 500);
    } catch (err: any) {
      toast.error("Demo login failed: " + (err.message || "Try signing up first"));
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.06]" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Zap className="h-4 w-4" />
              Auto-assigned in under 30 seconds
            </div> */}
            <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight mb-6">
              House Help at Your Door in{" "}
              <span className="text-primary">15 Minutes</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Book cleaning, plumbing, cooking, or any service — our smart system auto-assigns the
              nearest available, highest-rated helper instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user && profile ? (
                <Link to={profile.role === "helper" ? "/helper" : "/dashboard"}>
                  <Button size="lg" className="gap-2 px-8">
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth?tab=signup">
                  <Button size="lg" className="gap-2 px-8">
                    Book a Service <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={() => handleDemoLogin("user")} disabled={demoLoading}>
                  {demoLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Demo User
                </Button>
                <Button variant="outline" size="lg" onClick={() => handleDemoLogin("helper")} disabled={demoLoading}>
                  Demo Helper
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="text-center h-full shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="pt-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Step {i + 1}</div>
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Our Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
              >
                <Card className="cursor-pointer shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5">
                  <CardContent className="p-5 flex items-center gap-4">
                    <span className="text-3xl">{s.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            {[
              { icon: Shield, label: "Verified Helpers", desc: "Background-checked professionals" },
              { icon: Clock, label: "30s Assignment", desc: "Auto-matched, no waiting" },
              { icon: Users, label: "1000+ Helpers", desc: "Always someone nearby" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3">
                <item.icon className="h-8 w-8 text-primary" />
                <h3 className="font-semibold text-foreground">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 SmartHelper. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
