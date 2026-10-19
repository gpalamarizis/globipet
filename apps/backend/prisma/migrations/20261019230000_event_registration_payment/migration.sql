-- Πληρωμή εκδηλώσεων με τιμή μέσω Viva (Ε5).
-- ΜΟΝΟ προσθήκη στηλών, χωρίς τιμή — καμία υπάρχουσα εγγραφή δεν αλλάζει.

-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN "amount_paid" DOUBLE PRECISION,
ADD COLUMN "viva_order_code" TEXT,
ADD COLUMN "viva_transaction_id" TEXT;
