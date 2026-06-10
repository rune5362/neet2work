-- Supabase recommends keeping extensions out of the exposed public schema.
-- Existing trigram indexes keep referencing the extension objects by OID.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  BEGIN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping pg_trgm schema move because the migration role does not own the extension.';
  END;
END
$$;
