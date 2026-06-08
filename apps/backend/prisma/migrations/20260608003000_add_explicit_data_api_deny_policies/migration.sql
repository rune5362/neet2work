-- Make Data API denial explicit for backend-only tables that already had RLS.

DO $$
DECLARE
  table_name text;
  data_api_roles text[];
  backend_only_tables text[] := ARRAY[
    '_prisma_migrations',
    'job_postings',
    'resume_analyses'
  ];
BEGIN
  SELECT array_agg(quote_ident(rolname))
    INTO data_api_roles
    FROM pg_roles
   WHERE rolname IN ('anon', 'authenticated');

  FOREACH table_name IN ARRAY backend_only_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    IF coalesce(array_length(data_api_roles, 1), 0) > 0 THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s',
        table_name,
        array_to_string(data_api_roles, ', ')
      );
      EXECUTE format('DROP POLICY IF EXISTS "No direct Data API access" ON public.%I', table_name);
      EXECUTE format(
        'CREATE POLICY "No direct Data API access" ON public.%I FOR ALL TO %s USING (false) WITH CHECK (false)',
        table_name,
        array_to_string(data_api_roles, ', ')
      );
    END IF;
  END LOOP;
END
$$;
