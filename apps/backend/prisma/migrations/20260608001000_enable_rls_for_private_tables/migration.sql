-- Keep private application tables out of Supabase Data API access.
-- The Express backend uses a trusted direct database connection; browser
-- clients must not read or mutate these tables through anon/authenticated roles.

DO $$
DECLARE
  table_name text;
  data_api_roles text[];
  private_tables text[] := ARRAY[
    'users',
    'audit_logs',
    'refresh_tokens',
    'application_documents',
    'candidate_profiles',
    'application_sets'
  ];
BEGIN
  SELECT array_agg(quote_ident(rolname))
    INTO data_api_roles
    FROM pg_roles
   WHERE rolname IN ('anon', 'authenticated');

  FOREACH table_name IN ARRAY private_tables LOOP
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

  IF coalesce(array_length(data_api_roles, 1), 0) > 0 THEN
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM %s',
      array_to_string(data_api_roles, ', ')
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM %s',
      array_to_string(data_api_roles, ', ')
    );
  END IF;
END
$$;
