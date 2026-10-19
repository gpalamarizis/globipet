-- CreateTable
CREATE TABLE "official_shelters" (
    "id" TEXT NOT NULL,
    "registry_key" VARCHAR(64) NOT NULL,
    "official_code" VARCHAR(20),
    "code_raw" VARCHAR(100),
    "name" TEXT NOT NULL,
    "operator_name" TEXT NOT NULL,
    "operator_is_person" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(30) NOT NULL,
    "municipality" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" VARCHAR(100),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(255) NOT NULL,
    "source_date" DATE NOT NULL,
    "claimed_service_id" TEXT,
    "claimed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "official_shelters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "official_shelters_registry_key_key" ON "official_shelters"("registry_key");

-- CreateIndex
CREATE UNIQUE INDEX "official_shelters_official_code_key" ON "official_shelters"("official_code");

-- CreateIndex
CREATE UNIQUE INDEX "official_shelters_claimed_service_id_key" ON "official_shelters"("claimed_service_id");

-- CreateIndex
CREATE INDEX "official_shelters_municipality_idx" ON "official_shelters"("municipality");

-- CreateIndex
CREATE INDEX "official_shelters_category_idx" ON "official_shelters"("category");

-- AddForeignKey
ALTER TABLE "official_shelters" ADD CONSTRAINT "official_shelters_claimed_service_id_fkey" FOREIGN KEY ("claimed_service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
