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

-- CreateIndex
CREATE INDEX "playdate_events_city_idx" ON "playdate_events"("city");

-- CreateIndex
CREATE INDEX "playdate_events_creator_email_idx" ON "playdate_events"("creator_email");

-- CreateIndex
CREATE INDEX "playdate_invitations_invitee_email_idx" ON "playdate_invitations"("invitee_email");

-- CreateIndex
CREATE UNIQUE INDEX "playdate_invitations_event_id_invitee_email_key" ON "playdate_invitations"("event_id", "invitee_email");

-- AddForeignKey
ALTER TABLE "playdate_invitations" ADD CONSTRAINT "playdate_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "playdate_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
