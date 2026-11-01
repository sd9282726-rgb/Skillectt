# Skillect Mobile (Expo)

React Native / Expo app that connects to the **same Supabase backend** as the web app.

## Prerequisites

- Node.js 20+
- Expo CLI (`npx expo`)
- Android Studio / Xcode for device builds

## Quick start

```bash
cd mobile
npx create-expo-app@latest . --template blank-typescript
npm install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

Create `mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://chohswyxsckpwyzlbzav.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Core files to add

### `lib/supabase.ts`

```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

Auth, feed, create post, profile, and follow use the **same tables** as web:
`profiles`, `posts`, `post_likes`, `comments`, `follows`.

## Run

```bash
npx expo start
```

## Build for stores

```bash
# Android AAB
npx eas build --platform android --profile production

# iOS
npx eas build --platform ios --profile production
```

See `/docs/STORE_PREP.md` for listing requirements.
