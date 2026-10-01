-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_el" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL,
    "requirement_type" TEXT NOT NULL,
    "requirement_value" INTEGER NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(255) NOT NULL,
    "actor_id" VARCHAR(255),
    "actor_email" VARCHAR(255),
    "actor_role" VARCHAR(50),
    "action" VARCHAR(60) NOT NULL,
    "resource" VARCHAR(60) NOT NULL,
    "resource_id" VARCHAR(255),
    "subject_email" VARCHAR(255),
    "metadata" JSONB,
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "method" VARCHAR(10),
    "path" VARCHAR(300),
    "status_code" INTEGER,
    "outcome" VARCHAR(20) NOT NULL DEFAULT 'success',
    "error_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_packages" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_snapshot" DOUBLE PRECISION NOT NULL,
    "name_snapshot" TEXT NOT NULL,

    CONSTRAINT "booking_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "pet_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_price" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "booking_date" TEXT NOT NULL,
    "booking_time" TEXT NOT NULL,
    "commission_rate" DOUBLE PRECISION,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "duration" INTEGER,
    "pet_name" TEXT,
    "platform_fee_amount" DOUBLE PRECISION,
    "provider_email" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "provider_payout_amount" DOUBLE PRECISION,
    "rating" INTEGER,
    "review" TEXT,
    "staff_id" VARCHAR(255),
    "staff_name" VARCHAR(255),
    "calendar_event_id" TEXT,
    "payment_ref" VARCHAR(255),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breach_incidents" (
    "id" VARCHAR(255) NOT NULL,
    "reference" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'low',
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "contained_at" TIMESTAMPTZ(6),
    "root_cause" TEXT,
    "affected_data_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affected_user_count" INTEGER,
    "supervisory_notified" BOOLEAN NOT NULL DEFAULT false,
    "supervisory_notified_at" TIMESTAMPTZ(6),
    "data_subjects_notified" BOOLEAN NOT NULL DEFAULT false,
    "data_subjects_notified_at" TIMESTAMPTZ(6),
    "notification_method" VARCHAR(50),
    "reporter_email" VARCHAR(255) NOT NULL,
    "remediation_actions" TEXT,
    "lessons_learned" TEXT,
    "attachments_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breach_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breeds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_el" TEXT,
    "species" TEXT NOT NULL,
    "fci_number" TEXT,
    "description" TEXT NOT NULL,
    "origin" TEXT,
    "size" TEXT NOT NULL,
    "weight_min" DOUBLE PRECISION,
    "weight_max" DOUBLE PRECISION,
    "lifespan_min" INTEGER,
    "lifespan_max" INTEGER,
    "temperament" TEXT[],
    "health_issues" TEXT[],
    "pros" TEXT[],
    "cons" TEXT[],
    "grooming_needs" INTEGER NOT NULL,
    "exercise_needs" INTEGER NOT NULL,
    "trainability" INTEGER NOT NULL,
    "good_with_children" BOOLEAN NOT NULL DEFAULT true,
    "good_with_pets" BOOLEAN NOT NULL DEFAULT true,
    "apartment_friendly" BOOLEAN NOT NULL DEFAULT false,
    "image_url" TEXT,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_email" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "calendar_id" TEXT NOT NULL DEFAULT 'primary',
    "account_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_audience" (
    "id" VARCHAR(255) NOT NULL,
    "campaign_id" VARCHAR(255) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_impressions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "campaign_id" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "day" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_placements" (
    "id" VARCHAR(255) NOT NULL,
    "campaign_id" VARCHAR(255) NOT NULL,
    "page" VARCHAR(40) NOT NULL,
    "slot" VARCHAR(20) NOT NULL DEFAULT 'banner',
    "media_type" VARCHAR(10) NOT NULL DEFAULT 'image',
    "media_url" TEXT,
    "link_url" TEXT,
    "headline" VARCHAR(200),
    "subtext" VARCHAR(400),
    "cta_label" VARCHAR(60),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_targets" (
    "id" VARCHAR(255) NOT NULL,
    "campaign_id" VARCHAR(255) NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" VARCHAR(255) NOT NULL,
    "owner_email" VARCHAR(255) NOT NULL,
    "owner_type" VARCHAR(20) NOT NULL DEFAULT 'provider',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "discount_type" VARCHAR(10),
    "discount_value" DOUBLE PRECISION,
    "min_order" DOUBLE PRECISION,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "boost" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_price" DOUBLE PRECISION NOT NULL,
    "product_image" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_templates" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" TEXT,
    "pet_type" TEXT,
    "breed_group" TEXT,
    "modality" TEXT,
    "suggested_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "is_addon" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "creator_email" TEXT NOT NULL,
    "creator_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_km" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "image_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "member_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_photo" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_messages" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_photo" TEXT,
    "content" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "user_email" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "event_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "pet_id" TEXT,
    "pet_name" TEXT,
    "guests" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "end_date" TEXT,
    "time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "image_url" TEXT,
    "capacity" INTEGER,
    "registered_count" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "ticket_types" JSONB[],
    "organizer" TEXT NOT NULL,
    "organizer_email" TEXT NOT NULL,
    "pet_types" TEXT[],
    "is_international" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_replies" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "topic_id" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_photo" TEXT,
    "content" TEXT NOT NULL,
    "is_answer" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_topics" (
    "id" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "replies_count" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_solved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "vet_name" TEXT,
    "clinic_name" TEXT,
    "cost" DOUBLE PRECISION,
    "next_appointment" TEXT,
    "attachments" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_plans" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_el" TEXT,
    "description" TEXT,
    "tier" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "price_annual" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "covers_accidents" BOOLEAN NOT NULL DEFAULT true,
    "covers_illness" BOOLEAN NOT NULL DEFAULT true,
    "covers_surgery" BOOLEAN NOT NULL DEFAULT false,
    "covers_dental" BOOLEAN NOT NULL DEFAULT false,
    "covers_preventive" BOOLEAN NOT NULL DEFAULT false,
    "covers_liability" BOOLEAN NOT NULL DEFAULT false,
    "covers_death" BOOLEAN NOT NULL DEFAULT false,
    "annual_limit" DOUBLE PRECISION,
    "per_incident_limit" DOUBLE PRECISION,
    "deductible" DOUBLE PRECISION,
    "reimbursement_percent" INTEGER,
    "waiting_period_days" INTEGER NOT NULL DEFAULT 14,
    "pet_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_age_years" INTEGER,
    "min_age_months" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_el" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_points" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "lifetime_points" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "state" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("state")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "items" JSONB[],
    "total_amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shipping_address" JSONB NOT NULL,
    "payment_method" TEXT,
    "payment_intent" TEXT,
    "coupon_code" TEXT,
    "discount_amount" DOUBLE PRECISION,
    "notes" TEXT,
    "tracking_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "payment_ref" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "platform_fee_amount" DOUBLE PRECISION,
    "provider_payout_amount" DOUBLE PRECISION,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "pet_locations" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'safe',
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tracker_id" TEXT,

    CONSTRAINT "pet_locations_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "pet_trackers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_token" TEXT NOT NULL,
    "name" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "battery_percent" INTEGER,
    "signal_strength" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_trackers_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "age" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "gender" TEXT,
    "color" TEXT,
    "microchip_number" TEXT,
    "vaccination_status" TEXT,
    "medical_conditions" TEXT[],
    "image_url" TEXT,
    "is_lost" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_sterilized" BOOLEAN,
    "sterilized_date" TEXT,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playdate_events" (
    "id" TEXT NOT NULL,
    "creator_email" TEXT NOT NULL,
    "creator_name" TEXT NOT NULL,
    "creator_photo" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "max_participants" INTEGER NOT NULL DEFAULT 10,
    "pet_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playdate_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playdate_invitations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "invitee_name" TEXT NOT NULL,
    "invitee_photo" TEXT,
    "pet_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playdate_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "post_id" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_photo" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "post_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_photo" TEXT,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "pet_id" TEXT,
    "pet_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_impressions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "product_id" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "day" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_impressions_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "image_url" TEXT,
    "images" TEXT[],
    "stock" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "target_species" TEXT[],
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "discount_percentage" INTEGER,
    "sale_price" DOUBLE PRECISION,
    "provider_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_subscribable" BOOLEAN NOT NULL DEFAULT false,
    "views_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_messages" (
    "id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255) NOT NULL,
    "provider_name" VARCHAR(255),
    "customer_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(200),
    "body" TEXT NOT NULL,
    "campaign_id" VARCHAR(255),
    "batch_id" VARCHAR(255),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_staff" (
    "id" VARCHAR(255) NOT NULL DEFAULT (gen_random_uuid())::character varying,
    "service_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255),
    "full_name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(50),
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "license_number" VARCHAR(100),
    "bio" TEXT,
    "photo_url" TEXT,
    "years_experience" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pet_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "accepts_telehealth" BOOLEAN NOT NULL DEFAULT false,
    "is_available_now" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_verification_requests" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "business_name" TEXT,
    "tax_number" TEXT,
    "years_experience" INTEGER,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "expo_token" VARCHAR(255),
    "endpoint" TEXT,
    "p256dh" VARCHAR(255),
    "auth" VARCHAR(255),
    "device_name" VARCHAR(120),
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "service_id" TEXT,
    "provider_email" TEXT,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "booking_id" TEXT,
    "response" TEXT,
    "response_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_id" TEXT,
    "order_id" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "group" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "breed_group" TEXT,
    "is_addon" BOOLEAN NOT NULL DEFAULT false,
    "modality" TEXT,
    "pet_type" TEXT,
    "size" TEXT,

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "home_visits" BOOLEAN NOT NULL DEFAULT false,
    "emergency_available" BOOLEAN NOT NULL DEFAULT false,
    "years_experience" INTEGER,
    "specializations" TEXT[],
    "pet_types" TEXT[],
    "languages" TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "available_days" INTEGER[],
    "available_since" TIMESTAMP(3),
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "image_url" TEXT,
    "is_available_now" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provider_name" TEXT NOT NULL,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "service_type" TEXT NOT NULL,
    "category" TEXT,
    "country" TEXT DEFAULT 'GR',
    "cover_image" TEXT,
    "title" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "group" VARCHAR(80),
    "name" VARCHAR(150) NOT NULL,
    "name_en" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_service_prices" (
    "id" VARCHAR(255) NOT NULL DEFAULT (gen_random_uuid())::character varying,
    "staff_id" VARCHAR(255) NOT NULL,
    "package_id" VARCHAR(255) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subprocessors" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "purpose" VARCHAR(200) NOT NULL,
    "data_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "region" VARCHAR(50),
    "transfer_mechanism" VARCHAR(50),
    "dpa_status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "dpa_signed_at" TIMESTAMPTZ(6),
    "dpa_expires_at" TIMESTAMPTZ(6),
    "dpa_url" TEXT,
    "contact_email" VARCHAR(255),
    "website" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subprocessors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telehealth_consultations" (
    "id" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "pet_id" TEXT,
    "pet_name" TEXT,
    "scheduled_date" TEXT NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "meeting_url" TEXT,
    "notes" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commission_rate" DOUBLE PRECISION,
    "payment_ref" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "platform_fee_amount" DOUBLE PRECISION,
    "provider_payout_amount" DOUBLE PRECISION,
    "service_id" TEXT,

    CONSTRAINT "telehealth_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" VARCHAR(255) NOT NULL,
    "entity" VARCHAR(60) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "field" VARCHAR(60) NOT NULL,
    "lang" VARCHAR(5) NOT NULL,
    "value" TEXT NOT NULL,
    "created_by" VARCHAR(255),
    "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "cookie_id" TEXT,
    "necessary" BOOLEAN NOT NULL DEFAULT true,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "functional" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "privacy_accepted" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'cookie_banner',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "users" (
    "id" VARCHAR(255) NOT NULL DEFAULT (gen_random_uuid())::character varying,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "google_id" VARCHAR(255),
    "role" VARCHAR(50) NOT NULL DEFAULT 'user',
    "profile_photo" TEXT,
    "bio" TEXT,
    "phone" VARCHAR(500),
    "city" VARCHAR(120),
    "country" VARCHAR(120),
    "preferred_language" VARCHAR(10) DEFAULT 'el',
    "website" VARCHAR(255),
    "loyalty_tier" VARCHAR(30) NOT NULL DEFAULT 'bronze',
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "ai_subscription_status" VARCHAR(30) NOT NULL DEFAULT 'none',
    "ai_trial_started_at" TIMESTAMPTZ(6),
    "ai_subscription_plan_id" VARCHAR(255),
    "reset_token" VARCHAR(255),
    "reset_token_expires" TIMESTAMPTZ(6),
    "birth_date" DATE,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "vaccine_type" TEXT NOT NULL,
    "date_administered" TEXT NOT NULL,
    "next_due_date" TEXT,
    "vet_name" TEXT,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_price" DOUBLE PRECISION NOT NULL,
    "product_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_deletion_requests_status_scheduled_for_idx" ON "account_deletion_requests"("status" ASC, "scheduled_for" ASC);

-- CreateIndex
CREATE INDEX "account_deletion_requests_user_id_idx" ON "account_deletion_requests"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code" ASC);

-- CreateIndex
CREATE INDEX "ai_subscription_plans_tier_idx" ON "ai_subscription_plans"("tier" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor_email" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource" ASC, "resource_id" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_subject_idx" ON "audit_logs"("subject_email" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_time_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "booking_packages_booking_id_idx" ON "booking_packages"("booking_id" ASC);

-- CreateIndex
CREATE INDEX "bookings_staff_idx" ON "bookings"("staff_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "breach_incidents_reference_key" ON "breach_incidents"("reference" ASC);

-- CreateIndex
CREATE INDEX "breach_incidents_severity_idx" ON "breach_incidents"("severity" ASC, "detected_at" ASC);

-- CreateIndex
CREATE INDEX "breach_incidents_status_idx" ON "breach_incidents"("status" ASC, "detected_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_user_provider_key" ON "calendar_connections"("user_email" ASC, "provider" ASC);

-- CreateIndex
CREATE INDEX "campaign_audience_customer_idx" ON "campaign_audience"("customer_email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_audience_unique" ON "campaign_audience"("campaign_id" ASC, "customer_email" ASC);

-- CreateIndex
CREATE INDEX "campaign_impressions_campaign_idx" ON "campaign_impressions"("campaign_id" ASC, "kind" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_impressions_unique_key" ON "campaign_impressions"("campaign_id" ASC, "visitor_hash" ASC, "kind" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "campaign_placements_page_idx" ON "campaign_placements"("page" ASC, "slot" ASC, "is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_placements_unique" ON "campaign_placements"("campaign_id" ASC, "page" ASC, "slot" ASC);

-- CreateIndex
CREATE INDEX "campaign_targets_lookup_idx" ON "campaign_targets"("target_type" ASC, "target_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_targets_unique" ON "campaign_targets"("campaign_id" ASC, "target_type" ASC, "target_id" ASC);

-- CreateIndex
CREATE INDEX "campaigns_active_idx" ON "campaigns"("is_active" ASC, "starts_at" ASC, "ends_at" ASC);

-- CreateIndex
CREATE INDEX "campaigns_owner_idx" ON "campaigns"("owner_email" ASC, "is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_email_product_id_key" ON "cart_items"("user_email" ASC, "product_id" ASC);

-- CreateIndex
CREATE INDEX "catalog_templates_category_group_idx" ON "catalog_templates"("category" ASC, "group" ASC);

-- CreateIndex
CREATE INDEX "catalog_templates_category_idx" ON "catalog_templates"("category" ASC);

-- CreateIndex
CREATE INDEX "communities_city_idx" ON "communities"("city" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "community_members_community_id_user_email_key" ON "community_members"("community_id" ASC, "user_email" ASC);

-- CreateIndex
CREATE INDEX "community_members_user_email_idx" ON "community_members"("user_email" ASC);

-- CreateIndex
CREATE INDEX "community_messages_community_id_idx" ON "community_messages"("community_id" ASC);

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "customer_notes_provider_idx" ON "customer_notes"("provider_email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_notes_unique" ON "customer_notes"("provider_email" ASC, "customer_email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_event_user_key" ON "event_registrations"("event_id" ASC, "user_email" ASC);

-- CreateIndex
CREATE INDEX "event_registrations_user_idx" ON "event_registrations"("user_email" ASC);

-- CreateIndex
CREATE INDEX "forum_replies_topic_idx" ON "forum_replies"("topic_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "insurance_plans_provider_id_idx" ON "insurance_plans"("provider_id" ASC);

-- CreateIndex
CREATE INDEX "insurance_plans_tier_idx" ON "insurance_plans"("tier" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_name_key" ON "insurance_providers"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_points_user_email_key" ON "loyalty_points"("user_email" ASC);

-- CreateIndex
CREATE INDEX "oauth_states_expires_idx" ON "oauth_states"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "orders_paid_created_idx" ON "orders"("payment_status" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_user_paid_idx" ON "orders"("user_email" ASC, "payment_status" ASC);

-- CreateIndex
CREATE INDEX "pet_allergies_pet_id_idx" ON "pet_allergies"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_chronic_conditions_pet_id_idx" ON "pet_chronic_conditions"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_dental_records_pet_id_idx" ON "pet_dental_records"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_genetic_tests_pet_id_idx" ON "pet_genetic_tests"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_imaging_pet_id_idx" ON "pet_imaging"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_lab_results_pet_id_idx" ON "pet_lab_results"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_locations_pet_created_idx" ON "pet_locations"("pet_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "pet_locations_tracker_idx" ON "pet_locations"("tracker_id" ASC);

-- CreateIndex
CREATE INDEX "pet_medications_pet_id_idx" ON "pet_medications"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_passport_access_pet_id_idx" ON "pet_passport_access"("pet_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pet_passport_access_pet_id_provider_email_key" ON "pet_passport_access"("pet_id" ASC, "provider_email" ASC);

-- CreateIndex
CREATE INDEX "pet_passport_access_provider_email_idx" ON "pet_passport_access"("provider_email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pet_pedigrees_pet_id_key" ON "pet_pedigrees"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_surgeries_pet_id_idx" ON "pet_surgeries"("pet_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pet_trackers_device_id_key" ON "pet_trackers"("device_id" ASC);

-- CreateIndex
CREATE INDEX "pet_trackers_owner_idx" ON "pet_trackers"("owner_email" ASC);

-- CreateIndex
CREATE INDEX "pet_trackers_pet_idx" ON "pet_trackers"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_travel_documents_owner_email_idx" ON "pet_travel_documents"("owner_email" ASC);

-- CreateIndex
CREATE INDEX "pet_travel_documents_pet_id_idx" ON "pet_travel_documents"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_vital_signs_pet_id_idx" ON "pet_vital_signs"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "pet_weight_records_pet_id_idx" ON "pet_weight_records"("pet_id" ASC);

-- CreateIndex
CREATE INDEX "playdate_events_city_idx" ON "playdate_events"("city" ASC);

-- CreateIndex
CREATE INDEX "playdate_events_creator_email_idx" ON "playdate_events"("creator_email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "playdate_invitations_event_id_invitee_email_key" ON "playdate_invitations"("event_id" ASC, "invitee_email" ASC);

-- CreateIndex
CREATE INDEX "playdate_invitations_invitee_email_idx" ON "playdate_invitations"("invitee_email" ASC);

-- CreateIndex
CREATE INDEX "post_comments_post_idx" ON "post_comments"("post_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_user_key" ON "post_likes"("post_id" ASC, "user_email" ASC);

-- CreateIndex
CREATE INDEX "post_likes_user_idx" ON "post_likes"("user_email" ASC);

-- CreateIndex
CREATE INDEX "product_impressions_day_idx" ON "product_impressions"("day" DESC, "product_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_impressions_unique_key" ON "product_impressions"("product_id" ASC, "visitor_hash" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "product_subscriptions_product_id_idx" ON "product_subscriptions"("product_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_subscriptions_stripe_subscription_id_key" ON "product_subscriptions"("stripe_subscription_id" ASC);

-- CreateIndex
CREATE INDEX "product_subscriptions_user_id_idx" ON "product_subscriptions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "provider_messages_batch_idx" ON "provider_messages"("batch_id" ASC);

-- CreateIndex
CREATE INDEX "provider_messages_customer_idx" ON "provider_messages"("customer_email" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "provider_messages_provider_idx" ON "provider_messages"("provider_email" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "provider_staff_active_idx" ON "provider_staff"("is_active" ASC);

-- CreateIndex
CREATE INDEX "provider_staff_provider_idx" ON "provider_staff"("provider_email" ASC);

-- CreateIndex
CREATE INDEX "provider_staff_service_idx" ON "provider_staff"("service_id" ASC);

-- CreateIndex
CREATE INDEX "provider_staff_user_idx" ON "provider_staff"("user_id" ASC);

-- CreateIndex
CREATE INDEX "provider_verification_status_idx" ON "provider_verification_requests"("status" ASC, "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_expo_token_key" ON "push_subscriptions"("expo_token" ASC);

-- CreateIndex
CREATE INDEX "push_subscriptions_platform_idx" ON "push_subscriptions"("platform" ASC);

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "reviews_product_idx" ON "reviews"("product_id" ASC);

-- CreateIndex
CREATE INDEX "reviews_service_idx" ON "reviews"("service_id" ASC);

-- CreateIndex
CREATE INDEX "service_packages_service_id_idx" ON "service_packages"("service_id" ASC);

-- CreateIndex
CREATE INDEX "specialties_active_idx" ON "specialties"("is_active" ASC);

-- CreateIndex
CREATE INDEX "specialties_category_idx" ON "specialties"("category" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_unique" ON "specialties"("category" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "staff_service_prices_package_idx" ON "staff_service_prices"("package_id" ASC);

-- CreateIndex
CREATE INDEX "staff_service_prices_staff_idx" ON "staff_service_prices"("staff_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_service_prices_unique" ON "staff_service_prices"("staff_id" ASC, "package_id" ASC);

-- CreateIndex
CREATE INDEX "subprocessors_dpa_status_idx" ON "subprocessors"("dpa_status" ASC);

-- CreateIndex
CREATE INDEX "subprocessors_is_active_idx" ON "subprocessors"("is_active" ASC);

-- CreateIndex
CREATE INDEX "translations_entity_idx" ON "translations"("entity" ASC, "entity_id" ASC);

-- CreateIndex
CREATE INDEX "translations_lookup_idx" ON "translations"("entity" ASC, "lang" ASC, "entity_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "translations_unique" ON "translations"("entity" ASC, "entity_id" ASC, "field" ASC, "lang" ASC);

-- CreateIndex
CREATE INDEX "user_consents_cookie_id_idx" ON "user_consents"("cookie_id" ASC);

-- CreateIndex
CREATE INDEX "user_consents_created_at_idx" ON "user_consents"("created_at" ASC);

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id" ASC);

-- CreateIndex
CREATE INDEX "user_insurance_subscriptions_plan_id_idx" ON "user_insurance_subscriptions"("plan_id" ASC);

-- CreateIndex
CREATE INDEX "user_insurance_subscriptions_user_id_idx" ON "user_insurance_subscriptions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id" ASC);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_user_email_product_id_key" ON "wishlist"("user_email" ASC, "product_id" ASC);

-- AddForeignKey
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "provider_staff"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign_audience" ADD CONSTRAINT "campaign_audience_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign_placements" ADD CONSTRAINT "campaign_placements_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_topic_fk" FOREIGN KEY ("topic_id") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insurance_plans" ADD CONSTRAINT "insurance_plans_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_trackers" ADD CONSTRAINT "pet_trackers_pet_fk" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "playdate_invitations" ADD CONSTRAINT "playdate_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "playdate_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_impressions" ADD CONSTRAINT "product_impressions_product_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_messages" ADD CONSTRAINT "provider_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_staff" ADD CONSTRAINT "provider_staff_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_staff" ADD CONSTRAINT "provider_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_service_prices" ADD CONSTRAINT "staff_service_prices_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_service_prices" ADD CONSTRAINT "staff_service_prices_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "provider_staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_insurance_subscriptions" ADD CONSTRAINT "user_insurance_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "insurance_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_insurance_subscriptions" ADD CONSTRAINT "user_insurance_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

