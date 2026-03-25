# Pawzee — App Store & Google Play Deployment Guide

This guide walks you through publishing Pawzee to the iOS App Store and Google Play Store from start to finish. It also covers how to push updates in the future.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [One-Time Setup](#2-one-time-setup)
3. [Restrict Your Google Maps API Key](#3-restrict-your-google-maps-api-key)
4. [Set Production Environment Variables](#4-set-production-environment-variables-required--do-before-every-build)
5. [First iOS Build & TestFlight](#5-first-ios-build--testflight)
6. [Submit iOS to the App Store](#6-submit-ios-to-the-app-store)
7. [First Android Build & Play Store](#7-first-android-build--play-store)
8. [Promote Android to Production](#8-promote-android-to-production)
9. [Every Future Release](#9-every-future-release)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Before you start, make sure you have all of the following:

### Accounts
| What | Where | Cost |
|------|-------|------|
| **Apple Developer Account** | [developer.apple.com](https://developer.apple.com) | $99/year |
| **Google Play Developer Account** | [play.google.com/console](https://play.google.com/console) | $25 one-time |
| **Expo Account** | [expo.dev](https://expo.dev) | Free |
| **Google Cloud Console** | [console.cloud.google.com](https://console.cloud.google.com) | Free (API key already set up) |

### Tools on your computer
Install these in your terminal before running any commands:

```bash
# Node.js (v18 or newer) — check if you have it:
node --version

# EAS CLI (Expo Application Services)
npm install -g eas-cli@latest

# Verify EAS is installed:
eas --version
```

---

## 2. One-Time Setup

You only need to do this section once per machine/account. Skip steps you have already done.

### Step 2a — Log in to Expo

```bash
eas login
```

Enter your Expo account email and password when prompted.

### Step 2b — Register the Pawzee project with EAS

Navigate to the Pawzee folder and run `eas init`. This is the step that was missing and caused the "no logs" build failure — it registers your app with EAS so it can receive build logs and credentials.

```bash
cd artifacts/pawzee
eas init
```

- When asked to create a new project, choose **Yes**.
- EAS will link the project and record its `projectId` in your Expo config (you will see it appear in `app.json`).
- This connects your local code to the EAS dashboard at [expo.dev](https://expo.dev).

### Step 2c — Set up iOS credentials (Apple)

EAS can manage signing certificates and provisioning profiles for you automatically.

```bash
eas credentials -p ios
```

Choose **Build credentials → Set up a new build credential**. EAS will connect to Apple, create a Distribution Certificate and Provisioning Profile, and store them securely. You need your Apple Developer account credentials ready.

> If you prefer to manage certificates yourself in Xcode, you can skip this step and use `credentialsSource: "local"` in `eas.json`. For most users, letting EAS manage it is easier.

### Step 2d — Set up Android credentials

Android signing is simpler. Run a build and EAS will generate a keystore automatically on the first run:

```bash
eas build -p android --profile production
```

EAS will ask if you want it to generate a keystore — say **Yes**. Store the keystore file somewhere safe (EAS also stores a copy in the cloud). You will need it for every future Android submission.

### Step 2e — Create your App Store Connect app (iOS only)

1. Go to [App Store Connect](https://appstoreconnect.apple.com).
2. Click **Apps → + (New App)**.
3. Fill in:
   - **Platform**: iOS
   - **Name**: Pawzee
   - **Bundle ID**: `com.pawzee.app`
   - **SKU**: `pawzee-app` (any unique string)
4. After creating it, note your **App ID** (a 10-digit number shown in the URL and app settings). You will need this when submitting with EAS.

### Step 2f — Create your Play Store listing (Android only)

1. Go to [Google Play Console](https://play.google.com/console).
2. Click **Create app**.
3. Fill in the app name (**Pawzee**), language, and whether it's free or paid.
4. Complete the **Dashboard checklist** — Play requires you to fill in store listing details, content rating, and privacy policy before your first build will be accepted.

---

## 3. Restrict Your Google Maps API Key

Your `GOOGLE_MAPS_API_KEY` is already set up in Replit Secrets. Before going live, restrict it in Google Cloud so it can only be used by Pawzee — this prevents unauthorized usage on your quota.

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click your Maps API key.
3. Under **Application restrictions**, select **iOS apps** (for the iOS key) or **Android apps** (for the Android key). Ideally create two separate keys — one per platform.
   - **iOS**: Add bundle ID `com.pawzee.app`
   - **Android**: Add package name `com.pawzee.app` and your app's SHA-1 certificate fingerprint (get this with `eas credentials -p android`)
4. Under **API restrictions**, select **Restrict key** and enable only:
   - Maps SDK for iOS (or Maps SDK for Android)
   - Places API (if you use address search)
5. Click **Save**.

> If you skip this step the app will still work, but your key is exposed and anyone could run up your Maps bill.

---

## 4. Set Production Environment Variables (REQUIRED — do before every build)

This is the most critical step. The mobile app needs to know where your deployed API server lives. Without this, all API calls will fail with "Invalid URL" and Replit Auth will show "invalid_error".

### Why this is needed

The app is built by EAS servers in the cloud. Those servers do not have access to Replit's environment variables, so `EXPO_PUBLIC_DOMAIN` and `EXPO_PUBLIC_REPL_ID` must be explicitly set in `eas.json` before building.

### Step 4a — Find your deployed Replit URL

1. Open your Replit project.
2. Click **Deploy** in the top-right corner.
3. Copy the URL shown for your deployed app — it will look like one of these:
   - `workspace.alanoh1.repl.co` (older format)
   - `workspace-alanoh1.replit.app` (newer format)
   - or a custom domain if you configured one

### Step 4b — Update eas.json

Open `artifacts/pawzee/eas.json`. Both values are already filled in with the correct production values:

```json
"production": {
  "env": {
    "EXPO_PUBLIC_REPL_ID": "5e723a64-9f24-4eb1-8254-87b49171d7cb",
    "EXPO_PUBLIC_DOMAIN": "workspace-alanoh1.replit.app"
  }
}
```

These are confirmed values for this project:
- **EXPO_PUBLIC_DOMAIN** = `workspace-alanoh1.replit.app` (your deployed Replit URL)
- **EXPO_PUBLIC_REPL_ID** = your Replit project ID (used for authentication)

> If you ever redeploy to a different URL, update `EXPO_PUBLIC_DOMAIN` here and rebuild.

### Step 4c — Add your Google Maps API key as an EAS secret

Without this, iOS builds will fall back to Apple Maps and Android maps may not work.

EAS Secrets are stored securely on Expo's servers and injected automatically during every build. Run this command once from the `artifacts/pawzee` directory:

```bash
cd artifacts/pawzee
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_GOOGLE_MAPS_API_KEY
```

Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual key from Google Cloud Console (the same key stored in your Replit Secrets).

To confirm the secret was saved:
```bash
eas secret:list
```

You should see `GOOGLE_MAPS_API_KEY` listed. From now on, every `eas build` will automatically use this key.

### Step 4d — Verify the Replit API server is deployed

Before building the mobile app, make sure your Replit project is deployed and the API is reachable. In your terminal, test:

```bash
curl https://YOUR_DEPLOYED_URL/api/health
```

You should get a `{"ok":true}` response. If not, deploy the Replit project first from the Replit dashboard.

> **Every time you redeploy to a new Replit URL**, update `EXPO_PUBLIC_DOMAIN` in `eas.json` and rebuild the app.

---

## 5. First iOS Build & TestFlight

TestFlight lets you install the app on real iPhones before it goes public. Always test on TestFlight first.

```bash
cd artifacts/pawzee

# Build for iOS (takes 10–20 minutes on EAS servers)
eas build -p ios --profile production
```

EAS will print a URL where you can watch the build progress. When the build finishes:

```bash
# Submit the .ipa to TestFlight automatically
eas submit -p ios --latest
```

When prompted for the **App Store Connect App ID**, enter the 10-digit number you noted in Step 2e.

After submission (usually takes 5–10 minutes to process):

1. Open [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**.
2. Click on the new build. It will show "Processing" for a few minutes.
3. Once ready, add yourself as an internal tester and install via the **TestFlight app** on your iPhone.
4. Test thoroughly — make sure the map loads, hazard reporting works, and location permissions prompt correctly.

---

## 6. Submit iOS to the App Store

Once you're happy with TestFlight testing:

1. In [App Store Connect](https://appstoreconnect.apple.com), go to your app → **App Store** tab.
2. Click **+ Version** and enter `1.0`.
3. Fill in required fields:
   - **Description** (what Pawzee does)
   - **Keywords** (dog walk, hazard, safety, map)
   - **Support URL** — Apple requires a valid `https://` URL here (not a mailto link). Create a simple web page or use a Google Form, then put that URL. For example: `https://sites.google.com/view/pawzee-support` or any publicly accessible page with a contact form or email address displayed.
   - **Screenshots** — at least one set for iPhone 6.5" display (use the iOS Simulator or a real device)
4. Under **Build**, click the **+** button and select your TestFlight build.
5. Click **Save**, then **Submit for Review**.

Apple usually reviews apps within **1–3 business days**. You will receive an email when it is approved.

---

## 7. First Android Build & Play Store

```bash
cd artifacts/pawzee

# Build for Android (produces an .aab file)
eas build -p android --profile production

# Submit to Google Play internal testing track
eas submit -p android --latest
```

EAS will ask for a **Google Play service account key** (a JSON file) the first time. To get it:

1. Go to [Google Play Console](https://play.google.com/console) → **Setup → API access**.
2. Link to a Google Cloud project.
3. Create a service account and grant it **Release manager** permissions.
4. Download the JSON key file and save it somewhere safe on your computer.
5. Provide the path to this file when EAS asks during submission. Alternatively, add it permanently to `eas.json` so you never have to type it again:

```json
"submit": {
  "production": {
    "android": {
      "track": "internal",
      "serviceAccountKeyPath": "/path/to/your/service-account-key.json"
    }
  }
}
```

After submission, the build appears in Play Console under **Internal testing**. Add your Gmail address as an internal tester and install via the Play Store.

---

## 8. Promote Android to Production

Once internal testing looks good:

1. In [Google Play Console](https://play.google.com/console) → your app → **Testing → Internal testing**.
2. Click **Promote release** → **Production**.
3. Set a rollout percentage (start with **10–20%** for a safer launch, then increase to 100% after a day).
4. Click **Review release** → **Start rollout to production**.

---

## 9. Every Future Release

For every update after the first, you only need these commands. The version and build number increment automatically thanks to `autoIncrement: true` in `eas.json`.

### If you changed the app version (e.g., 1.0 → 1.1)

Edit `version` in `app.json` first, then:

```bash
cd artifacts/pawzee

# Build both platforms at once
eas build -p all --profile production

# Submit both when builds finish
eas submit -p ios --latest
eas submit -p android --latest
```

### For a bug fix (same version, new build number)

No `app.json` changes needed — `autoIncrement` handles the build number:

```bash
cd artifacts/pawzee
eas build -p all --profile production
eas submit -p ios --latest
eas submit -p android --latest
```

### After submitting

- **iOS**: Go to App Store Connect and promote the new build through TestFlight → App Store review.
- **Android**: Go to Play Console and promote from Internal testing → Production.

---

## 10. Troubleshooting

### "RNMapsAirModule could not be found" error in Expo Go

**Cause**: This is NOT a bug. `react-native-maps` uses native iOS/Android modules that are not included in the standard Expo Go app. Expo Go is a limited sandbox environment.

**This error will only appear in Expo Go, never in TestFlight or the App Store build.**

**Fix**: You cannot test maps in Expo Go. To test the map on a real device, install the TestFlight build instead. For development testing, you can build a development client:
```bash
eas build -p ios --profile development
```
Then scan the QR code to install the development client and connect to your local dev server.

---

### Map shows Apple Maps instead of Google Maps on TestFlight / App Store

**Cause**: `GOOGLE_MAPS_API_KEY` was not set in the EAS build environment. Without this key, the Google Maps SDK doesn't initialize and iOS defaults to Apple Maps.

**Fix**: Add the key as an EAS secret (Step 4c above) and rebuild:
```bash
cd artifacts/pawzee
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_KEY
eas build -p all --profile production
eas submit -p ios --latest
```

---

### "Invalid URL /api/hazards" or all features stop working after App Store install

**Cause**: `EXPO_PUBLIC_DOMAIN` was not set in `eas.json` when the app was built. Without it, all API calls go to a relative path like `/api/hazards` which is not a valid URL on a native device.

**Fix**: Follow [Section 4](#4-set-production-environment-variables-required--do-before-every-build), set `EXPO_PUBLIC_DOMAIN` to your deployed Replit URL, and rebuild:
```bash
cd artifacts/pawzee
eas build -p all --profile production
eas submit -p ios --latest   # iOS
eas submit -p android --latest  # Android
```

---

### Replit Auth shows "invalid_error" on sign-in

**Cause**: `EXPO_PUBLIC_REPL_ID` was not baked into the production build, so the OAuth client_id sent to Replit's OIDC server is blank.

**Fix**: This value is already set to `5e723a64-9f24-4eb1-8254-87b49171d7cb` in `eas.json`. If you see this error, verify `eas.json` has both env vars set, then rebuild. Also make sure your Replit project is deployed and the API is reachable (see Section 4c).

---

### "No logs" or build fails immediately without any output

**Cause**: The project was never registered with EAS — there is no `projectId` linked.

**Fix**: Run `eas init` inside the `artifacts/pawzee` folder. This registers the project and assigns a `projectId`. After that, builds will show full logs.

```bash
cd artifacts/pawzee
eas init
```

---

### Google Maps shows a blank/grey screen on a real iPhone

**Cause**: Older versions of `react-native-maps` (below 1.20.0) had incomplete New Architecture support, causing `PROVIDER_GOOGLE` to render a blank map.

**Fix** (already applied): `react-native-maps` is pinned to `1.27.2`, which has full New Architecture support. `newArchEnabled` is `true` in `app.json`. If you upgrade `react-native-maps` in the future and see a blank map again, check the library's changelog for New Architecture compatibility notes.

---

### "Invalid bundle version" or build number conflict

**Cause**: EAS tries to submit a build number that already exists on App Store Connect.

**Fix**: `autoIncrement: true` in `eas.json` prevents this by fetching the current max build number from the App Store and incrementing it. If you still get this error, log in to App Store Connect, check the current build number, and manually set `ios.buildNumber` in `app.json` to a higher value, then build again.

---

### "Provisioning profile doesn't include the entitlements" (iOS)

**Cause**: Your Apple Developer provisioning profile is out of date — common after adding new capabilities or permissions.

**Fix**:
```bash
eas credentials -p ios
# Choose: Update existing credentials → Provisioning Profile → Re-create
```

---

### Android keystore error / "Upload certificate not found"

**Cause**: The keystore used to sign the APK/AAB doesn't match the one registered with Google Play.

**Fix**: Every Android app must be signed with the **same** keystore for every release. EAS stores your keystore in the cloud — as long as you use `eas build` it will use the correct one automatically. Never sign a build manually outside of EAS unless you have exported the keystore first.

To export your keystore (keep this file safe):
```bash
eas credentials -p android
# Choose: Download keystore
```

---

### "Missing compliance" rejection from Apple

**Cause**: Apple requires apps to declare encryption usage.

**Fix** (already applied): `ITSAppUsesNonExemptEncryption: false` is set in `app.json`'s `ios.infoPlist`. Pawzee uses only standard HTTPS encryption (which is exempt). This declaration prevents the rejection.

---

### App crashes on launch in TestFlight but works in Expo Go

**Cause**: Expo Go and a standalone build are different environments. Some packages behave differently.

**Fix**: Always test with a **preview** build on a real device before promoting to production:

```bash
eas build -p ios --profile preview
# Install via QR code or email link — no TestFlight needed for preview builds
```

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `eas login` | Log in to your Expo account |
| `eas init` | Register the project with EAS (run once) |
| `eas build -p ios --profile production` | Build iOS for App Store |
| `eas build -p android --profile production` | Build Android for Play Store |
| `eas build -p all --profile production` | Build both platforms at once |
| `eas submit -p ios --latest` | Submit the latest iOS build to TestFlight |
| `eas submit -p android --latest` | Submit the latest Android build to Play Store |
| `eas credentials -p ios` | Manage iOS signing certificates |
| `eas credentials -p android` | Manage Android keystore |
| `eas build:list` | See all past builds |

---

**Support email**: supportPawject@gmail.com  
**Bundle ID (iOS & Android)**: `com.pawzee.app`  
**Expo slug**: `pawzee`
