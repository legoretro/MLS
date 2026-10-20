-- One shared correction mark per question, visible in the admin question bank.
-- The existing question-table policies permit public updates, matching the
-- public mark/undo control already requested for this study site.
alter table public.mlsboc_questions
  add column if not exists needs_correction boolean not null default false;

create index if not exists mlsboc_questions_needs_correction_idx
  on public.mlsboc_questions (subject, created_at)
  where needs_correction;
