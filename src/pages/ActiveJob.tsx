import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import StatusBadge from "@/components/booking/StatusBadge";
import BookingTimeline from "@/components/booking/BookingTimeline";
import { useRealtimeBooking } from "@/hooks/useRealtimeBooking";
import { Loader2 } from "lucide-react";

const ActiveJob = () => {
  const { id } = useParams<{ id: string }>();
  const { booking, loading } = useRealtimeBooking(id || null);

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
          <p className="text-muted-foreground">Job not found</p>
        </div>
      </div>
    );
  }

  const steps = ["assigned", "en_route", "started", "completed"];
  const currentIndex = steps.indexOf(booking.status);

  const events = steps.map((s, i) => ({
    label: s === "en_route" ? "On the Way" : s.charAt(0).toUpperCase() + s.slice(1),
    status: (i < currentIndex ? "done" : i === currentIndex ? "active" : "pending") as "done" | "active" | "pending",
    timestamp: i <= currentIndex ? booking.updated_at : undefined,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Job</CardTitle>
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
                <span className="text-muted-foreground">Booked</span>
                <p className="font-medium">{new Date(booking.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
            <BookingTimeline events={events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActiveJob;
