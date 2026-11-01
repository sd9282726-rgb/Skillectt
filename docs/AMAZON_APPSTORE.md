# Amazon Appstore — Skillect submission guide

**Priority: Amazon first. Google Play later.**

---

## 1. What Amazon needs

| Item | Requirement |
|------|-------------|
| Binary | Signed **APK** (or Android App Bundle) |
| Package name | `com.skillect.app` |
| App name | Skillect |
| Icon | 512×512 PNG |
| Screenshots | At least 3 (phone); tablet optional |
| Description | Short + full |
| Privacy policy URL | **Required** (public HTTPS page) |
| Content rating | Amazon questionnaire |
| Target age | 13+ recommended |
| Support contact | Email |

Amazon accepts standard Android APKs. You do **not** need Fire OS–specific code for a normal phone/tablet app.

---

## 2. Build the Amazon APK (on your machine)

### One-time setup

```bash
# Install Expo / EAS CLI
npm install -g eas-cli

# Login
eas login

cd mobile

# Create Expo project linkage (first time)
eas init

# Install deps
npm install
# or: npx expo install expo-secure-store @react-native-async-storage/async-storage react-native-url-polyfill @supabase/supabase-js
```

Create `mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://chohswyxsckpwyzlbzav.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNob2hzd3l4c2NrcHd5emxiemF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzU0NDIsImV4cCI6MjEwOTAxMTQ0Mn0.DLuDDy5khFJUsYnixHfy6sdJoNB00EUk68pRWnnFRVA
```

### Production APK for Amazon

```bash
cd mobile
eas build --platform android --profile amazon
```

When the build finishes, download the **APK** from the Expo dashboard.

That APK is what you upload to Amazon.

---

## 3. Amazon Developer Console steps

1. Go to [https://developer.amazon.com](https://developer.amazon.com) → sign in / create account  
2. **Apps & Services** → **My Apps** → **Add New App** → **Android**  
3. App title: **Skillect**  
4. Upload the APK from EAS  
5. Fill store listing:

### Suggested short description (≤ 1500 chars for some fields; keep short for “short description”)

> Skillect is a growth-focused social app where people learn skills, share progress, post projects, and connect with others who are building and improving.

### Suggested full description

> Skillect helps students, creators, developers, designers, and lifelong learners grow together.
>
> - Share learning updates and projects  
> - Follow people with similar skills  
> - Discover growth-focused content  
> - Build your public learning journey  
>
> Sign up with email, verify your account, and start posting. White, clean design with colourful accents.
>
> Minimum age: 13+. Report and block tools are available for safety.

6. **Category**: Social Networking or Education  
7. **Privacy policy URL**: host a page (see section 5)  
8. **Content rating**: complete Amazon’s questionnaire  
9. **Target audience**: 13+  
10. Submit for review  

---

## 4. Assets checklist (you must create these)

| Asset | Spec |
|-------|------|
| App icon | 512×512 PNG, no transparency preferred for some stores |
| Feature / promo images | Optional but recommended |
| Phone screenshots | Min 3; show Feed, Create, Profile |
| Privacy policy | Public URL |

Place icons in:

- `mobile/assets/icon.png`
- `mobile/assets/adaptive-icon.png`
- `mobile/assets/splash.png`

---

## 5. Privacy policy (required)

You need a live HTTPS page. Minimal content to cover:

- App name: Skillect  
- Data collected: email, profile (name, bio, skills), posts, media uploads  
- Backend: Supabase (region eu-west-2)  
- Auth: email + password  
- Contact: your support email  
- Account deletion: how users request deletion  

Host on GitHub Pages, Notion public page, or your domain.

---

## 6. Package identity (do not change after publish)

- **Application ID**: `com.skillect.app`  
- **Version name**: `1.0.0`  
- **Version code**: `1` (increase for every new Amazon upload)

Defined in `mobile/app.json`.

---

## 7. After Amazon is live — Google Play (later)

Use the same codebase:

```bash
eas build --platform android --profile production   # produces AAB
```

Upload the **AAB** to Google Play Console. Same package name `com.skillect.app`.

See `docs/STORE_PREP.md` for Play-specific steps.

---

## 8. What I cannot do without your accounts

- Log into Amazon Developer Console for you  
- Upload the APK  
- Create a privacy policy domain  
- Generate final 512×512 marketing icons/screenshots from device UI  

I **can** prepare the project config, build profiles, package name, and this submission checklist — done above.

---

## Quick command summary

```bash
cd mobile
cp ../.env.example .env   # or create .env with Supabase keys
npm install
eas login
eas init
eas build --platform android --profile amazon
# Download APK → upload to Amazon Developer Console
```
