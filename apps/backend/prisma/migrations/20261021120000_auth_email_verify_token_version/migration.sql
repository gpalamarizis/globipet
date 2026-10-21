-- Ε12 — Επαλήθευση email και ανάκληση JWT.
--
-- ΠΡΟΣΘΗΚΗ ΣΤΗΛΩΝ ΜΟΝΟ (καμία αφαίρεση, καμία αλλαγή τύπου):
--   email_verified_at     πότε επιβεβαιώθηκε το email (null = όχι ακόμα)
--   email_verify_token    SHA-256 του τοκεν του συνδέσμου επαλήθευσης (όπως το reset_token)
--   email_verify_expires  λήξη του συνδέσμου
--   token_version         μετρητής ανάκλησης· κάθε JWT φέρει την τιμή του (claim `tv`)
--
-- ΤΟ ΜΟΝΑΔΙΚΟ DATA UPDATE:
--   Οι ΥΠΑΡΧΟΝΤΕΣ λογαριασμοί σημαίνονται επαληθευμένοι με ημερομηνία τη δημιουργία τους,
--   ώστε κανείς από όσους ήδη χρησιμοποιούν την εφαρμογή να μη βρεθεί ξαφνικά «ανεπιβεβαίωτος»
--   (χωρίς σύνδεση προσωπικού ή trial). Μόνο οι νέες εγγραφές με κωδικό, μετά την ανάπτυξη,
--   ξεκινούν με null. Το token_version παίρνει 0 για όλους (DEFAULT), οπότε τα ήδη εκδοθέντα
--   JWT (χωρίς `tv`) παραμένουν έγκυρα μέχρι την πρώτη ανάκληση.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMPTZ(6),
ADD COLUMN "email_verify_token" VARCHAR(255),
ADD COLUMN "email_verify_expires" TIMESTAMPTZ(6),
ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

-- Data: υπάρχοντες λογαριασμοί = επαληθευμένοι (βλ. παραπάνω).
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
