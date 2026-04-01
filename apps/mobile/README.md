# GlobiPet Mobile App

React Native + Expo app για iOS και Android.

## Setup

```bash
cd apps/mobile
npm install
cp .env.example .env
```

## Development

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
```

## Build για production

```bash
# Εγκατάσταση EAS CLI
npm install -g eas-cli
eas login

# Build
npm run build:ios      # iOS (.ipa)
npm run build:android  # Android (.aab)

# Submit στα stores
npm run submit:ios
npm run submit:android
```

## Screens

- **Home** — Αρχική με featured services/products
- **Services** — Λίστα υπηρεσιών με φίλτρα
- **Marketplace** — Κατάστημα προϊόντων
- **Social** — Social feed
- **Profile** — Προφίλ, κρατήσεις, παραγγελίες

## Auth

- Email/Password login
- Google OAuth (μέσω backend)
- Secure token storage με expo-secure-store
