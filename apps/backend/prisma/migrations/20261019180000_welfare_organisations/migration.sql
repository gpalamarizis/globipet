-- CreateTable
CREATE TABLE "welfare_organisations" (
    "id" TEXT NOT NULL,
    "registry_key" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "country" VARCHAR(80) NOT NULL,
    "municipality" VARCHAR(255),
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

    CONSTRAINT "welfare_organisations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "welfare_organisations_registry_key_key" ON "welfare_organisations"("registry_key");

-- CreateIndex
CREATE UNIQUE INDEX "welfare_organisations_claimed_service_id_key" ON "welfare_organisations"("claimed_service_id");

-- CreateIndex
CREATE INDEX "welfare_organisations_municipality_idx" ON "welfare_organisations"("municipality");

-- CreateIndex
CREATE INDEX "welfare_organisations_kind_idx" ON "welfare_organisations"("kind");

-- AddForeignKey
ALTER TABLE "welfare_organisations" ADD CONSTRAINT "welfare_organisations_claimed_service_id_fkey" FOREIGN KEY ("claimed_service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
