-- Αποκλεισμός χρήστη (App Store 1.2 — περιεχόμενο χρηστών).
-- ΜΟΝΟ νέος πίνακας — καμία αλλαγή σε υπάρχοντες πίνακες ή εγγραφές.

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blocker_email" TEXT NOT NULL,
    "blocked_email" TEXT NOT NULL,
    "blocked_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_pair_key" ON "user_blocks"("blocker_email", "blocked_email");

-- CreateIndex
CREATE INDEX "user_blocks_blocker_idx" ON "user_blocks"("blocker_email");
