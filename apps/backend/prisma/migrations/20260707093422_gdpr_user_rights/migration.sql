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

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE INDEX "user_consents_cookie_id_idx" ON "user_consents"("cookie_id");

-- CreateIndex
CREATE INDEX "user_consents_created_at_idx" ON "user_consents"("created_at");

-- CreateIndex
CREATE INDEX "account_deletion_requests_user_id_idx" ON "account_deletion_requests"("user_id");

-- CreateIndex
CREATE INDEX "account_deletion_requests_status_scheduled_for_idx" ON "account_deletion_requests"("status", "scheduled_for");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
