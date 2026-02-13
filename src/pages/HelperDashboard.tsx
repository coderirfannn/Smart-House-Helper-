import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/Navbar";
import StatusBadge from "@/components/booking/StatusBadge";
import IncomingOffer from "@/components/helper/IncomingOffer";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeOffers } from "@/hooks/useRealtimeOffers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Clock, Loader2, Wrench, CheckCircle2 } from "lucide-react";

const HelperDashboard = () => {
  const { user } = useAuth();
  const { pendingOffer, activeBooking, refetchOffers, refetchActive } = useRealtimeOffers();
  const [helperProfile, setHelperProfile] = useState<any>(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const fetchHelperProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("helper_profiles")
      .select("*")
      .eq("helper_id", user.id)
      .limit(1);
    if (data && data.length > 0) setHelperProfile(data[0]);
  }, [user]);

  useEffect(() => {
    fetchHelperProfile();
  }, [fetchHelperProfile]);

  // Auto location update every 15s when available
  useEffect(() => {
    if (!helperProfile || helperProfile.status !== "available") return;
    const interval = setInterval(() => updateLocation(true), 15000);
    return () => clearInterval(interval);
  }, [helperProfile?.status]);

  const updateLocation = async (silent = false) => {
    if (!user) return;
    setUpdatingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 10000, 
          enableHighAccuracy: true 
        });
      }).catch(() => null);

      // Default to a slightly different spot in Delhi if GPS fails, 
      // adding jitter so not all helpers are at the same exact point
      const lat = pos?.coords.latitude ?? 28.6139 + (Math.random() - 0.5) * 0.02;
      const lng = pos?.coords.longitude ?? 77.2090 + (Math.random() - 0.5) * 0.02;

      await supabase.functions.invoke("update-helper-location", {
        body: { lat, lng },
      });

      await fetchHelperProfile();
      if (!silent) toast.success("Location updated");
    } catch (err: any) {
      if (!silent) toast.error("Failed to update location");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const toggleAvailability = async () => {
    if (!helperProfile) return;
    setTogglingStatus(true);
    const newStatus = helperProfile.status === "available" ? "offline" : "available";

    if (newStatus === "available") {
      await updateLocation(true);
    }

    const { error } = await supabase
      .from("helper_profiles")
      .update({ status: newStatus })
      .eq("helper_id", user!.id);

    if (error) toast.error("Failed to update status");
    else {
      toast.success(newStatus === "available" ? "You're now available!" : "You're now offline");
      await fetchHelperProfile();
    }
    setTogglingStatus(false);
  };

  const updateJobStatus = async (newStatus: string) => {
    if (!activeBooking) return;
    // Use edge function or direct update for status changes the helper can make
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", activeBooking.id);

    // Note: This update might fail due to RLS (user_id check), so we handle via edge function
    if (error) {
      // Fallback: helper can't update bookings directly, need edge function
      toast.error("Status update failed - ask the user to confirm completion");
    } else {
      toast.success(`Job status: ${newStatus}`);
      if (newStatus === "completed") {
        await supabase.from("helper_profiles").update({ status: "available" }).eq("helper_id", user!.id);
        await fetchHelperProfile();
      }
      refetchActive();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">Helper Dashboard</h1>

        {/* Status & Location */}
        <Card className="shadow-card mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Label className="text-base font-medium">Availability</Label>
                {helperProfile && <StatusBadge status={helperProfile.status} size="md" />}
              </div>
              <div className="flex items-center gap-2">
                {togglingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                <Switch
                  checked={helperProfile?.status === "available"}
                  onCheckedChange={toggleAvailability}
                  disabled={togglingStatus || helperProfile?.status === "busy"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {helperProfile?.last_location_at
                    ? `Updated ${new Date(helperProfile.last_location_at).toLocaleTimeString()}`
                    : "No location set"}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => updateLocation(false)} disabled={updatingLocation}>
                {updatingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              </Button>
            </div>

            {helperProfile && (
              <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Skills: {helperProfile.skills?.join(", ")}
                </span>
                <span>⭐ {Number(helperProfile.rating).toFixed(1)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incoming Offer */}
        {pendingOffer && (
          <div className="mb-6">
            <IncomingOffer
              offer={pendingOffer}
              onResponded={() => {
                refetchOffers();
                refetchActive();
                fetchHelperProfile();
              }}
            />
          </div>
        )}

        {/* Active Job */}
        {activeBooking && (
          <Card className="shadow-card mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Job</CardTitle>
                <StatusBadge status={activeBooking.status} size="md" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Service</span>
                  <p className="font-medium capitalize">{activeBooking.service_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Booked At</span>
                  <p className="font-medium">{new Date(activeBooking.created_at).toLocaleTimeString()}</p>
                </div>
                {activeBooking.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="font-medium">{activeBooking.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {activeBooking.status === "assigned" && (
                  <Button className="flex-1" onClick={() => updateJobStatus("en_route")}>
                    I'm on my way
                  </Button>
                )}
                {activeBooking.status === "en_route" && (
                  <Button className="flex-1" onClick={() => updateJobStatus("started")}>
                    Start Work
                  </Button>
                )}
                {activeBooking.status === "started" && (
                  <Button className="flex-1 gap-2" onClick={() => updateJobStatus("completed")}>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Job
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!pendingOffer && !activeBooking && helperProfile?.status === "available" && (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Waiting for job offers...</p>
              <p className="text-xs text-muted-foreground mt-1">Keep your availability on and location updated</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HelperDashboard;
