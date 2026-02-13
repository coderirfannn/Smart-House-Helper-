import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SERVICE_TYPES = [
  { value: "cleaning", label: "🧹 Cleaning" },
  { value: "plumbing", label: "🔧 Plumbing" },
  { value: "cooking", label: "🍳 Cooking" },
  { value: "electrician", label: "⚡ Electrician" },
  { value: "gardening", label: "🌿 Gardening" },
  { value: "painting", label: "🎨 Painting" },
];

interface BookingFormProps {
  onBookingCreated: (bookingId: string) => void;
}

const BookingForm = ({ onBookingCreated }: BookingFormProps) => {
  const { session } = useAuth();
  const [serviceType, setServiceType] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location detected");
      },
      () => {
        // Fallback with a slight random jitter to avoid exactly 0km distance in demo
        const lat = 28.6139 + (Math.random() - 0.5) * 0.005;
        const lng = 77.2090 + (Math.random() - 0.5) * 0.005;
        setCoords({ lat, lng });
        setLocating(false);
        toast.info("Using estimated location (New Delhi)");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType) return toast.error("Select a service type");
    if (!coords) return toast.error("Please detect your location first");
    if (!session) return toast.error("Please sign in");

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("create-booking", {
        body: {
          service_type: serviceType,
          lat: coords.lat,
          lng: coords.lng,
          address_text: address || undefined,
          notes: notes || undefined,
        },
      });

      if (res.error) throw res.error;
      const data = res.data as any;
      if (data.error) throw new Error(data.error);
      
      toast.success("Booking created! Searching for helpers...");
      onBookingCreated(data.booking_id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Service Type</Label>
        <Select value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger>
            <SelectValue placeholder="What do you need help with?" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Your Location</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={getLocation} disabled={locating} className="gap-2">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {coords ? "Location Set ✓" : "Detect Location"}
          </Button>
          {coords && (
            <span className="text-xs text-muted-foreground self-center">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address (optional)</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 123 Main St, Apt 4B" />
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions..." rows={3} />
      </div>

      <Button type="submit" className="w-full" disabled={loading || !serviceType || !coords}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Book Now
      </Button>
    </form>
  );
};

export default BookingForm;
