# Skillect

**A growth-focused social platform** where people discover interests, develop skills, share ideas, showcase projects, track progress, and connect with others who are learning and building.

> Worldwide platform for students, creators, developers, designers, freelancers, and lifelong learners.

---

## Status (Nov 2026)

| Area | Status |
|------|--------|
| GitHub as source of truth | ✅ |
| Supabase backend (Auth + DB + Storage + RLS) | ✅ |
| Email-only authentication + verification | ✅ |
| Password reset | ✅ |
| Profiles + onboarding | ✅ |
| Create posts (text + image/video upload) | ✅ |
| Feed | ✅ |
| Like / unlike | ✅ |
| Comments | ✅ |
| Follow / unfollow | ✅ |
| Explore + search people | ✅ |
| View other users | ✅ |
| Edit own profile | ✅ |
| Core Replit removal | ✅ |
| White + blue design on key screens | ✅ |
| Mobile native app | ⏳ Not started |
| App Store / Play Store packaging | ⏳ Pending |
| Messages / Communities | ⏳ Legacy (not fully migrated) |

---

## Tech Stack

- **Frontend**: Vite + React 19 + Tailwind + Radix UI + Wouter
- **Backend**: Supabase (Auth, PostgreSQL, Storage, RLS)
- **Auth**: Email + password only (mandatory email confirmation)
- **Storage**: `post-media` bucket for images/videos

---

## Setup

### 1. Clone

```bash
git clone https://github.com/sd9282726-rgb/Skillectt.git
cd Skillectt
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://chohswyxsckpwyzlbzav.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Run

```bash
pnpm --filter @workspace/skillect run dev
```

---

## Working features

1. Sign up → email confirmation → login / logout
2. Onboarding (name, bio, skills)
3. Create posts with categories, tags, and **direct image/video upload**
4. Feed with likes
5. Post detail + comments
6. Profile + edit profile
7. Explore people + follow/unfollow
8. View other user profiles

---

## Notes

- Never commit `.env` or service role keys
- Mobile app and store packaging remain the largest open items
- Some legacy pages (Messages, Communities) still need full cleanup

---

## License

Private / All rights reserved.
