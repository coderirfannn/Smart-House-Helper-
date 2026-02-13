-- Enable RLS on any tables in public schema that might be missing it
ALTER TABLE public.assignment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helper_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helper_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
