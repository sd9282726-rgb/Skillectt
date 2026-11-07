-- Cover foreign-key columns that are used in joins/deletes and remove the
-- duplicate notifications(user_id, created_at DESC) index.
create index if not exists account_enforcements_issued_by_idx on public.account_enforcements (issued_by);
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);
create index if not exists comments_author_id_idx on public.comments (author_id);
create index if not exists comments_parent_id_idx on public.comments (parent_id);
create index if not exists communities_created_by_idx on public.communities (created_by);
create index if not exists community_members_user_id_idx on public.community_members (user_id);
create index if not exists conversation_participants_user_id_idx on public.conversation_participants (user_id);
create index if not exists conversation_reads_user_id_idx on public.conversation_reads (user_id);
create index if not exists conversations_created_by_idx on public.conversations (created_by);
create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);
create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists media_assets_owner_id_idx on public.media_assets (owner_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists moderation_actions_moderator_id_idx on public.moderation_actions (moderator_id);
create index if not exists moderation_actions_target_user_id_idx on public.moderation_actions (target_user_id);
create index if not exists moderation_appeals_enforcement_user_id_idx on public.moderation_appeals (enforcement_user_id);
create index if not exists moderation_appeals_reviewed_by_idx on public.moderation_appeals (reviewed_by);
create index if not exists moderation_appeals_user_id_idx on public.moderation_appeals (user_id);
create index if not exists moderation_evidence_target_user_id_idx on public.moderation_evidence (target_user_id);
create index if not exists moderation_text_cases_reviewed_by_idx on public.moderation_text_cases (reviewed_by);
create index if not exists moderation_text_cases_user_id_idx on public.moderation_text_cases (user_id);
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists post_likes_user_id_idx on public.post_likes (user_id);
create index if not exists projects_author_id_idx on public.projects (author_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_target_user_id_idx on public.reports (target_user_id);
create index if not exists saved_posts_post_id_idx on public.saved_posts (post_id);

drop index if exists public.notifications_user_id_idx;
