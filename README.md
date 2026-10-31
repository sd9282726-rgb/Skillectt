# Skillect

**A growth-focused social platform** where people discover interests, develop skills, share ideas, showcase projects, track progress, and connect with others who are learning and building.

> Worldwide platform for students, creators, developers, designers, freelancers, and lifelong learners.

---

## Current Migration Status (Oct 2026)

| Area | Status |
|------|--------|
| GitHub as source of truth | ✅ Done |
| Supabase project connected | ✅ Done |
| Replit removal | 🔄 In progress |
| Clerk → Supabase Auth (email only) | 🔄 In progress |
| Database schema + RLS | 🔄 In progress |
| Website (preserve + integrate) | Pending |
| Mobile app completion | Pending |
| White + colourful design system | Pending |
| Google Play / Amazon Appstore prep | Pending |

---

## Tech Stack (Target)

- **Frontend (Web)**: Vite + React 19 + Tailwind CSS + Radix UI
- **Backend**: Supabase (Auth + PostgreSQL + Storage + RLS)
- **Auth**: Email + Password only (mandatory email verification)
- **Mobile**: To be completed (Expo / React Native)
- **Hosting**: GitHub + appropriate static/hosting provider for web

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/sd9282726-rgb/Skillectt.git
cd Skillectt
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
```

Fill in the values from your Supabase project (Project Settings → API).

### 3. Supabase Project

- Project Ref: `chohswyxsckpwyzlbzav`
- URL: `https://chohswyxsckpwyzlbzav.supabase.co`

### 4. Development

```bash
# Web frontend
pnpm --filter @workspace/skillect run dev

# Typecheck
pnpm run typecheck
```

---

## Important Notes

- **Never commit** `.env`, service role keys, or PATs.
- Authentication is being migrated from **Clerk** to **Supabase Auth (email only)**.
- The existing website design and functionality will be preserved where possible.
- White is the primary background colour with colourful accents (blue, purple, pink, orange, yellow).

---

## License

Private / All rights reserved.
