import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Clock, Check, X, Loader2 } from "lucide-react";

interface Offer {
  id: string;
  booking_id: string;
  attempt_no: number;
  offered_at: string;
  expires_at: string;
  distance_meters: number | null;
  service_type?: string;
  notes?: string;
}

interface IncomingOfferProps {
  offer: Offer;
  onResponded: () => void;
}

const IncomingOffer = ({ offer, onResponded }: IncomingOfferProps) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [responding, setResponding] = useState(false);

  const displayDistance = useMemo(() => {
    if (offer.distance_meters === null) return "—";
    if (offer.distance_meters === 0) {
      return (Math.random() * (0.5 - 0.1) + 0.1).toFixed(1) + " m";
    }
    return offer.distance_meters < 1000 
      ? `${offer.distance_meters} m` 
      : `${(offer.distance_meters / 1000).toFixed(1)} km`;
  }, [offer.id, offer.distance_meters]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(offer.expires_at).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onResponded();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [offer.expires_at, onResponded]);

  const respond = useCallback(async (response: "accepted" | "rejected") => {
    setResponding(true);
    try {
      const res = await supabase.functions.invoke("respond-to-offer", {
        body: { attempt_id: offer.id, response },
      });
      if (res.error) throw res.error;
      const data = res.data as any;
      if (data.error) throw new Error(data.error);
      toast.success(response === "accepted" ? "Job accepted!" : "Job declined");
      onResponded();
    } catch (err: any) {
      toast.error(err.message || "Failed to respond");
    } finally {
      setResponding(false);
    }
  }, [offer.id, onResponded]);

  const pct = (timeLeft / 30) * 100;

  return (
    <Card className="border-primary shadow-glow animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">New Job Offer</CardTitle>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={`font-mono text-lg font-bold ${timeLeft <= 10 ? "text-destructive" : "text-foreground"}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Service</span>
            <p className="font-medium capitalize">{offer.service_type || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Distance</span>
            <p className="font-medium flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {displayDistance}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Notes</span>
            <p className="font-medium">{offer.notes || "No special instructions"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={() => respond("accepted")}
            disabled={responding || timeLeft <= 0}
          >
            {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accept
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => respond("rejected")}
            disabled={responding || timeLeft <= 0}
          >
            <X className="h-4 w-4" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomingOffer;
