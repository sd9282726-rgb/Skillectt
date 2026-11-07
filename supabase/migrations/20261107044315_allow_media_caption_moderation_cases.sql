ALTER TABLE public.moderation_text_cases
  DROP CONSTRAINT moderation_text_cases_content_type_check;

ALTER TABLE public.moderation_text_cases
  ADD CONSTRAINT moderation_text_cases_content_type_check
  CHECK (content_type = ANY (ARRAY['post'::text, 'comment'::text, 'message'::text, 'profile'::text, 'media_caption'::text]));
