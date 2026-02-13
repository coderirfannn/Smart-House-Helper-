import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import BookingForm from "@/components/booking/BookingForm";
import StatusBadge from "@/components/booking/StatusBadge";
import BookingTimeline from "@/components/booking/BookingTimeline";
import { useRealtimeBooking } from "@/hooks/useRealtimeBooking";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, Star, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

const UserDashboard = () => {
  const { user } = useAuth();
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const { booking, attempts, checkTimeout } = useRealtimeBooking(activeBookingId);

  // Fetch most recent active booking
  const fetchActiveBooking = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["searching", "offered", "assigned", "en_route", "started"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) setActiveBookingId(data.id);
  }, [user]);

  const fetchPastBookings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["completed", "cancelled", "no_helper"])
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setPastBookings(data);
  }, [user]);

  useEffect(() => {
    fetchActiveBooking();
    fetchPastBookings();
    
    // Fallback: check all timeouts globally when dashboard loads
    // This helps "heal" any stuck bookings in the system
    supabase.functions.invoke("check-timeout", { body: { global: true } }).catch(() => {});
  }, [fetchActiveBooking, fetchPastBookings]);

  // Auto-check timeout when booking is in offered status
  useEffect(() => {
    if (!booking || booking.status !== "offered") return;
    const latestAttempt = attempts[attempts.length - 1];
    if (!latestAttempt || latestAttempt.response) return;

    const expiresAt = new Date(latestAttempt.expires_at).getTime();
    const delay = Math.max(0, expiresAt - Date.now() + 2000); // 2s buffer

    const timer = setTimeout(() => {
      checkTimeout();
      toast.info("No response, searching for another helper...");
    }, delay);

    return () => clearTimeout(timer);
  }, [booking, attempts, checkTimeout]);

  const buildTimeline = () => {
    if (!booking) return [];
    const events: any[] = [];
    const s = booking.status;

    events.push({ label: "Booking Created", timestamp: booking.created_at, status: "done" as const });

    if (["searching", "offered", "assigned", "en_route", "started", "completed"].includes(s)) {
      const isActive = s === "searching" || s === "offered";
      events.push({
        label: `Searching for Helper${attempts.length > 0 ? ` (${attempts.length} attempt${attempts.length > 1 ? "s" : ""})` : ""}`,
        status: isActive ? "active" as const : "done" as const,
      });
    }

    if (["assigned", "en_route", "started", "completed"].includes(s)) {
      events.push({ label: "Helper Assigned", timestamp: booking.updated_at, status: "done" as const });
    } else if (s === "offered") {
      events.push({ label: "Waiting for Response", status: "active" as const });
    }

    if (["en_route", "started", "completed"].includes(s)) {
      events.push({ label: "Helper En Route", status: s === "en_route" ? "active" as const : "done" as const });
    }

    if (["started", "completed"].includes(s)) {
      events.push({ label: "Work Started", status: s === "started" ? "active" as const : "done" as const });
    }

    if (s === "completed") {
      events.push({ label: "Completed", status: "done" as const });
    }

    if (s === "cancelled") {
      events.push({ label: "Cancelled", status: "done" as const });
    }

    if (s === "no_helper") {
      events.push({ label: "No Helper Available", status: "done" as const });
    }

    return events;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Booking Form or Active Booking */}
          <div>
            {booking && ["searching", "offered", "assigned", "en_route", "started"].includes(booking.status) ? (
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Booking</CardTitle>
                    <StatusBadge status={booking.status as any} size="md" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Service</span>
                      <p className="font-medium capitalize">{booking.service_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <p className="font-medium">{new Date(booking.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  {booking.status === "searching" && (
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">Searching for the best available helper...</span>
                    </div>
                  )}

                  {booking.assigned_helper_id && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Helper Assigned</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Star className="h-3 w-3" /> Rated helper
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Link to={`/booking/${booking.id}`}>
                    <Button variant="outline" size="sm" className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Book a Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingForm onBookingCreated={(id) => {
                    setActiveBookingId(id);
                  }} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timeline */}
          <div>
            {booking && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Booking Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingTimeline events={buildTimeline()} />
                </CardContent>
              </Card>
            )}

            {/* Past Bookings */}
            <Card className="shadow-card mt-6">
              <CardHeader>
                <CardTitle>Past Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {pastBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No past bookings yet</p>
                ) : (
                  <div className="space-y-3">
                    {pastBookings.map((b) => (
                      <Link to={`/booking/${b.id}`} key={b.id}>
                        <div className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium capitalize text-foreground">{b.service_type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
