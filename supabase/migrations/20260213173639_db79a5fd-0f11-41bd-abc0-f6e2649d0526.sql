
-- Allow helpers to update bookings assigned to them
CREATE POLICY "Helpers update assigned bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = assigned_helper_id);

-- Function to extract lat/lng from a booking's user_location
CREATE OR REPLACE FUNCTION public.get_booking_location(_booking_id uuid)
RETURNS TABLE(lat float, lng float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ST_Y(user_location::geometry) as lat,
    ST_X(user_location::geometry) as lng
  FROM public.bookings
  WHERE id = _booking_id
$$;
