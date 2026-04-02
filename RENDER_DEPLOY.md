# Μεταφορά Backend σε Render.com (δωρεάν, χωρίς sleep)

## Βήμα 1 — Δημιουργία λογαριασμού
Πήγαινε στο render.com και κάνε Sign up με GitHub

## Βήμα 2 — Νέο Web Service
1. New → Web Service
2. Connect GitHub repo: gpalamarizis/globipet
3. Root directory: apps/backend
4. Build command: npm install && npm run build && npx prisma generate
5. Start command: npm start
6. Plan: Free

## Βήμα 3 — Environment Variables
Πρόσθεσε όλα τα variables από το Railway:
- DATABASE_URL
- JWT_SECRET
- JWT_EXPIRES_IN=7d
- APP_URL=https://globipet.com
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL=https://YOUR-RENDER-URL.onrender.com/api/auth/google/callback
- FACEBOOK_APP_ID
- FACEBOOK_APP_SECRET
- FACEBOOK_CALLBACK_URL=https://YOUR-RENDER-URL.onrender.com/api/auth/facebook/callback
- STRIPE_SECRET_KEY
- RESEND_API_KEY
- CF_R2_ACCOUNT_ID
- CF_R2_ACCESS_KEY_ID
- CF_R2_SECRET_ACCESS_KEY
- CF_R2_BUCKET_NAME
- CF_R2_PUBLIC_URL

## Βήμα 4 — Ενημέρωση Cloudflare Pages
Μετά το deploy στο Render, ενημέρωσε:
- VITE_API_URL = https://YOUR-RENDER-URL.onrender.com/api

## Σημείωση
Το Render free tier δεν κοιμάται αλλά έχει 512MB RAM.
Για production → αναβάθμισε σε Starter ($7/μήνα).
