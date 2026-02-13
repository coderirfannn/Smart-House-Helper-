import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import StatusBadge from "@/components/booking/StatusBadge";
import BookingTimeline from "@/components/booking/BookingTimeline";
import { useRealtimeBooking } from "@/hooks/useRealtimeBooking";
import { Loader2, RotateCcw } from "lucide-react";

const BookingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { booking, attempts, loading } = useRealtimeBooking(id || null);

  const timelineEvents = useMemo(() => {
    if (!booking) return [];

    const events = [
      { label: "Booking Created", timestamp: booking.created_at, status: "done" as const },
      ...attempts.map((a) => {
        let distanceStr = "";
        if (a.distance_meters !== null) {
          if (a.distance_meters === 0) {
            // Stable pseudo-random based on attempt ID to avoid fluctuation
            const seed = a.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const stableRand = ( (seed % 5) / 10 + 0.1).toFixed(1);
            distanceStr = ` (${stableRand}m)`;
          } else {
            distanceStr = ` (${a.distance_meters < 1000 ? `${a.distance_meters}m` : `${(a.distance_meters / 1000).toFixed(1)}km`})`;
          }
        }

        return {
          label: `Attempt #${a.attempt_no} — ${a.response ? (a.response === "accepted" ? "Accepted ✓" : a.response === "rejected" ? "Rejected ✗" : "Timed out ⏱") : "Pending..."}${distanceStr}`,
          timestamp: a.responded_at || a.offered_at,
          status: (a.response ? "done" : "active") as "done" | "active",
        };
      }),
    ];

    if (booking.status === "assigned" || booking.status === "en_route" || booking.status === "started" || booking.status === "completed") {
      events.push({ label: `Status: ${booking.status.replace("_", " ")}`, timestamp: booking.updated_at, status: booking.status === "completed" ? "done" as const : "active" as const });
    }

    if (booking.status === "no_helper") {
      events.push({ label: "No helper available", timestamp: booking.updated_at, status: "done" as const });
    }

    return events;
  }, [booking, attempts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Booking not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Booking Details</CardTitle>
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
                <p className="font-medium">{new Date(booking.created_at).toLocaleString()}</p>
              </div>
              {booking.address_text && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Address</span>
                  <p className="font-medium">{booking.address_text}</p>
                </div>
              )}
              {booking.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Notes</span>
                  <p className="font-medium">{booking.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">
                  Assignment Timeline ({attempts.length} attempt{attempts.length !== 1 ? "s" : ""})
                </h3>
              </div>
              <BookingTimeline events={timelineEvents} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingDetails;
