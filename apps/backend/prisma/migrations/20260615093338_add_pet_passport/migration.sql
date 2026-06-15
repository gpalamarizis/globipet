-- CreateTable
CREATE TABLE "pet_pedigrees" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "registration_number" TEXT,
    "kennel_club" TEXT,
    "father_name" TEXT,
    "mother_name" TEXT,
    "breeder_name" TEXT,
    "breeder_contact" TEXT,
    "birth_certificate" TEXT,
    "pedigree_document" TEXT,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_pedigrees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_travel_documents" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "travel_type" TEXT NOT NULL,
    "origin_city" TEXT,
    "destination_city" TEXT NOT NULL,
    "destination_country" TEXT,
    "departure_date" TEXT NOT NULL,
    "return_date" TEXT,
    "carrier" TEXT,
    "booking_ref" TEXT,
    "document_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_travel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pet_pedigrees_pet_id_key" ON "pet_pedigrees"("pet_id");

-- CreateIndex
CREATE INDEX "pet_travel_documents_pet_id_idx" ON "pet_travel_documents"("pet_id");

-- CreateIndex
CREATE INDEX "pet_travel_documents_owner_email_idx" ON "pet_travel_documents"("owner_email");
