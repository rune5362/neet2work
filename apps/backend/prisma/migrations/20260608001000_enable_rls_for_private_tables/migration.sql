-- Keep private application tables out of Supabase Data API access.
-- The Express backend uses a trusted direct database connection; browser
-- clients must not read or mutate these tables through anon/authenticated roles.

DO $$
DECLARE
  table_name text;
  private_tables text[] := ARRAY[
    'users',
    'audit_logs',
    'refresh_tokens',
    'application_documents',
    'candidate_profiles',
    'application_sets'
  ];
BEGIN
  FOREACH table_name IN ARRAY private_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "No direct Data API access" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "No direct Data API access" ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      table_name
    );
  END LOOP;
END
$$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;
