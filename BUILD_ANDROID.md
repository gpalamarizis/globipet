# Οδηγίες Build Android APK

## Προαπαιτούμενα
- Node.js 18+
- Expo CLI
- EAS CLI

## Βήμα 1 — Εγκατάσταση
```bash
cd apps/mobile
npm install
npm install -g eas-cli expo-cli
```

## Βήμα 2 — Login στο Expo
```bash
eas login
# Δημιούργησε λογαριασμό στο expo.dev αν δεν έχεις
```

## Βήμα 3 — Αρχικοποίηση EAS project
```bash
eas init
# Αντίγραψε το project ID που θα βγει και βάλε το στο app.json -> extra.eas.projectId
```

## Βήμα 4 — Build APK (για testing)
```bash
eas build --platform android --profile preview
```
Αυτό θα δημιουργήσει ένα APK αρχείο που μπορείς να κατεβάσεις και να στείλεις στους testers.

## Βήμα 5 — Κατέβασε το APK
Μετά το build (10-15 λεπτά), το EAS θα σου δώσει ένα link για download.
Στείλε το link στους testers για να εγκαταστήσουν το APK.

## Σημείωση για testers
Οι testers πρέπει να ενεργοποιήσουν "Unknown sources" στο Android:
Settings → Security → Install unknown apps → Allow

## Environment Variables
Πρόσθεσε στο eas.json:
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://globipetbackend-production.up.railway.app/api"
      }
    }
  }
}
```
