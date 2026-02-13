-- Fix infinite RLS recursion by using SECURITY DEFINER helper functions

-- Helper function: Check if helper has read access to a booking (via assignment attempts)
CREATE OR REPLACE FUNCTION public.can_helper_read_booking(_helper_id uuid, _booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM assignment_attempts
    WHERE booking_id = _booking_id AND helper_id = _helper_id
  )
$$;

-- Helper function: Check if user has read access to an attempt (via their booking)
CREATE OR REPLACE FUNCTION public.can_user_read_attempt(_user_id uuid, _booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = _booking_id AND user_id = _user_id
  )
$$;

-- Drop and recreate the problematic policies using the helper functions

DROP POLICY IF EXISTS "Helpers read offered bookings" ON bookings;
CREATE POLICY "Helpers read offered bookings"
ON bookings
FOR SELECT
USING (public.can_helper_read_booking(auth.uid(), id));

DROP POLICY IF EXISTS "Users read own booking attempts" ON assignment_attempts;
CREATE POLICY "Users read own booking attempts"
ON assignment_attempts
FOR SELECT
USING (public.can_user_read_attempt(auth.uid(), booking_id));
