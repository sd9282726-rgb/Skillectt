# Store preparation — Skillect

## Shared requirements

- App name: **Skillect**
- Package / Application ID (suggested): `com.skillect.app`
- Category: Social / Education
- Content rating: complete questionnaire (users 13+)
- Privacy Policy URL: required (host before submission)
- Support email / website

## Assets to prepare

| Asset | Size |
|-------|------|
| App icon | 512×512 PNG |
| Feature graphic (Play) | 1024×500 |
| Screenshots (phone) | min 2, recommended 4–8 |
| Screenshots (tablet, optional) | 7" / 10" |

## Google Play

1. Create app in [Play Console](https://play.google.com/console)
2. Complete store listing, content rating, target audience, data safety form
3. Build production AAB with EAS:

```bash
cd mobile
npx eas build --platform android --profile production
```

4. Upload AAB under Production (or Internal testing first)
5. Submit for review

## Amazon Appstore

1. Create account at [Amazon Developer](https://developer.amazon.com)
2. Create new Android app
3. Upload the same signed APK/AAB (or Amazon-specific build)
4. Fill description, screenshots, content rating
5. Submit

## Signing

- Use EAS credentials management (recommended) or your own keystore
- **Never commit** keystores or `.jks` files to Git

## Privacy / data safety

Disclose:
- Account email
- Profile data (name, bio, skills)
- User-generated content (posts, comments, media)
- Analytics (if any)

Data is stored in Supabase (EU region: eu-west-2).
