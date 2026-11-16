-- Υιοθεσία ζώων: αγγελίες, αιτήσεις, μηνύματα αίτησης, αγαπημένα.
-- Μόνο νέοι πίνακες — καμία αλλαγή σε υπάρχοντες.

-- CreateTable
CREATE TABLE "adoption_listings" (
    "id" TEXT NOT NULL,
    "lister_email" TEXT NOT NULL,
    "lister_name" VARCHAR(255) NOT NULL,
    "lister_type" VARCHAR(20) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "service_id" TEXT,
    "pet_id" TEXT,
    "name" VARCHAR(80) NOT NULL,
    "species" VARCHAR(20) NOT NULL,
    "breed" VARCHAR(120),
    "is_mixed" BOOLEAN NOT NULL DEFAULT false,
    "sex" VARCHAR(10) NOT NULL,
    "birth_date_est" DATE NOT NULL,
    "size" VARCHAR(10),
    "color" VARCHAR(80),
    "weight_kg" DOUBLE PRECISION,
    "microchip_number" VARCHAR(20),
    "is_sterilized" BOOLEAN NOT NULL DEFAULT false,
    "is_vaccinated" BOOLEAN NOT NULL DEFAULT false,
    "is_dewormed" BOOLEAN NOT NULL DEFAULT false,
    "health_notes" TEXT,
    "special_needs" BOOLEAN NOT NULL DEFAULT false,
    "good_with_kids" VARCHAR(10) NOT NULL DEFAULT 'unknown',
    "good_with_dogs" VARCHAR(10) NOT NULL DEFAULT 'unknown',
    "good_with_cats" VARCHAR(10) NOT NULL DEFAULT 'unknown',
    "house_trained" BOOLEAN,
    "energy_level" VARCHAR(10),
    "description" TEXT NOT NULL,
    "photos" TEXT[],
    "country" VARCHAR(2) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "adoption_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fee_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "fee_breakdown" TEXT,
    "requirements" TEXT,
    "allows_abroad" BOOLEAN NOT NULL DEFAULT false,
    "bred_by_lister" BOOLEAN NOT NULL DEFAULT false,
    "legal_ack_at" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason" TEXT,
    "adopted_at" TIMESTAMPTZ(6),
    "adopter_application_id" TEXT,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoption_applications" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "applicant_email" TEXT NOT NULL,
    "applicant_name" VARCHAR(255) NOT NULL,
    "applicant_phone" VARCHAR(30),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "answers" JSONB NOT NULL,
    "message" TEXT,
    "lister_note" TEXT,
    "decision_reason" TEXT,
    "cec_date" DATE,
    "completion_acks" JSONB,
    "decided_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "pet_created_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoption_messages" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,
    "sender_role" VARCHAR(10) NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoption_favorites" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adoption_listings_browse_idx" ON "adoption_listings"("status", "country", "species");

-- CreateIndex
CREATE INDEX "adoption_listings_lister_idx" ON "adoption_listings"("lister_email");

-- CreateIndex
CREATE INDEX "adoption_applications_applicant_idx" ON "adoption_applications"("applicant_email");

-- CreateIndex
CREATE INDEX "adoption_applications_listing_status_idx" ON "adoption_applications"("listing_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "adoption_applications_listing_applicant_key" ON "adoption_applications"("listing_id", "applicant_email");

-- CreateIndex
CREATE INDEX "adoption_messages_thread_idx" ON "adoption_messages"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "adoption_favorites_user_idx" ON "adoption_favorites"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "adoption_favorites_listing_user_key" ON "adoption_favorites"("listing_id", "user_email");

-- AddForeignKey
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "adoption_listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "adoption_messages" ADD CONSTRAINT "adoption_messages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "adoption_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "adoption_favorites" ADD CONSTRAINT "adoption_favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "adoption_listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
