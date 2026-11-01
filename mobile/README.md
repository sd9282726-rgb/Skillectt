# Skillect Mobile — Amazon Appstore first

Android app using the **same Supabase backend** as the web app.

**Store order:** Amazon Appstore first → Google Play later

---

## Identity

| Field | Value |
|-------|--------|
| App name | Skillect |
| Application ID | `com.skillect.app` |
| Version | `1.0.0` |
| Version code | `1` |

---

## Setup

```bash
cd mobile
npm install

# .env
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://chohswyxsckpwyzlbzav.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNob2hzd3l4c2NrcHd5emxiemF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzU0NDIsImV4cCI6MjEwOTAxMTQ0Mn0.DLuDDy5khFJUsYnixHfy6sdJoNB00EUk68pRWnnFRVA
EOF

npx expo start
```

## Build APK for Amazon

```bash
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile amazon
```

Download the APK → upload at [developer.amazon.com](https://developer.amazon.com).

**Full guide:** [`docs/AMAZON_APPSTORE.md`](../docs/AMAZON_APPSTORE.md)  
**Privacy policy template:** [`docs/PRIVACY_POLICY_TEMPLATE.md`](../docs/PRIVACY_POLICY_TEMPLATE.md)

## Files

| File | Purpose |
|------|---------|
| `App.tsx` | Email auth + feed (Supabase) |
| `lib/supabase.ts` | Client |
| `app.json` | Package / icons / version |
| `eas.json` | `amazon` profile → APK |

## Assets to add

`mobile/assets/icon.png`, `adaptive-icon.png`, `splash.png`

## Google Play (later)

```bash
eas build --platform android --profile production   # AAB
```
