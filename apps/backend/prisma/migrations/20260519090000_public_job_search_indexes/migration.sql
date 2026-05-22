-- Public job list/search helpers.
-- Apply only after reviewing the current Supabase database plan.

create extension if not exists pg_trgm;

create index if not exists job_postings_active_collected_idx
  on public.job_postings (collected_at desc nulls last, created_at desc)
  where status = 'active';

create index if not exists job_postings_active_source_idx
  on public.job_postings (source)
  where status = 'active';

create index if not exists job_postings_active_country_idx
  on public.job_postings (country)
  where status = 'active';

create index if not exists job_postings_active_language_idx
  on public.job_postings (language)
  where status = 'active';

create index if not exists job_postings_active_title_trgm_idx
  on public.job_postings using gin (title gin_trgm_ops)
  where status = 'active';

create index if not exists job_postings_active_company_trgm_idx
  on public.job_postings using gin (company gin_trgm_ops)
  where status = 'active';

create index if not exists job_postings_active_description_trgm_idx
  on public.job_postings using gin (description gin_trgm_ops)
  where status = 'active';
