INSERT INTO helper_profiles (helper_id, status, skills, rating, rating_count, last_location_at, last_location)
VALUES 
  ('8c82c2e1-f73b-4e01-a20f-2f422342bb51', 'available', ARRAY['cleaning', 'gardening'], 4.8, 25, now(), 'SRID=4326;POINT(77.2100 28.6200)'),
  ('e8e6e142-39a3-4e0e-be5f-52cd9096e4c5', 'offline', ARRAY['cooking', 'cleaning'], 4.6, 20, now(), 'SRID=4326;POINT(77.2050 28.6100)'),
  ('6b3d0197-e240-4011-8b4a-647a27d22abd', 'offline', ARRAY['plumbing', 'electrician'], 4.9, 30, now(), 'SRID=4326;POINT(77.2150 28.6180)'),
  ('19cbaa2b-7ac7-4627-a3c9-4b2f190c567f', 'offline', ARRAY['cleaning', 'cooking', 'gardening'], 4.3, 15, now(), 'SRID=4326;POINT(77.2000 28.6050)'),
  ('37cbde63-f4be-44c6-a180-429da1e2b912', 'offline', ARRAY['electrician', 'plumbing', 'painting'], 4.7, 28, now(), 'SRID=4326;POINT(77.2200 28.6250)')
ON CONFLICT DO NOTHING;