import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Booking {
  id: string;
  user_id: string;
  service_type: string;
  status: string;
  assigned_helper_id: string | null;
  address_text: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useRealtimeBooking = (bookingId: string | null) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    if (data) setBooking(data as any);
    setLoading(false);
  }, [bookingId]);

  const fetchAttempts = useCallback(async () => {
    if (!bookingId) return;
    const { data } = await supabase
      .from("assignment_attempts")
      .select("*")
      .eq("booking_id", bookingId)
      .order("attempt_no", { ascending: true });
    if (data) setAttempts(data);
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
    fetchAttempts();

    if (!bookingId) return;

    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `id=eq.${bookingId}`,
      }, (payload) => {
        setBooking(payload.new as any);
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "assignment_attempts",
        filter: `booking_id=eq.${bookingId}`,
      }, () => {
        fetchAttempts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId, fetchBooking, fetchAttempts]);

  // Check for offer timeout and trigger reassignment
  const checkTimeout = useCallback(async () => {
    if (!bookingId) return;
    try {
      await supabase.functions.invoke("check-timeout", {
        body: { booking_id: bookingId },
      });
    } catch {}
  }, [bookingId]);

  return { booking, attempts, loading, checkTimeout, refetch: fetchBooking };
};
