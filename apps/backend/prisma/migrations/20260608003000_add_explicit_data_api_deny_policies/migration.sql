-- Make Data API denial explicit for backend-only tables that already had RLS.

DO $$
DECLARE
  table_name text;
  backend_only_tables text[] := ARRAY[
    '_prisma_migrations',
    'job_postings',
    'resume_analyses'
  ];
BEGIN
  FOREACH table_name IN ARRAY backend_only_tables LOOP
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
