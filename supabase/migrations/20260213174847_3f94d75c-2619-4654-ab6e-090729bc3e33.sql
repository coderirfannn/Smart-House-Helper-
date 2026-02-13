-- Disable PostgREST exposure on PostGIS system tables (they don't need RLS)
REVOKE SELECT ON public.geography_columns FROM anon;
REVOKE SELECT ON public.geography_columns FROM authenticated;
REVOKE SELECT ON public.geometry_columns FROM anon;
REVOKE SELECT ON public.geometry_columns FROM authenticated;
REVOKE SELECT ON public.spatial_ref_sys FROM anon;
REVOKE SELECT ON public.spatial_ref_sys FROM authenticated;
