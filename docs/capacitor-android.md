# Hisabati Scanner — Android (Capacitor) build

The app ships as a static client bundle wrapped by Capacitor. No connection settings or keys are
exposed in the UI; the project URL and the publishable (anon) key are baked in at build time from
`src/lib/hisabati/config.ts` (or `VITE_HISABATI_SUPABASE_URL` / `VITE_HISABATI_SUPABASE_PUBLISHABLE_KEY`).
Never ship a service-role key in the APK.

## One-time setup

```bash
npm install
npx cap add android
```

## Every build

```bash
npm run build          # produces dist/client
npx cap sync android
npx cap open android   # then Build > Build Bundle(s)/APK(s) in Android Studio
```

Command-line APK:

```bash
cd android && ./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

## Permissions

Receipt capture uses a standard `<input type="file" accept="image/*" capture="environment">`,
which Capacitor's WebView handles with the system camera/gallery picker. Add to
`android/app/src/main/AndroidManifest.xml` if the device requires explicit camera access:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Notes

- Offline queue (IndexedDB) works inside the WebView; queued receipts drain when connectivity returns.
- App routes are client-rendered (`ssr: false`), so the static bundle in `dist/client` is sufficient.
- To change the app name/id, edit `capacitor.config.ts` and re-run `npx cap sync android`.
