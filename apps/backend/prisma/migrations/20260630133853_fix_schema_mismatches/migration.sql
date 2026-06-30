/*
  Warnings:

  - You are about to drop the column `payment_method` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_ref` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `user_email` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `breed_group` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `is_addon` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `modality` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `pet_type` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `cover_image` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `review_count` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `services` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `insurance_providers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `booking_date` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booking_time` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_email` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_name` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_email` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_name` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_name` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_type` to the `services` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `services` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `services` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "bookings_service_id_idx";

-- DropIndex
DROP INDEX "bookings_user_email_idx";

-- DropIndex
DROP INDEX "service_packages_group_idx";

-- DropIndex
DROP INDEX "services_category_idx";

-- DropIndex
DROP INDEX "services_city_idx";

-- DropIndex
DROP INDEX "services_provider_email_idx";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "payment_method",
DROP COLUMN "payment_ref",
DROP COLUMN "scheduled_at",
DROP COLUMN "user_email",
ADD COLUMN     "booking_date" TEXT NOT NULL,
ADD COLUMN     "booking_time" TEXT NOT NULL,
ADD COLUMN     "commission_rate" DOUBLE PRECISION,
ADD COLUMN     "customer_email" TEXT NOT NULL,
ADD COLUMN     "customer_name" TEXT NOT NULL,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "pet_name" TEXT,
ADD COLUMN     "platform_fee_amount" DOUBLE PRECISION,
ADD COLUMN     "provider_email" TEXT NOT NULL,
ADD COLUMN     "provider_name" TEXT NOT NULL,
ADD COLUMN     "provider_payout_amount" DOUBLE PRECISION,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "review" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_ref" TEXT,
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "platform_fee_amount" DOUBLE PRECISION,
ADD COLUMN     "provider_payout_amount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_subscribable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "service_packages" DROP COLUMN "breed_group",
DROP COLUMN "is_addon",
DROP COLUMN "modality",
DROP COLUMN "pet_type",
DROP COLUMN "size",
ALTER COLUMN "group" DROP NOT NULL;

-- AlterTable
ALTER TABLE "services" DROP COLUMN "category",
DROP COLUMN "country",
DROP COLUMN "cover_image",
DROP COLUMN "images",
DROP COLUMN "review_count",
DROP COLUMN "title",
ADD COLUMN     "available_days" INTEGER[],
ADD COLUMN     "available_since" TIMESTAMP(3),
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "is_available_now" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "provider_name" TEXT NOT NULL,
ADD COLUMN     "reviews_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "service_type" TEXT NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "years_experience" DROP NOT NULL,
ALTER COLUMN "years_experience" DROP DEFAULT,
ALTER COLUMN "specializations" DROP DEFAULT,
ALTER COLUMN "pet_types" DROP DEFAULT,
ALTER COLUMN "languages" DROP DEFAULT;

-- AlterTable
ALTER TABLE "telehealth_consultations" ADD COLUMN     "commission_rate" DOUBLE PRECISION,
ADD COLUMN     "payment_ref" TEXT,
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "platform_fee_amount" DOUBLE PRECISION,
ADD COLUMN     "provider_payout_amount" DOUBLE PRECISION,
ADD COLUMN     "service_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending_payment';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ai_subscription_plan_id" TEXT,
ADD COLUMN     "ai_subscription_status" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "ai_trial_started_at" TIMESTAMP(3),
ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vaccinations" ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "product_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "discount_percent" DOUBLE PRECISION NOT NULL,
    "monthly_price" DOUBLE PRECISION NOT NULL,
    "commission_rate" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "next_delivery_date" TIMESTAMP(3),
    "deliveries_completed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_insurance_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "pet_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_insurance_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_el" TEXT,
    "description" TEXT,
    "tier" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "price_annual" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "includes_ai_health" BOOLEAN NOT NULL DEFAULT false,
    "includes_emotion_ai" BOOLEAN NOT NULL DEFAULT false,
    "includes_wellness_tracker" BOOLEAN NOT NULL DEFAULT false,
    "includes_telehealth" BOOLEAN NOT NULL DEFAULT false,
    "telehealth_sessions_per_month" INTEGER,
    "max_pets" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_medications" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active_ingredient" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "prescribed_by" TEXT,
    "clinic_name" TEXT,
    "reason" TEXT,
    "side_effects" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_lab_results" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "result_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "lab_name" TEXT,
    "vet_name" TEXT,
    "clinic_name" TEXT,
    "findings" TEXT,
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "file_urls" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_imaging" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "imaging_type" TEXT NOT NULL,
    "body_region" TEXT,
    "date" TEXT NOT NULL,
    "vet_name" TEXT,
    "clinic_name" TEXT,
    "findings" TEXT,
    "report" TEXT,
    "file_urls" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_imaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_surgeries" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "category" TEXT,
    "date" TEXT NOT NULL,
    "surgeon_name" TEXT,
    "clinic_name" TEXT,
    "anesthesia" TEXT,
    "duration_min" INTEGER,
    "complications" TEXT,
    "outcome" TEXT,
    "follow_up" TEXT,
    "stitches_removed" TEXT,
    "cost" DOUBLE PRECISION,
    "file_urls" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_allergies" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "allergen_type" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'moderate',
    "diagnosed_date" TEXT,
    "diagnosed_by" TEXT,
    "treatment" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_chronic_conditions" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "icd_code" TEXT,
    "diagnosed_date" TEXT,
    "diagnosed_by" TEXT,
    "clinic_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "treatment_plan" TEXT,
    "monitoring" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_chronic_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_dental_records" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "vet_name" TEXT,
    "clinic_name" TEXT,
    "teeth_treated" TEXT,
    "findings" TEXT,
    "grade" TEXT,
    "next_due" TEXT,
    "cost" DOUBLE PRECISION,
    "file_urls" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_dental_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_weight_records" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "bcs" INTEGER,
    "date" TEXT NOT NULL,
    "vet_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_genetic_tests" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "provider" TEXT,
    "date" TEXT NOT NULL,
    "results" TEXT,
    "breeds_detected" TEXT[],
    "conditions_found" TEXT[],
    "file_urls" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_genetic_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_vital_signs" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "temperature_c" DOUBLE PRECISION,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "weight_kg" DOUBLE PRECISION,
    "blood_pressure" TEXT,
    "capillary_refill" TEXT,
    "vet_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_passport_access" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "granted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_passport_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_subscriptions_stripe_subscription_id_key" ON "product_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "product_subscriptions_user_id_idx" ON "product_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "product_subscriptions_product_id_idx" ON "product_subscriptions"("product_id");

-- CreateIndex
CREATE INDEX "user_insurance_subscriptions_user_id_idx" ON "user_insurance_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "user_insurance_subscriptions_plan_id_idx" ON "user_insurance_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "ai_subscription_plans_tier_idx" ON "ai_subscription_plans"("tier");

-- CreateIndex
CREATE INDEX "pet_medications_pet_id_idx" ON "pet_medications"("pet_id");

-- CreateIndex
CREATE INDEX "pet_lab_results_pet_id_idx" ON "pet_lab_results"("pet_id");

-- CreateIndex
CREATE INDEX "pet_imaging_pet_id_idx" ON "pet_imaging"("pet_id");

-- CreateIndex
CREATE INDEX "pet_surgeries_pet_id_idx" ON "pet_surgeries"("pet_id");

-- CreateIndex
CREATE INDEX "pet_allergies_pet_id_idx" ON "pet_allergies"("pet_id");

-- CreateIndex
CREATE INDEX "pet_chronic_conditions_pet_id_idx" ON "pet_chronic_conditions"("pet_id");

-- CreateIndex
CREATE INDEX "pet_dental_records_pet_id_idx" ON "pet_dental_records"("pet_id");

-- CreateIndex
CREATE INDEX "pet_weight_records_pet_id_idx" ON "pet_weight_records"("pet_id");

-- CreateIndex
CREATE INDEX "pet_genetic_tests_pet_id_idx" ON "pet_genetic_tests"("pet_id");

-- CreateIndex
CREATE INDEX "pet_vital_signs_pet_id_idx" ON "pet_vital_signs"("pet_id");

-- CreateIndex
CREATE INDEX "pet_passport_access_pet_id_idx" ON "pet_passport_access"("pet_id");

-- CreateIndex
CREATE INDEX "pet_passport_access_provider_email_idx" ON "pet_passport_access"("provider_email");

-- CreateIndex
CREATE UNIQUE INDEX "pet_passport_access_pet_id_provider_email_key" ON "pet_passport_access"("pet_id", "provider_email");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_name_key" ON "insurance_providers"("name");

-- AddForeignKey
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_insurance_subscriptions" ADD CONSTRAINT "user_insurance_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_insurance_subscriptions" ADD CONSTRAINT "user_insurance_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "insurance_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
