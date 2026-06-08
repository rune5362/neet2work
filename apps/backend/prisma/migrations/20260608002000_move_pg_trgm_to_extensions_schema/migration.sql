-- Supabase recommends keeping extensions out of the exposed public schema.
-- Existing trigram indexes keep referencing the extension objects by OID.

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;
