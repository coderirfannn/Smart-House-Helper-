
-- Function to handle the next assignment step atomically
CREATE OR REPLACE FUNCTION public.request_next_assignment(_booking_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_next_helper record;
  v_excluded_ids uuid[];
  v_lat float;
  v_lng float;
  v_expires_at timestamptz;
  v_attempt_no int;
BEGIN
  -- 1. Get booking details
  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found');
  END IF;

  IF v_booking.status NOT IN ('searching', 'offered') THEN
    RETURN json_build_object('error', 'Booking not in valid state for assignment');
  END IF;

  -- 2. Get coordinates
  SELECT ST_Y(user_location::geometry), ST_X(user_location::geometry) 
  INTO v_lat, v_lng
  FROM public.bookings WHERE id = _booking_id;

  -- 3. Get already attempted helpers to exclude them
  SELECT array_agg(helper_id) INTO v_excluded_ids 
  FROM public.assignment_attempts 
  WHERE booking_id = _booking_id;
  
  IF v_excluded_ids IS NULL THEN
    v_excluded_ids := ARRAY[]::uuid[];
  END IF;

  -- 4. Find next best helper using existing logic
  SELECT * INTO v_next_helper 
  FROM public.find_available_helpers(
    v_booking.service_type,
    v_lng,
    v_lat,
    50000, -- 50km radius
    v_excluded_ids
  )
  LIMIT 1;

  IF NOT FOUND THEN
    -- No more helpers available
    UPDATE public.bookings SET status = 'no_helper', updated_at = now() WHERE id = _booking_id;
    RETURN json_build_object('status', 'no_helper');
  END IF;

  -- 5. Create new attempt
  v_attempt_no := COALESCE(array_length(v_excluded_ids, 1), 0) + 1;
  v_expires_at := now() + interval '30 seconds';

  INSERT INTO public.assignment_attempts (
    booking_id,
    helper_id,
    attempt_no,
    expires_at,
    distance_meters,
    helper_rating
  ) VALUES (
    _booking_id,
    v_next_helper.helper_id,
    v_attempt_no,
    v_expires_at,
    ROUND(v_next_helper.distance_meters),
    v_next_helper.rating
  );

  -- 6. Update booking status
  UPDATE public.bookings SET status = 'offered', updated_at = now() WHERE id = _booking_id;

  RETURN json_build_object(
    'status', 'offered',
    'helper_id', v_next_helper.helper_id,
    'attempt_no', v_attempt_no
  );
END;
$$;

-- Function to check all pending attempts and timeout those that expired
-- This can be called by a cron job or manually as a fallback
CREATE OR REPLACE FUNCTION public.check_all_timeouts()
RETURNS TABLE(booking_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
BEGIN
  FOR v_rec IN 
    SELECT id, booking_id, helper_id 
    FROM public.assignment_attempts 
    WHERE response IS NULL AND expires_at < now()
  LOOP
    -- 1. Mark as timeout
    UPDATE public.assignment_attempts 
    SET response = 'timeout', responded_at = now() 
    WHERE id = v_rec.id;

    -- 2. Block helper
    INSERT INTO public.helper_blocks (helper_id, booking_id, blocked_until, reason)
    VALUES (v_rec.helper_id, v_rec.booking_id, now() + interval '2 minutes', 'timeout');

    -- 3. Request next assignment
    PERFORM public.request_next_assignment(v_rec.booking_id);
    
    booking_id := v_rec.booking_id;
    status := 'timed_out_and_reassigned';
    RETURN NEXT;
  END LOOP;
END;
$$;

