# Supabase Setup for Skillect

## Project

- **Name**: Skillect
- **Ref**: `chohswyxsckpwyzlbzav`
- **URL**: `https://chohswyxsckpwyzlbzav.supabase.co`
- **Region**: eu-west-2

## Apply Database Schema

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/chohswyxsckpwyzlbzav/sql)
2. Copy the contents of `migrations/001_initial_schema.sql`
3. Run the entire script

This will create:

- `profiles`, `posts`, `post_likes`, `comments`, `follows`, `saved_posts`, `projects`, `notifications`, `reports`, `blocks`
- Automatic profile creation on signup
- Full Row Level Security (RLS) policies

## Authentication Settings (Required)

Go to **Authentication → Providers** and make sure:

- **Email** is enabled
- **Confirm email** is **ON** (mandatory verification)
- Disable Google, Apple, GitHub, and any other social providers

### Redirect URLs

Add these under **Authentication → URL Configuration**:

- Site URL: `http://localhost:5173` (dev) and your production domain
- Redirect URLs:
  - `http://localhost:5173/**`
  - `https://your-production-domain.com/**`
  - Mobile deep link scheme (later)

### Email Templates

Customize the confirmation and password-reset email templates under **Authentication → Email Templates**.

## Environment Variables

See root `.env.example`.

Never commit the **Service Role** key.
