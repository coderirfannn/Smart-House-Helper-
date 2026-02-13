
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'helper', 'admin')),
  full_name text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Prevent role escalation via update
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Cannot change role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- Helper profiles
CREATE TABLE public.helper_profiles (
  helper_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  skills text[] NOT NULL DEFAULT ARRAY['cleaning']::text[],
  rating numeric DEFAULT 4.5,
  rating_count int DEFAULT 0,
  status text DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline')),
  last_location geography(Point, 4326),
  last_location_at timestamptz
);

-- Bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  service_type text NOT NULL,
  user_location geography(Point, 4326) NOT NULL,
  address_text text,
  notes text,
  status text DEFAULT 'searching' CHECK (status IN ('searching','offered','assigned','en_route','started','completed','cancelled','no_helper')),
  assigned_helper_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assignment attempts
CREATE TABLE public.assignment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  helper_id uuid NOT NULL REFERENCES public.profiles(id),
  attempt_no int NOT NULL,
  offered_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  response text CHECK (response IN ('accepted', 'rejected', 'timeout')),
  distance_meters int,
  helper_rating numeric
);

-- Helper blocks (temporary unavailability after reject/timeout)
CREATE TABLE public.helper_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.profiles(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  blocked_until timestamptz NOT NULL,
  reason text CHECK (reason IN ('rejected', 'timeout')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_helper_profiles_location ON public.helper_profiles USING GIST (last_location);
CREATE INDEX idx_helper_profiles_status ON public.helper_profiles (status);
CREATE INDEX idx_bookings_status_created ON public.bookings (status, created_at);
CREATE INDEX idx_assignment_attempts_booking_helper ON public.assignment_attempts (booking_id, helper_id);
CREATE INDEX idx_helper_blocks_helper_until ON public.helper_blocks (helper_id, blocked_until);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.helper_profiles;

-- Security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Updated_at trigger for bookings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- PROFILES
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- HELPER PROFILES
CREATE POLICY "Helpers read own" ON public.helper_profiles FOR SELECT USING (auth.uid() = helper_id);
CREATE POLICY "Admins read all helpers" ON public.helper_profiles FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users read assigned helper" ON public.helper_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE assigned_helper_id = helper_profiles.helper_id AND user_id = auth.uid())
);
CREATE POLICY "Helpers update own" ON public.helper_profiles FOR UPDATE USING (auth.uid() = helper_id);
CREATE POLICY "Helpers insert own" ON public.helper_profiles FOR INSERT WITH CHECK (auth.uid() = helper_id);

-- BOOKINGS
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Helpers read assigned bookings" ON public.bookings FOR SELECT USING (auth.uid() = assigned_helper_id);
CREATE POLICY "Helpers read offered bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.assignment_attempts WHERE booking_id = bookings.id AND helper_id = auth.uid())
);
CREATE POLICY "Admins read all bookings" ON public.bookings FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

-- ASSIGNMENT ATTEMPTS
CREATE POLICY "Users read own booking attempts" ON public.assignment_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE id = assignment_attempts.booking_id AND user_id = auth.uid())
);
CREATE POLICY "Helpers read own attempts" ON public.assignment_attempts FOR SELECT USING (auth.uid() = helper_id);
CREATE POLICY "Admins read all attempts" ON public.assignment_attempts FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- HELPER BLOCKS
CREATE POLICY "Helpers read own blocks" ON public.helper_blocks FOR SELECT USING (auth.uid() = helper_id);
CREATE POLICY "Admins read all blocks" ON public.helper_blocks FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- PostGIS function for finding available helpers (called by edge functions via RPC)
CREATE OR REPLACE FUNCTION public.find_available_helpers(
  _service_type text,
  _lng float,
  _lat float,
  _radius_meters float DEFAULT 5000,
  _excluded_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS TABLE(
  helper_id uuid,
  full_name text,
  skills text[],
  rating numeric,
  distance_meters float,
  last_location_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    hp.helper_id,
    p.full_name,
    hp.skills,
    hp.rating,
    ST_Distance(hp.last_location, ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography) as distance_meters,
    hp.last_location_at
  FROM public.helper_profiles hp
  JOIN public.profiles p ON p.id = hp.helper_id
  WHERE hp.status = 'available'
    AND _service_type = ANY(hp.skills)
    AND hp.last_location IS NOT NULL
    AND ST_DWithin(hp.last_location, ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography, _radius_meters)
    AND hp.helper_id != ALL(_excluded_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.helper_blocks hb
      WHERE hb.helper_id = hp.helper_id AND hb.blocked_until > now()
    )
  ORDER BY distance_meters ASC, hp.rating DESC
$$;
