-- Κατάλογος ράτσων (FCI / FIFe / TICA) με ενδεικτικές φωτογραφίες.
-- Μόνο ΧΑΛΑΡΩΣΗ περιορισμών και ΝΕΕΣ στήλες: καμία εγγραφή δεν αλλάζει ή σβήνεται.
-- Ο παλιός κώδικας δουλεύει κανονικά και μετά από αυτό το migration.

-- AlterTable: τα πεδία προφίλ γίνονται προαιρετικά (ράτσες χωρίς πλήρες προφίλ)
ALTER TABLE "breeds" ALTER COLUMN "size" DROP NOT NULL,
ALTER COLUMN "grooming_needs" DROP NOT NULL,
ALTER COLUMN "exercise_needs" DROP NOT NULL,
ALTER COLUMN "trainability" DROP NOT NULL,
ALTER COLUMN "good_with_children" DROP NOT NULL,
ALTER COLUMN "good_with_pets" DROP NOT NULL,
ALTER COLUMN "apartment_friendly" DROP NOT NULL;

-- AlterTable: νέες στήλες
ALTER TABLE "breeds" ADD COLUMN "fci_group" INTEGER,
ADD COLUMN "recognized_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "registry_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "image_credit" TEXT,
ADD COLUMN "image_license" TEXT,
ADD COLUMN "image_source" TEXT;

-- CreateIndex
CREATE INDEX "breeds_species_popularity_idx" ON "breeds"("species", "popularity");
