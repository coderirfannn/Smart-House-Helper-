import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useRealtimeOffers = () => {
  const { user } = useAuth();
  const [pendingOffer, setPendingOffer] = useState<any | null>(null);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);

  const fetchPendingOffer = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("assignment_attempts")
      .select("*")
      .eq("helper_id", user.id)
      .is("response", null)
      .gte("expires_at", new Date().toISOString())
      .order("offered_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const attempt = data[0];
      // Fetch booking details for the offer
      const { data: booking } = await supabase
        .from("bookings")
        .select("service_type, notes, address_text")
        .eq("id", attempt.booking_id)
        .single();
      setPendingOffer({ ...attempt, ...(booking || {}) });
    } else {
      setPendingOffer(null);
    }
  }, [user]);

  const fetchActiveBooking = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_helper_id", user.id)
      .in("status", ["assigned", "en_route", "started"])
      .order("updated_at", { ascending: false })
      .limit(1);
    setActiveBooking(data && data.length > 0 ? data[0] : null);
  }, [user]);

  useEffect(() => {
    fetchPendingOffer();
    fetchActiveBooking();

    if (!user) return;

    const channel = supabase
      .channel(`helper-offers-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "assignment_attempts",
        filter: `helper_id=eq.${user.id}`,
      }, () => {
        fetchPendingOffer();
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "bookings",
        filter: `assigned_helper_id=eq.${user.id}`,
      }, () => {
        fetchActiveBooking();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPendingOffer, fetchActiveBooking]);

  return { pendingOffer, activeBooking, refetchOffers: fetchPendingOffer, refetchActive: fetchActiveBooking };
};
