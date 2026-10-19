-- Έκπτωση καμπάνιας στις κρατήσεις (Ε2).
-- ΜΟΝΟ προσθήκη στηλών, χωρίς τιμή — καμία υπάρχουσα εγγραφή δεν αλλάζει.

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "discount_amount" DOUBLE PRECISION,
ADD COLUMN "campaign_id" VARCHAR(255);
