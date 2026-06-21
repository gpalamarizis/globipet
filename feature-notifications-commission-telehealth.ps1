$root = "C:\gp"

Write-Host "Applying notifications + commission + telehealth-payment feature..." -ForegroundColor Cyan

$f1 = @'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid())
  full_name     String
  email         String   @unique
  password_hash String?
  google_id     String?  @unique
  role          String   @default("user")
  profile_photo String?
  bio           String?
  phone         String?
  city          String?
  country       String?
  preferred_language String? @default("el")
  website       String?
  loyalty_tier  String   @default("bronze")
  total_points  Int      @default(0)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  @@map("users")
  is_verified      Boolean   @default(false)
  address          String?
  latitude         Float?
  longitude        Float?
  ai_subscription_status  String    @default("none") // none | trial | active | expired
  ai_trial_started_at     DateTime?
  ai_subscription_plan_id String?
  product_subscriptions   ProductSubscription[]
  insurance_subscriptions UserInsuranceSubscription[]
}

model Pet {
  id                 String   @id @default(uuid())
  owner_email        String
  name               String
  species            String
  breed              String?
  age                Float?
  weight             Float?
  gender             String?
  color              String?
  microchip_number   String?
  vaccination_status String?
  medical_conditions String[]
  image_url          String?
  is_lost            Boolean  @default(false)
  last_seen_location String?
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
  @@map("pets")
}

model Service {
  id                    String   @id @default(uuid())
  provider_email        String
  provider_name         String
  service_type          String
  description           String
  price                 Float
  location              String?
  city                  String
  latitude              Float?
  longitude             Float?
  contact_phone         String?
  contact_email         String?
  available_days        Int[]
  rating                Float    @default(0)
  reviews_count         Int      @default(0)
  image_url             String?
  is_active             Boolean  @default(true)
  reset_token           String?  
  reset_token_expires   DateTime?
  is_verified           Boolean  @default(false)
  home_visits           Boolean  @default(false)
  emergency_available   Boolean  @default(false)
  years_experience      Int?
  specializations       String[]
  pet_types             String[]
  languages             String[]
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  packages              ServicePackage[]
  @@map("services")
}

model Booking {
  id             String   @id @default(uuid())
  service_id     String
  provider_email String
  provider_name  String
  customer_email String
  customer_name  String
  pet_id         String?
  pet_name       String?
  booking_date   String
  booking_time   String
  duration       Int?
  total_price    Float
  status         String   @default("pending")
  payment_status String   @default("unpaid")
  commission_rate         Float?
  platform_fee_amount     Float?
  provider_payout_amount  Float?
  notes          String?
  rating         Int?
  review         String?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  packages       BookingPackage[]
  @@map("bookings")
}

model Product {
  id                  String   @id @default(uuid())
  name                String
  description         String
  price               Float
  category            String
  brand               String?
  image_url           String?
  images              String[]
  stock               Int      @default(0)
  rating              Float    @default(0)
  reviews_count       Int      @default(0)
  target_species      String[]
  is_featured         Boolean  @default(false)
  discount_percentage Int?
  sale_price          Float?
  provider_email      String?
  is_subscribable     Boolean  @default(false)
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  subscriptions       ProductSubscription[]
  @@map("products")
}

model Order {
  id               String   @id @default(uuid())
  user_email       String
  user_name        String
  items            Json[]
  total_amount     Float
  status           String   @default("pending")
  payment_status   String   @default("unpaid")
  payment_ref      String?
  shipping_address Json
  payment_method   String?
  payment_intent   String?
  coupon_code      String?
  discount_amount  Float?
  platform_fee_amount    Float?
  provider_payout_amount Float?
  notes            String?
  tracking_number  String?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  @@map("orders")
}

model CartItem {
  id            String   @id @default(uuid())
  user_email    String
  product_id    String
  product_name  String
  product_price Float
  product_image String?
  quantity      Int      @default(1)
  created_at    DateTime @default(now())
  @@unique([user_email, product_id])
  @@map("cart_items")
}

model Wishlist {
  id            String   @id @default(uuid())
  user_email    String
  product_id    String
  product_name  String
  product_price Float
  product_image String?
  created_at    DateTime @default(now())
  @@unique([user_email, product_id])
  @@map("wishlist")
}

model Post {
  id             String   @id @default(uuid())
  author_email   String
  author_name    String
  author_photo   String?
  content        String
  image_url      String?
  likes_count    Int      @default(0)
  comments_count Int      @default(0)
  tags           String[]
  pet_id         String?
  pet_name       String?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  @@map("posts")
}

model Event {
  id               String   @id @default(uuid())
  title            String
  description      String
  event_type       String
  date             String
  end_date         String?
  time             String
  location         String
  city             String
  country          String
  latitude         Float?
  longitude        Float?
  image_url        String?
  capacity         Int?
  registered_count Int      @default(0)
  price            Float    @default(0)
  currency         String   @default("EUR")
  ticket_types     Json[]
  organizer        String
  organizer_email  String
  pet_types        String[]
  is_international Boolean  @default(false)
  is_featured      Boolean  @default(false)
  created_at       DateTime @default(now())
  @@map("events")
}

model Breed {
  id               String   @id @default(uuid())
  name             String
  name_el          String?
  species          String
  fci_number       String?
  description      String
  origin           String?
  size             String
  weight_min       Float?
  weight_max       Float?
  lifespan_min     Int?
  lifespan_max     Int?
  temperament      String[]
  health_issues    String[]
  pros             String[]
  cons             String[]
  grooming_needs   Int
  exercise_needs   Int
  trainability     Int
  good_with_children Boolean @default(true)
  good_with_pets   Boolean  @default(true)
  apartment_friendly Boolean @default(false)
  image_url        String?
  popularity       Int      @default(0)
  created_at       DateTime @default(now())
  @@map("breeds")
}

model Notification {
  id         String   @id @default(uuid())
  user_email String
  title      String
  message    String
  type       String
  is_read    Boolean  @default(false)
  link       String?
  created_at DateTime @default(now())
  @@map("notifications")
}

model Review {
  id             String   @id @default(uuid())
  service_id     String
  provider_email String
  customer_email String
  customer_name  String
  rating         Int
  comment        String?
  booking_id     String?
  response       String?
  response_date  DateTime?
  created_at     DateTime @default(now())
  @@map("reviews")
}

model HealthRecord {
  id               String   @id @default(uuid())
  pet_id           String
  owner_email      String
  record_type      String
  title            String
  description      String
  date             String
  vet_name         String?
  clinic_name      String?
  cost             Float?
  next_appointment String?
  attachments      String[]
  created_at       DateTime @default(now())
  @@map("health_records")
}

model Vaccination {
  id                String   @id @default(uuid())
  pet_id            String
  owner_email       String
  vaccine_name      String
  vaccine_type      String
  date_administered String
  next_due_date     String?
  vet_name          String?
  is_overdue        Boolean  @default(false)
  created_at        DateTime @default(now())
  @@map("vaccinations")
}

model LoyaltyPoints {
  id              String   @id @default(uuid())
  user_email      String   @unique
  total_points    Int      @default(0)
  tier            String   @default("bronze")
  lifetime_points Int      @default(0)
  updated_at      DateTime @updatedAt
  @@map("loyalty_points")
}

model Achievement {
  id                String  @id @default(uuid())
  code              String  @unique
  name              String
  name_el           String
  description       String
  icon              String
  category          String
  points            Int
  rarity            String
  requirement_type  String
  requirement_value Int
  @@map("achievements")
}

model ForumTopic {
  id            String   @id @default(uuid())
  author_email  String
  author_name   String
  title         String
  content       String
  category      String
  tags          String[]
  views_count   Int      @default(0)
  replies_count Int      @default(0)
  is_pinned     Boolean  @default(false)
  is_solved     Boolean  @default(false)
  created_at    DateTime @default(now())
  @@map("forum_topics")
}

model PetLocation {
  id          String   @id @default(uuid())
  pet_id      String
  owner_email String
  latitude    Float
  longitude   Float
  status      String   @default("safe")
  is_resolved Boolean  @default(false)
  created_at  DateTime @default(now())
  @@map("pet_locations")
}

model TelehealthConsultation {
  id             String   @id @default(uuid())
  provider_email String
  provider_name  String
  client_email   String
  client_name    String
  pet_id         String?
  pet_name       String?
  service_id     String?
  scheduled_date String
  scheduled_time String
  duration       Int
  status         String   @default("pending_payment")
  payment_status String   @default("unpaid")
  payment_ref    String?
  meeting_url    String?
  notes          String?
  price          Float
  commission_rate         Float?
  platform_fee_amount     Float?
  provider_payout_amount  Float?
  created_at     DateTime @default(now())
  @@map("telehealth_consultations")
}
model BookingPackage {
  id              String         @id @default(cuid())
  booking_id      String
  booking         Booking        @relation(fields: [booking_id], references: [id], onDelete: Cascade)
  package_id      String
  package         ServicePackage @relation(fields: [package_id], references: [id])
  quantity        Int            @default(1)
  price_snapshot  Float
  name_snapshot   String

  @@index([booking_id])
  @@map("booking_packages")
}

model CatalogTemplate {
  id              String   @id @default(cuid())
  category        String   // grooming | veterinary | clinic | walking | sitting | daycare | boarding | training | transport | photography | insurance | other
  group           String   // bathing | haircut | addon | consultation | vaccination | surgery | diagnostics | etc.
  name            String
  description     String?
  size            String?  // small | medium | large | xlarge
  pet_type        String?  // dog | cat | rabbit | bird | other
  breed_group     String?
  modality        String?  // in_clinic | home_visit | telehealth | emergency
  suggested_duration_minutes Int @default(60)
  is_addon        Boolean  @default(false)
  is_active       Boolean  @default(true)
  display_order   Int      @default(0)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@index([category])
  @@index([category, group])
  @@map("catalog_templates")
}

model InsuranceProvider {
  id          String   @id @default(cuid())
  name        String
  name_el     String?
  logo_url    String?
  website     String?
  phone       String?
  email       String?
  description String?
  is_active   Boolean  @default(true)
  display_order Int    @default(0)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  plans       InsurancePlan[]

  @@map("insurance_providers")
}

model InsurancePlan {
  id                    String   @id @default(cuid())
  provider_id           String
  provider              InsuranceProvider @relation(fields: [provider_id], references: [id], onDelete: Cascade)

  name                  String
  name_el               String?
  description           String?
  tier                  String   // basic | standard | premium | comprehensive
  price_monthly         Float
  price_annual          Float?
  currency              String   @default("EUR")

  covers_accidents      Boolean  @default(true)
  covers_illness        Boolean  @default(true)
  covers_surgery        Boolean  @default(false)
  covers_dental         Boolean  @default(false)
  covers_preventive     Boolean  @default(false)
  covers_liability      Boolean  @default(false)
  covers_death          Boolean  @default(false)

  annual_limit          Float?
  per_incident_limit    Float?
  deductible            Float?
  reimbursement_percent Int?
  waiting_period_days   Int      @default(14)

  pet_types             String[] @default([])
  max_age_years         Int?
  min_age_months        Int?

  features              String[] @default([])
  exclusions            String[] @default([])

  is_active             Boolean  @default(true)
  is_featured           Boolean  @default(false)
  display_order         Int      @default(0)

  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  user_subscriptions    UserInsuranceSubscription[]

  @@index([provider_id])
  @@index([tier])
  @@map("insurance_plans")
}

model PetPedigree {
  id                  String   @id @default(cuid())
  pet_id              String   @unique
  owner_email         String
  registration_number String?
  kennel_club         String?
  father_name         String?
  mother_name         String?
  breeder_name        String?
  breeder_contact     String?
  birth_certificate   String?
  pedigree_document   String?
  certifications      String[] @default([])
  notes               String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@map("pet_pedigrees")
}

model PetTravelDocument {
  id                  String   @id @default(cuid())
  pet_id              String
  owner_email         String
  travel_type         String
  origin_city         String?
  destination_city    String
  destination_country String?
  departure_date      String
  return_date         String?
  carrier             String?
  booking_ref         String?
  document_url        String?
  notes               String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@index([pet_id])
  @@index([owner_email])
  @@map("pet_travel_documents")
}

model PlaydateEvent {
  id              String   @id @default(cuid())
  creator_email   String
  creator_name    String
  creator_photo   String?
  title           String
  description     String?
  event_type      String   // walk | play | meetup | training | other
  date            String
  time            String
  duration_minutes Int     @default(60)
  location        String
  city            String
  latitude        Float?
  longitude       Float?
  max_participants Int     @default(10)
  pet_types       String[] @default([])
  is_public       Boolean  @default(true)
  status          String   @default("active") // active | cancelled | completed
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  invitations     PlaydateInvitation[]

  @@index([city])
  @@index([creator_email])
  @@map("playdate_events")
}

model PlaydateInvitation {
  id            String   @id @default(cuid())
  event_id      String
  event         PlaydateEvent @relation(fields: [event_id], references: [id], onDelete: Cascade)
  invitee_email String
  invitee_name  String
  invitee_photo String?
  pet_name      String?
  status        String   @default("pending") // pending | accepted | declined
  message       String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@unique([event_id, invitee_email])
  @@index([invitee_email])
  @@map("playdate_invitations")
}

model Community {
  id              String   @id @default(cuid())
  creator_email   String
  creator_name    String
  name            String
  description     String?
  address         String?
  city            String
  latitude        Float
  longitude       Float
  radius_km       Float    @default(1.0)
  image_url       String?
  is_public       Boolean  @default(true)
  member_count    Int      @default(1)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  members         CommunityMember[]
  messages        CommunityMessage[]

  @@index([city])
  @@map("communities")
}

model CommunityMember {
  id            String    @id @default(cuid())
  community_id  String
  community     Community @relation(fields: [community_id], references: [id], onDelete: Cascade)
  user_email    String
  user_name     String
  user_photo    String?
  role          String    @default("member") // admin | member
  joined_at     DateTime  @default(now())

  @@unique([community_id, user_email])
  @@index([user_email])
  @@map("community_members")
}

model CommunityMessage {
  id            String    @id @default(cuid())
  community_id  String
  community     Community @relation(fields: [community_id], references: [id], onDelete: Cascade)
  author_email  String
  author_name   String
  author_photo  String?
  content       String?
  image_url     String?
  created_at    DateTime  @default(now())

  @@index([community_id])
  @@map("community_messages")
}

model ServicePackage {
  id              String   @id @default(cuid())
  service_id      String
  service         Service  @relation(fields: [service_id], references: [id], onDelete: Cascade)
  name            String
  description     String?
  price           Float
  duration_minutes Int     @default(60)
  is_active       Boolean  @default(true)
  display_order   Int      @default(0)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  bookings        BookingPackage[]

  @@index([service_id])
  @@map("service_packages")
}

model AppSetting {
  key        String   @id
  value      String
  updated_at DateTime @updatedAt

  @@map("app_settings")
}

model ProductSubscription {
  id                      String    @id @default(cuid())
  user_id                 String
  user                    User      @relation(fields: [user_id], references: [id])
  product_id              String
  product                 Product   @relation(fields: [product_id], references: [id])
  discount_percent        Float
  monthly_price           Float
  commission_rate         Float?
  status                  String    @default("active") // active | paused | cancelled | payment_failed
  stripe_customer_id      String?
  stripe_subscription_id  String?   @unique
  start_date              DateTime  @default(now())
  end_date                DateTime?
  next_delivery_date      DateTime?
  deliveries_completed    Int       @default(0)
  created_at              DateTime  @default(now())
  updated_at              DateTime  @updatedAt

  @@index([user_id])
  @@index([product_id])
  @@map("product_subscriptions")
}

model UserInsuranceSubscription {
  id          String    @id @default(cuid())
  user_id     String
  user        User      @relation(fields: [user_id], references: [id])
  plan_id     String
  plan        InsurancePlan @relation(fields: [plan_id], references: [id])
  pet_id      String?
  status      String    @default("active") // active | cancelled | expired
  started_at  DateTime  @default(now())
  ends_at     DateTime?
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  @@index([user_id])
  @@index([plan_id])
  @@map("user_insurance_subscriptions")
}

model AiSubscriptionPlan {
  id                          String   @id @default(cuid())
  name                        String
  name_el                     String?
  description                 String?
  tier                        String   // free | basic | pro | premium
  price_monthly                Float
  price_annual                Float?
  currency                    String   @default("EUR")
  includes_ai_health           Boolean  @default(false)
  includes_emotion_ai          Boolean  @default(false)
  includes_wellness_tracker    Boolean  @default(false)
  includes_telehealth          Boolean  @default(false)
  telehealth_sessions_per_month Int?
  max_pets                     Int?
  features                    String[] @default([])
  is_active                   Boolean  @default(true)
  is_featured                 Boolean  @default(false)
  display_order               Int      @default(0)
  created_at                  DateTime @default(now())
  updated_at                  DateTime @updatedAt

  @@index([tier])
  @@map("ai_subscription_plans")
}
'@
$dir = Split-Path (Join-Path $root "apps\backend\prisma\schema.prisma")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\prisma\schema.prisma") -Value $f1 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\prisma\schema.prisma"

$f2 = @'
import prisma from './prisma.js'

const SETTING_KEY = 'commission_rates'

export type CommissionCategory =
  | 'food' | 'toys' | 'accessories'
  | 'veterinary' | 'grooming' | 'training' | 'hosting'
  | 'walking' | 'pet_taxi' | 'photography' | 'pharmacy' | 'telehealth'
  | 'services_default'

export const DEFAULT_COMMISSION_RATES: Record<CommissionCategory, number> = {
  food: 10,
  toys: 12,
  accessories: 12,
  services_default: 15,
  veterinary: 15,
  grooming: 15,
  training: 15,
  hosting: 15,
  walking: 15,
  pet_taxi: 15,
  photography: 15,
  pharmacy: 10,
  telehealth: 18,
}

let cache: { rates: Record<string, number>; expires: number } | null = null

/** Reads commission rates from AppSetting (JSON blob), merged over defaults. Cached 30s in-process. */
export async function getCommissionRates(): Promise<Record<CommissionCategory, number>> {
  if (cache && cache.expires > Date.now()) return cache.rates as any
  const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
  let stored: Record<string, number> = {}
  if (setting) {
    try { stored = JSON.parse(setting.value) } catch { stored = {} }
  }
  const merged = { ...DEFAULT_COMMISSION_RATES, ...stored }
  cache = { rates: merged, expires: Date.now() + 30_000 }
  return merged
}

export async function setCommissionRates(partial: Partial<Record<CommissionCategory, number>>) {
  const current = await getCommissionRates()
  const merged = { ...current, ...partial }
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(merged) },
    create: { key: SETTING_KEY, value: JSON.stringify(merged) },
  })
  cache = null
  return merged
}

/** Maps a product category or service_type string to a commission category key. */
export function resolveCommissionCategory(input: string | null | undefined): CommissionCategory {
  if (!input) return 'services_default'
  const key = input.toLowerCase()
  if (key === 'pet_sitting' || key === 'boarding') return 'hosting'
  if ((DEFAULT_COMMISSION_RATES as any)[key] !== undefined) return key as CommissionCategory
  return 'services_default'
}

export interface CommissionResult {
  rate: number
  platformFee: number
  providerPayout: number
}

/** Computes platform fee / provider payout split for a given amount and category. Rounds to 2 decimals. */
export async function calculateCommission(amount: number, category: string | null | undefined): Promise<CommissionResult> {
  const rates = await getCommissionRates()
  const resolved = resolveCommissionCategory(category)
  const rate = rates[resolved] ?? DEFAULT_COMMISSION_RATES.services_default
  const platformFee = Math.round(amount * (rate / 100) * 100) / 100
  const providerPayout = Math.round((amount - platformFee) * 100) / 100
  return { rate, platformFee, providerPayout }
}
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\lib\commission.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\lib\commission.ts") -Value $f2 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\lib\commission.ts"

$f3 = @'
/**
 * Transactional email via Resend (https://resend.com), called through raw fetch
 * (no SDK dependency, matches the existing viva.ts pattern).
 *
 * Required env vars:
 *   RESEND_API_KEY    - from Resend dashboard
 *   RESEND_FROM_EMAIL  - e.g. "GlobiPet <orders@globipet.com>" (domain must be verified in Resend)
 *
 * IMPORTANT: every call here is wrapped so a failure NEVER throws — email is best-effort
 * and must never break the order/booking/payment flow that triggered it.
 */

const BRAND_ORANGE = '#E65100'

function wrapper(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #F0F0F0;">
        <tr><td style="background:${BRAND_ORANGE};padding:24px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:800;">🐾 globipet</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #F0F0F0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">GlobiPet · Best care for the best human's friends</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>'
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set, skipping email to', opts.to)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[email] Resend error:', res.status, text)
    }
  } catch (err: any) {
    console.error('[email] send failed:', err.message)
  }
}

const money = (n: number) => `€${n.toFixed(2)}`

// ─── Orders (marketplace products) ─────────────────────────────────

export async function sendOrderConfirmedEmail(to: string, opts: { orderId: string; customerName: string; items: { name: string; price: number; quantity: number }[]; total: number }) {
  const rows = opts.items.map(i => `<tr><td style="padding:6px 0;color:#374151;font-size:14px;">${i.name} ×${i.quantity}</td><td style="padding:6px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;">${money(i.price * i.quantity)}</td></tr>`).join('')
  await sendEmail({
    to, subject: `Επιβεβαίωση παραγγελίας #${opts.orderId.slice(0, 8)}`,
    html: wrapper('Η παραγγελία σου επιβεβαιώθηκε! 🎉', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, ευχαριστούμε για την παραγγελία σου.</p>
      <table width="100%" style="margin:16px 0;border-top:1px solid #F0F0F0;padding-top:12px;">${rows}</table>
      <table width="100%" style="border-top:2px solid #111827;padding-top:8px;"><tr><td style="font-weight:800;color:#111827;">Σύνολο</td><td style="text-align:right;font-weight:800;color:${BRAND_ORANGE};font-size:16px;">${money(opts.total)}</td></tr></table>
    `)
  })
}

export async function sendProviderNewOrderEmail(to: string, opts: { providerName: string; orderId: string; productName: string; quantity: number; payoutAmount: number }) {
  await sendEmail({
    to, subject: `Νέα παραγγελία: ${opts.productName}`,
    html: wrapper('Έχεις νέα παραγγελία 📦', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.providerName}, ένας πελάτης μόλις παρήγγειλε:</p>
      <p style="font-size:15px;color:#111827;font-weight:600;margin:12px 0;">${opts.productName} ×${opts.quantity}</p>
      <p style="font-size:14px;color:#6B7280;">Η αμοιβή σου: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> (μετά την προμήθεια πλατφόρμας)</p>
    `)
  })
}

// ─── Bookings (services) ────────────────────────────────────────────

export async function sendBookingConfirmedEmail(to: string, opts: { customerName: string; providerName: string; date: string; time: string; price: number }) {
  await sendEmail({
    to, subject: `Επιβεβαίωση κράτησης με ${opts.providerName}`,
    html: wrapper('Η κράτησή σου επιβεβαιώθηκε ✅', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η κράτησή σου με <strong>${opts.providerName}</strong> καταχωρήθηκε.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Κόστος: <strong>${money(opts.price)}</strong></p>
    `)
  })
}

export async function sendProviderNewBookingEmail(to: string, opts: { providerName: string; customerName: string; date: string; time: string; payoutAmount: number }) {
  await sendEmail({
    to, subject: `Νέα κράτηση από ${opts.customerName}`,
    html: wrapper('Έχεις νέα κράτηση 📅', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.providerName}, ο/η <strong>${opts.customerName}</strong> έκλεισε ραντεβού μαζί σου.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Η αμοιβή σου: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> (μετά την προμήθεια πλατφόρμας)</p>
    `)
  })
}

// ─── Telehealth ──────────────────────────────────────────────────────

export async function sendTelehealthConfirmedEmail(to: string, opts: { customerName: string; providerName: string; date: string; time: string }) {
  await sendEmail({
    to, subject: `Η τηλεϊατρική συνεδρία σου επιβεβαιώθηκε`,
    html: wrapper('Η πληρωμή έγινε δεκτή ✅', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η συνεδρία τηλεϊατρικής με <strong>${opts.providerName}</strong> είναι έτοιμη.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Μπες στην εφαρμογή στην ώρα του ραντεβού για να ξεκινήσεις την βιντεοκλήση.</p>
    `)
  })
}

export async function sendProviderNewTelehealthEmail(to: string, opts: { providerName: string; customerName: string; date: string; time: string; payoutAmount: number }) {
  await sendEmail({
    to, subject: `Νέα συνεδρία τηλεϊατρικής από ${opts.customerName}`,
    html: wrapper('Έχεις νέα συνεδρία τηλεϊατρικής 🩺', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.providerName}, ο/η <strong>${opts.customerName}</strong> πλήρωσε και έκλεισε συνεδρία.</p>
      <p style="font-size:14px;color:#111827;margin:12px 0;">📅 ${opts.date} στις ${opts.time}</p>
      <p style="font-size:14px;color:#6B7280;">Η αμοιβή σου: <strong style="color:#16A34A;">${money(opts.payoutAmount)}</strong> (μετά την προμήθεια πλατφόρμας)</p>
    `)
  })
}

// ─── Subscriptions ───────────────────────────────────────────────────

export async function sendSubscriptionStartedEmail(to: string, opts: { customerName: string; productName: string; monthlyPrice: number }) {
  await sendEmail({
    to, subject: `Η συνδρομή σου ξεκίνησε 🎉`,
    html: wrapper('Καλώς ήρθες στη συνδρομή!', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η μηνιαία συνδρομή σου για <strong>${opts.productName}</strong> ενεργοποιήθηκε.</p>
      <p style="font-size:14px;color:#6B7280;">Μηνιαία χρέωση: <strong>${money(opts.monthlyPrice)}</strong></p>
    `)
  })
}

export async function sendSubscriptionRenewedEmail(to: string, opts: { customerName: string; productName: string; deliveryNumber: number }) {
  await sendEmail({
    to, subject: `Η μηνιαία παράδοση προγραμματίστηκε`,
    html: wrapper('Νέα παράδοση ετοιμάζεται 📦', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η πληρωμή για <strong>${opts.productName}</strong> (παράδοση #${opts.deliveryNumber}) ολοκληρώθηκε επιτυχώς.</p>
    `)
  })
}

export async function sendSubscriptionFailedEmail(to: string, opts: { customerName: string; productName: string }) {
  await sendEmail({
    to, subject: `Πρόβλημα με την πληρωμή της συνδρομής σου`,
    html: wrapper('Χρειάζεται ενημέρωση στοιχείων πληρωμής ⚠️', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, η χρέωση για τη συνδρομή <strong>${opts.productName}</strong> απέτυχε.</p>
      <p style="font-size:14px;color:#6B7280;">Μπες στο προφίλ σου στο GlobiPet για να ενημερώσεις τα στοιχεία της κάρτας σου.</p>
    `)
  })
}

export async function sendAiTrialStartedEmail(to: string, opts: { customerName: string }) {
  await sendEmail({
    to, subject: `Το δωρεάν trial AI ξεκίνησε 🚀`,
    html: wrapper('15 μέρες δωρεάν AI λειτουργίες', `
      <p style="color:#6B7280;font-size:14px;">Γεια σου ${opts.customerName}, το δωρεάν 15ήμερο trial των AI λειτουργιών (Υγεία, Emotion, Ούρα/Περιττώματα) ενεργοποιήθηκε.</p>
    `)
  })
}
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\lib\email.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\lib\email.ts") -Value $f3 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\lib\email.ts"

$f4 = @'
/**
 * Viva.com (Viva Wallet) Smart Checkout integration helper.
 *
 * Flow:
 * 1. Get OAuth2 access token (client credentials)
 * 2. Create a payment order -> returns orderCode
 * 3. Redirect customer to Smart Checkout with orderCode
 * 4. Verify payment via webhook or transaction API
 *
 * Environment variables needed:
 *   VIVA_CLIENT_ID         - Smart Checkout OAuth client id
 *   VIVA_CLIENT_SECRET     - Smart Checkout OAuth client secret
 *   VIVA_SOURCE_CODE       - Payment source code (from Viva dashboard)
 *   VIVA_ENV               - 'demo' or 'production' (default: 'demo')
 *   VIVA_MERCHANT_ID       - Merchant ID (for webhook verification)
 *   VIVA_API_KEY           - API Key (for webhook verification)
 *   FRONTEND_URL           - Frontend URL (e.g. https://globipet.com)
 */

type VivaEnv = 'demo' | 'production'

function getEnv(): VivaEnv {
  return (process.env.VIVA_ENV as VivaEnv) || 'demo'
}

function getBaseUrls() {
  const env = getEnv()
  if (env === 'production') {
    return {
      accounts: 'https://accounts.vivapayments.com',
      api: 'https://api.vivapayments.com',
      checkout: 'https://www.vivapayments.com/web/checkout',
      legacy: 'https://www.vivapayments.com',
    }
  }
  // Demo / sandbox
  return {
    accounts: 'https://demo-accounts.vivapayments.com',
    api: 'https://demo-api.vivapayments.com',
    checkout: 'https://demo.vivapayments.com/web/checkout',
    legacy: 'https://demo.vivapayments.com',
  }
}

// Cache the token in memory (valid ~1 hour)
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get an OAuth2 access token using client credentials.
 */
export async function getVivaAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token
  }

  const clientId = process.env.VIVA_CLIENT_ID
  const clientSecret = process.env.VIVA_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Viva credentials not configured (VIVA_CLIENT_ID / VIVA_CLIENT_SECRET)')
  }

  const { accounts } = getBaseUrls()
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${accounts}/connect/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Viva token error: ${res.status} ${text}`)
  }

  const data = await res.json() as any
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
  return data.access_token
}

interface CreatePaymentOrderParams {
  amount: number          // in EUR (e.g. 29.99)
  customerEmail: string
  customerName?: string
  customerPhone?: string
  orderId: string         // our internal order id (stored in merchantTrns)
  description?: string
  successUrl?: string     // override default /orders/:id/confirmation redirect
  failureUrl?: string
}

/**
 * Create a Viva payment order. Returns the orderCode used for checkout redirect.
 */
export async function createVivaPaymentOrder(params: CreatePaymentOrderParams): Promise<{ orderCode: string; checkoutUrl: string }> {
  const token = await getVivaAccessToken()
  const { api, checkout } = getBaseUrls()
  const sourceCode = process.env.VIVA_SOURCE_CODE
  const frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com'

  // Amount must be in cents (integer)
  const amountInCents = Math.round(params.amount * 100)

  const body: any = {
    amount: amountInCents,
    customerTrns: params.description || `GlobiPet παραγγελία ${params.orderId}`,
    customer: {
      email: params.customerEmail,
      fullName: params.customerName || '',
      phone: params.customerPhone || '',
      countryCode: 'GR',
      requestLang: 'el-GR',
    },
    paymentTimeout: 1800,          // 30 minutes
    preauth: false,
    allowRecurring: false,
    maxInstallments: 12,           // allow installments
    merchantTrns: params.orderId,  // our order id - comes back in webhook
    sourceCode: sourceCode,
    tags: ['globipet'],
    successUrl: params.successUrl || `${frontendUrl}/orders/${params.orderId}/confirmation`,
    failureUrl: params.failureUrl || `${frontendUrl}/orders/${params.orderId}/confirmation`,
  }

  const res = await fetch(`${api}/checkout/v2/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Viva create order error: ${res.status} ${text}`)
  }

  const data = await res.json() as any
  const orderCode = String(data.orderCode)

  return {
    orderCode,
    checkoutUrl: `${checkout}?ref=${orderCode}`,
  }
}

/**
 * Retrieve a transaction by its ID to verify payment.
 */
export async function getVivaTransaction(transactionId: string): Promise<any> {
  const token = await getVivaAccessToken()
  const { api } = getBaseUrls()

  const res = await fetch(`${api}/checkout/v2/transactions/${transactionId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Viva transaction error: ${res.status} ${text}`)
  }

  return res.json()
}
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\lib\viva.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\lib\viva.ts") -Value $f4 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\lib\viva.ts"

$f5 = @'
import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { getCommissionRates, setCommissionRates } from '../lib/commission.js'

const SETTING_KEY = 'food_subscription_discount_percent'

const settingsRoutes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' })
    }
  }

  // GET /settings/food-subscription-discount — public, used by storefront to show current discount
  app.get('/food-subscription-discount', async (req, reply) => {
    const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
    return reply.send({ data: { discount_percent: setting ? parseFloat(setting.value) : 0 } })
  })

  // PATCH /admin/settings/food-subscription-discount — admin sets the global %
  app.patch('/admin/food-subscription-discount', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const { discount_percent } = req.body as { discount_percent: number }
    if (discount_percent == null || discount_percent < 0 || discount_percent > 100) {
      return reply.code(400).send({ message: 'discount_percent πρέπει να είναι 0-100' })
    }
    const setting = await prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: String(discount_percent) },
      create: { key: SETTING_KEY, value: String(discount_percent) },
    })
    return reply.send({ data: { discount_percent: parseFloat(setting.value) } })
  })
  // GET /settings/commission-rates — admin only
  app.get('/commission-rates', { preHandler: [(app as any).authenticate, isAdmin] }, async (req, reply) => {
    const rates = await getCommissionRates()
    return reply.send({ data: rates })
  })

  // PATCH /settings/commission-rates — admin only, partial update
  app.patch('/commission-rates', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const body = req.body as Record<string, number>
    for (const [key, val] of Object.entries(body)) {
      if (typeof val !== 'number' || val < 0 || val > 100) {
        return reply.code(400).send({ message: `Μη έγκυρη τιμή για ${key}: πρέπει να είναι 0-100` })
      }
    }
    const rates = await setCommissionRates(body)
    return reply.send({ data: rates })
  })
}

export default settingsRoutes
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\routes\settings.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\routes\settings.ts") -Value $f5 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\routes\settings.ts"

$f6 = @'
import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { createVivaPaymentOrder, getVivaTransaction } from '../lib/viva.js'
import { calculateCommission } from '../lib/commission.js'
import { sendOrderConfirmedEmail, sendProviderNewOrderEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'
import { markTelehealthPaid } from './telehealth.js'

const ordersRoutes: FastifyPluginAsync = async (app) => {

  // Get my orders
  app.get('/my', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const orders = await prisma.order.findMany({
      where: { user_email: email },
      orderBy: { created_at: 'desc' },
    })
    return { data: orders }
  })

  // Get order by ID
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    return order
  })

  // Create order
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email, full_name } = req.user as any
    const { items, shipping_address, payment_method, total_amount } = req.body as any

    // Look up products to enrich items with category + provider_email for commission calc
    const productIds = items.map((i: any) => i.product_id || i.id).filter(Boolean)
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
    const productMap = new Map(products.map(p => [p.id, p]))

    let totalPlatformFee = 0
    let totalProviderPayout = 0

    const enrichedItems = await Promise.all(items.map(async (item: any) => {
      const productId = item.product_id || item.id
      const product = productMap.get(productId)
      const price = parseFloat(item.product_price ?? item.price ?? 0)
      const quantity = item.quantity
      const lineTotal = price * quantity
      const category = product?.category || null
      const providerEmail = product?.provider_email || null

      let commission_rate: number | null = null
      let platform_fee: number | null = null
      let provider_payout: number | null = null

      if (providerEmail) {
        const c = await calculateCommission(lineTotal, category)
        commission_rate = c.rate
        platform_fee = c.platformFee
        provider_payout = c.providerPayout
        totalPlatformFee += c.platformFee
        totalProviderPayout += c.providerPayout
      }

      return {
        product_id: productId,
        name: item.product_name || item.name,
        price,
        quantity,
        image: item.product_image || item.image || null,
        category,
        provider_email: providerEmail,
        commission_rate,
        platform_fee,
        provider_payout,
      }
    }))

    const order = await prisma.order.create({
      data: {
        user_email: email,
        user_name: full_name || email.split('@')[0],
        items: enrichedItems,
        total_amount: parseFloat(total_amount),
        status: 'pending',
        shipping_address: shipping_address,
        payment_method,
        platform_fee_amount: totalPlatformFee > 0 ? Math.round(totalPlatformFee * 100) / 100 : null,
        provider_payout_amount: totalProviderPayout > 0 ? Math.round(totalProviderPayout * 100) / 100 : null,
      }
    })
    // Clear cart
    await prisma.cartItem.deleteMany({ where: { user_email: email } })
    return order
  })

  // ─── VIVA.COM SMART CHECKOUT ─────────────────────────────────────
  app.post('/viva/checkout', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { order_id, total_amount } = req.body as any
    const user = req.user as any

    try {
      const order = await prisma.order.findUnique({ where: { id: order_id } })
      if (!order || order.user_email !== user.email) {
        return reply.code(404).send({ message: 'Η παραγγελία δεν βρέθηκε' })
      }

      const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
        amount: parseFloat(total_amount || order.total_amount),
        customerEmail: user.email,
        customerName: user.full_name,
        orderId: order_id,
        description: `GlobiPet παραγγελία #${order_id.slice(0, 8)}`,
      })

      await prisma.order.update({
        where: { id: order_id },
        data: { payment_ref: String(orderCode), payment_method: 'viva' },
      })

      return { checkoutUrl, orderCode }
    } catch (err: any) {
      console.error('Viva checkout error:', err)
      return reply.code(500).send({ message: err.message || 'Σφάλμα πληρωμής' })
    }
  })

  // Fires once when an order transitions to paid: buyer confirmation email +
  // provider new-order email/in-app notification (per distinct provider in items).
  async function firePaidSideEffects(orderId: string) {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (!order) return

      const items = order.items as any[]

      sendOrderConfirmedEmail(order.user_email, {
        orderId: order.id,
        customerName: order.user_name,
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
        total: order.total_amount,
      }).catch(() => {})

      // Group payout by provider
      const byProvider = new Map<string, { payout: number; itemNames: string[] }>()
      for (const i of items) {
        if (!i.provider_email) continue
        const entry = byProvider.get(i.provider_email) || { payout: 0, itemNames: [] }
        entry.payout += i.provider_payout || 0
        entry.itemNames.push(`${i.name} ×${i.quantity}`)
        byProvider.set(i.provider_email, entry)
      }

      for (const [providerEmail, info] of byProvider.entries()) {
        const provider = await prisma.user.findUnique({ where: { email: providerEmail } })
        sendProviderNewOrderEmail(providerEmail, {
          providerName: provider?.full_name || providerEmail.split('@')[0],
          orderId: order.id,
          productName: info.itemNames.join(', '),
          quantity: 1,
          payoutAmount: Math.round(info.payout * 100) / 100,
        }).catch(() => {})

        const notification = await prisma.notification.create({
          data: {
            user_email: providerEmail,
            title: 'Νέα παραγγελία προϊόντος',
            message: `${info.itemNames.join(', ')} — αμοιβή ${(Math.round(info.payout * 100) / 100).toFixed(2)}€`,
            type: 'new_order',
            link: '/provider',
          },
        })
        broadcastToUser(providerEmail, { type: 'notification', notification })
      }
    } catch (err: any) {
      console.error('firePaidSideEffects error:', err)
    }
  }

  // Viva webhook - payment confirmation (PUBLIC - no auth)
  app.post('/viva/webhook', async (req: any, reply) => {
    try {
      const event = req.body as any
      const eventType = event.EventTypeId
      const eventData = event.EventData

      // 1796 = Transaction Payment Created (success)
      if (eventType === 1796 && eventData) {
        const merchantTrns = eventData.MerchantTrns  // our order id
        const transactionId = eventData.TransactionId
        const statusId = eventData.StatusId          // 'F' = Finished

        if (merchantTrns && statusId === 'F') {
          const updated = await prisma.order.updateMany({
            where: { id: merchantTrns, payment_status: { not: 'paid' } },
            data: {
              status: 'confirmed',
              payment_status: 'paid',
              payment_ref: String(transactionId),
            },
          }).catch(() => null)
          if (updated && updated.count > 0) {
            await firePaidSideEffects(merchantTrns)
          } else {
            // Not an order — try telehealth (same shared webhook URL handles both)
            await markTelehealthPaid(merchantTrns, String(transactionId)).catch((err) => {
              console.error('markTelehealthPaid fallback error:', err)
            })
          }
        }
      }
      return reply.code(200).send({ received: true })
    } catch (err: any) {
      console.error('Viva webhook error:', err)
      return reply.code(200).send({ received: true })
    }
  })

  // Viva webhook verification key (Viva sends GET to verify endpoint)
  app.get('/viva/webhook', async (req: any, reply) => {
    const merchantId = process.env.VIVA_MERCHANT_ID
    const apiKey = process.env.VIVA_API_KEY
    const isDemo = (process.env.VIVA_ENV || 'demo') === 'demo'
    const baseUrl = isDemo
      ? 'https://demo.vivapayments.com'
      : 'https://www.vivapayments.com'
    const credentials = Buffer.from(`${merchantId}:${apiKey}`).toString('base64')
    const res = await fetch(`${baseUrl}/api/messages/config/token`, {
      headers: { 'Authorization': `Basic ${credentials}` }
    })
    const data = await res.json() as any
    return { Key: data.Key }
  })

  // Manual verify (called from success page)
  app.post('/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { order_id, transaction_id } = req.body as any
    try {
      if (transaction_id) {
        const transaction = await getVivaTransaction(transaction_id)
        if (transaction.statusId === 'F') {
          const updated = await prisma.order.updateMany({
            where: { id: order_id, payment_status: { not: 'paid' } },
            data: { status: 'confirmed', payment_status: 'paid', payment_ref: String(transaction_id) },
          })
          if (updated.count > 0) {
            await firePaidSideEffects(order_id)
          }
          return { paid: true, order_id }
        }
      }
      return { paid: false, order_id }
    } catch (err: any) {
      console.error('Viva verify error:', err)
      return reply.code(500).send({ message: err.message })
    }
  })

  // Admin: get all orders
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const user = req.user as any
    if (user.role !== 'admin') return { data: [] }
    const orders = await prisma.order.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    return { data: orders }
  })
}

export default ordersRoutes
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\routes\orders.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\routes\orders.ts") -Value $f6 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\routes\orders.ts"

$f7 = @'
import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { calculateCommission } from '../lib/commission.js'
import { sendBookingConfirmedEmail, sendProviderNewBookingEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'

const bookingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const { tab = 'upcoming' } = req.query
    const now = new Date().toISOString().split('T')[0]
    const where: any = { customer_email: email }
    if (tab === 'upcoming') where.booking_date = { gte: now }
    else if (tab === 'past') where.booking_date = { lt: now }
    const data = await prisma.booking.findMany({ where, orderBy: { booking_date: 'asc' } })
    return { data, total: data.length }
  })

  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const body = req.body as any

    // Authoritative lookup of the service for provider_email + category (don't trust client for commission routing)
    const service = body.service_id ? await prisma.service.findUnique({ where: { id: body.service_id } }) : null
    const providerEmail = service?.provider_email || body.provider_email
    const providerName = service?.provider_name || body.provider_name
    const totalPrice = parseFloat(body.total_price) || 0
    const category = service?.service_type || null

    const { rate, platformFee, providerPayout } = await calculateCommission(totalPrice, category)

    const booking = await prisma.booking.create({
      data: {
        ...body,
        customer_email: email,
        customer_name: full_name,
        provider_email: providerEmail,
        provider_name: providerName,
        total_price: totalPrice,
        status: body.status || 'confirmed',
        commission_rate: rate,
        platform_fee_amount: platformFee,
        provider_payout_amount: providerPayout,
      }
    })

    // Side effects — never block the booking response on email/notification failures
    sendBookingConfirmedEmail(email, {
      customerName: full_name || email.split('@')[0],
      providerName: providerName || 'τον πάροχο',
      date: booking.booking_date,
      time: booking.booking_time,
      price: totalPrice,
    }).catch(() => {})

    if (providerEmail) {
      sendProviderNewBookingEmail(providerEmail, {
        providerName: providerName || providerEmail.split('@')[0],
        customerName: full_name || email.split('@')[0],
        date: booking.booking_date,
        time: booking.booking_time,
        payoutAmount: providerPayout,
      }).catch(() => {})

      prisma.notification.create({
        data: {
          user_email: providerEmail,
          title: 'Νέα κράτηση',
          message: `${full_name || email.split('@')[0]} · ${booking.booking_date} ${booking.booking_time} · αμοιβή ${providerPayout.toFixed(2)}€`,
          type: 'new_booking',
          link: '/provider',
        },
      }).then(notification => broadcastToUser(providerEmail, { type: 'notification', notification })).catch(() => {})
    }

    return reply.code(201).send(booking)
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    return prisma.booking.update({ where: { id: req.params.id }, data: req.body })
  })
}
export default bookingsRoutes
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\routes\bookings.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\routes\bookings.ts") -Value $f7 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\routes\bookings.ts"

$f8 = @'
import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { createVivaPaymentOrder, getVivaTransaction } from '../lib/viva.js'
import { calculateCommission } from '../lib/commission.js'
import { sendTelehealthConfirmedEmail, sendProviderNewTelehealthEmail } from '../lib/email.js'
import { broadcastToUser } from './notifications.js'

// Fires once when a consultation is confirmed paid: generates the meeting room,
// sends customer + provider emails, and notifies the provider in-app.
// Exported (top-level) so orders.ts's shared Viva webhook can call it as a fallback
// when a paid merchantTrns id doesn't match an Order (i.e. it's a telehealth payment).
export async function markTelehealthPaid(consultationId: string, transactionId: string): Promise<boolean> {
  const updated = await prisma.telehealthConsultation.updateMany({
    where: { id: consultationId, payment_status: { not: 'paid' } },
    data: {
      payment_status: 'paid',
      status: 'scheduled',
      payment_ref: String(transactionId),
      meeting_url: `globipet-th-${consultationId}`,
    },
  })
  if (updated.count === 0) return false

  const consultation = await prisma.telehealthConsultation.findUnique({ where: { id: consultationId } })
  if (!consultation) return true

  sendTelehealthConfirmedEmail(consultation.client_email, {
    customerName: consultation.client_name,
    providerName: consultation.provider_name,
    date: consultation.scheduled_date,
    time: consultation.scheduled_time,
  }).catch(() => {})

  sendProviderNewTelehealthEmail(consultation.provider_email, {
    providerName: consultation.provider_name,
    customerName: consultation.client_name,
    date: consultation.scheduled_date,
    time: consultation.scheduled_time,
    payoutAmount: consultation.provider_payout_amount || 0,
  }).catch(() => {})

  prisma.notification.create({
    data: {
      user_email: consultation.provider_email,
      title: 'Νέα συνεδρία τηλεϊατρικής',
      message: `${consultation.client_name} · ${consultation.scheduled_date} ${consultation.scheduled_time} · αμοιβή ${(consultation.provider_payout_amount || 0).toFixed(2)}€`,
      type: 'new_telehealth',
      link: '/provider',
    },
  }).then(notification => broadcastToUser(consultation.provider_email, { type: 'notification', notification })).catch(() => {})

  return true
}

// Returns the TelehealthConsultation row if `id` matches one — used by orders.ts's
// shared Viva webhook to detect which kind of payment just succeeded.
export async function findTelehealthById(id: string) {
  return prisma.telehealthConsultation.findUnique({ where: { id } })
}

const routes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const { email } = req.user as any
    const data = await prisma.telehealthConsultation.findMany({
      where: { OR: [{ client_email: email }, { provider_email: email }] },
      orderBy: { scheduled_date: 'desc' },
    })
    return { data }
  })

  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const consultation = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!consultation) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (consultation.client_email !== email && consultation.provider_email !== email) {
      return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    }
    return { data: consultation }
  })

  // Create a pending consultation and start Viva Smart Checkout. Payment MUST be confirmed
  // (via /:id/viva/verify or the shared orders.ts webhook fallback) before meeting_url is set.
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email, full_name } = req.user as any
    const { provider_email, provider_name, service_id, pet_id, pet_name, scheduled_date, scheduled_time, duration, notes, price } = req.body as any
    if (!provider_email || !scheduled_date || !scheduled_time) return reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })

    const sessionPrice = parseFloat(price) || 0
    const { rate, platformFee, providerPayout } = await calculateCommission(sessionPrice, 'telehealth')

    const consultation = await prisma.telehealthConsultation.create({
      data: {
        provider_email, provider_name: provider_name || provider_email,
        client_email: email, client_name: full_name || email.split('@')[0],
        pet_id: pet_id || null, pet_name: pet_name || null,
        service_id: service_id || null,
        scheduled_date, scheduled_time,
        duration: parseInt(duration) || 30,
        notes: notes || null,
        price: sessionPrice,
        status: 'pending_payment',
        payment_status: 'unpaid',
        commission_rate: rate,
        platform_fee_amount: platformFee,
        provider_payout_amount: providerPayout,
      }
    })

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com'
      const { orderCode, checkoutUrl } = await createVivaPaymentOrder({
        amount: sessionPrice,
        customerEmail: email,
        customerName: full_name,
        orderId: consultation.id,
        description: `GlobiPet τηλεϊατρική με ${provider_name || provider_email}`,
        successUrl: `${frontendUrl}/telehealth/${consultation.id}/confirmation`,
        failureUrl: `${frontendUrl}/telehealth/${consultation.id}/confirmation`,
      })
      await prisma.telehealthConsultation.update({
        where: { id: consultation.id },
        data: { payment_ref: String(orderCode) },
      })
      return reply.code(201).send({ data: consultation, checkoutUrl })
    } catch (err: any) {
      console.error('Telehealth Viva checkout error:', err)
      return reply.code(500).send({ message: 'Σφάλμα δημιουργίας πληρωμής: ' + err.message })
    }
  })

  // Manual verify (called from the confirmation page after Viva redirect)
  app.post('/:id/viva/verify', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { id } = req.params
    const { transaction_id } = req.body as any
    try {
      const consultation = await prisma.telehealthConsultation.findUnique({ where: { id } })
      if (!consultation) return reply.code(404).send({ message: 'Δεν βρέθηκε' })

      if (consultation.payment_status === 'paid') {
        return { paid: true, data: consultation }
      }
      if (transaction_id) {
        const transaction = await getVivaTransaction(transaction_id)
        if (transaction.statusId === 'F') {
          await markTelehealthPaid(id, transaction_id)
          const fresh = await prisma.telehealthConsultation.findUnique({ where: { id } })
          return { paid: true, data: fresh }
        }
      }
      return { paid: false, data: consultation }
    } catch (err: any) {
      console.error('Telehealth verify error:', err)
      return reply.code(500).send({ message: err.message })
    }
  })

  app.patch('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.code(404).send({ message: 'Δεν βρέθηκε' })
    if (existing.client_email !== email && existing.provider_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    return prisma.telehealthConsultation.update({ where: { id: req.params.id }, data: req.body })
  })

  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const { email } = req.user as any
    const existing = await prisma.telehealthConsultation.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.client_email !== email) return reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })
    await prisma.telehealthConsultation.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
  })
}

export default routes
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\routes\telehealth.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\routes\telehealth.ts") -Value $f8 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\routes\telehealth.ts"

$f9 = @'
import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { broadcastToUser } from './notifications.js'
import { calculateCommission } from '../lib/commission.js'
import { sendSubscriptionStartedEmail, sendSubscriptionRenewedEmail, sendSubscriptionFailedEmail } from '../lib/email.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

const webhooksRoutes: FastifyPluginAsync = async (app) => {

  // Capture raw body ONLY within this plugin's scope (encapsulated — doesn't affect other routes)
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  app.post('/stripe', async (req: any, reply) => {
    const sig = req.headers['stripe-signature']
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
    } catch (err: any) {
      console.error('Stripe webhook signature error:', err.message)
      return reply.code(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          if (session.mode === 'subscription' && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            const meta = subscription.metadata
            if (meta?.product_id && meta?.user_id) {
              const existing = await prisma.productSubscription.findUnique({
                where: { stripe_subscription_id: subscription.id },
              })
              if (!existing) {
                const product = await prisma.product.findUnique({ where: { id: meta.product_id } })
                const { rate } = await calculateCommission(parseFloat(meta.monthly_price || '0'), product?.category || 'food')
                const created = await prisma.productSubscription.create({
                  data: {
                    user_id: meta.user_id,
                    product_id: meta.product_id,
                    discount_percent: parseFloat(meta.discount_percent || '0'),
                    monthly_price: parseFloat(meta.monthly_price || '0'),
                    commission_rate: rate,
                    status: 'active',
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: subscription.id,
                    next_delivery_date: new Date(),
                    deliveries_completed: 0,
                  },
                  include: { user: true, product: true },
                })
                sendSubscriptionStartedEmail(created.user.email, {
                  customerName: created.user.full_name,
                  productName: created.product.name,
                  monthlyPrice: created.monthly_price,
                }).catch(() => {})
              }
            }
          }
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = invoice.subscription as string
          if (subId) {
            const productSub = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId },
              include: { product: true, user: true },
            })
            if (productSub) {
              const nextDelivery = new Date()
              nextDelivery.setMonth(nextDelivery.getMonth() + 1)

              await prisma.productSubscription.update({
                where: { id: productSub.id },
                data: {
                  deliveries_completed: { increment: 1 },
                  next_delivery_date: nextDelivery,
                  status: 'active',
                },
              })

              const rate = productSub.commission_rate ?? 10
              const platformFee = Math.round(productSub.monthly_price * (rate / 100) * 100) / 100
              const providerPayout = Math.round((productSub.monthly_price - platformFee) * 100) / 100
              const providerEmail = (productSub.product as any).provider_email || null

              // Create the monthly delivery order
              await prisma.order.create({
                data: {
                  user_email: productSub.user.email,
                  user_name: productSub.user.full_name,
                  items: [{
                    product_id: productSub.product_id, name: productSub.product.name, price: productSub.monthly_price, quantity: 1,
                    category: productSub.product.category, provider_email: providerEmail,
                    commission_rate: providerEmail ? rate : null,
                    platform_fee: providerEmail ? platformFee : null,
                    provider_payout: providerEmail ? providerPayout : null,
                  }],
                  total_amount: productSub.monthly_price,
                  status: 'processing',
                  payment_status: 'paid',
                  shipping_address: {},
                  payment_method: 'stripe_subscription',
                  platform_fee_amount: providerEmail ? platformFee : null,
                  provider_payout_amount: providerEmail ? providerPayout : null,
                  notes: `Αυτόματη μηνιαία παράδοση συνδρομής (παράδοση #${productSub.deliveries_completed + 1}/12)`,
                },
              })

              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: 'Η μηνιαία παράδοση τροφής προγραμματίστηκε',
                  message: `Η πληρωμή της συνδρομής σου για "${productSub.product.name}" έγινε επιτυχώς. Η παράδοση ετοιμάζεται.`,
                  type: 'subscription_delivery',
                  link: '/orders',
                },
              })
              broadcastToUser(productSub.user_id, { type: 'notification', notification })

              sendSubscriptionRenewedEmail(productSub.user.email, {
                customerName: productSub.user.full_name,
                productName: productSub.product.name,
                deliveryNumber: productSub.deliveries_completed + 1,
              }).catch(() => {})

              if (providerEmail) {
                prisma.notification.create({
                  data: {
                    user_email: providerEmail,
                    title: 'Νέα παράδοση συνδρομής',
                    message: `${productSub.product.name} ×1 — αμοιβή ${providerPayout.toFixed(2)}€`,
                    type: 'new_order',
                    link: '/provider',
                  },
                }).then(n => broadcastToUser(providerEmail, { type: 'notification', notification: n })).catch(() => {})
              }
            }
          }
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = invoice.subscription as string
          if (subId) {
            const productSub = await prisma.productSubscription.findUnique({
              where: { stripe_subscription_id: subId },
              include: { user: true, product: true },
            })
            if (productSub) {
              await prisma.productSubscription.update({
                where: { id: productSub.id },
                data: { status: 'payment_failed' },
              })
              const notification = await prisma.notification.create({
                data: {
                  user_email: productSub.user.email,
                  title: 'Αποτυχία πληρωμής συνδρομής',
                  message: `Η χρέωση για τη συνδρομή "${productSub.product.name}" απέτυχε. Ενημέρωσε τα στοιχεία πληρωμής σου.`,
                  type: 'subscription_payment_failed',
                  link: '/profile',
                },
              })
              broadcastToUser(productSub.user_id, { type: 'notification', notification })

              sendSubscriptionFailedEmail(productSub.user.email, {
                customerName: productSub.user.full_name,
                productName: productSub.product.name,
              }).catch(() => {})
            }
          }
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await prisma.productSubscription.updateMany({
            where: { stripe_subscription_id: subscription.id },
            data: { status: 'cancelled', end_date: new Date() },
          })
          break
        }
      }

      return reply.send({ received: true })
    } catch (err: any) {
      console.error('Stripe webhook handler error:', err)
      return reply.code(500).send({ message: err.message })
    }
  })
}

export default webhooksRoutes
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\routes\webhooks.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\routes\webhooks.ts") -Value $f9 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\routes\webhooks.ts"

$f10 = @'
import type { FastifyPluginAsync } from 'fastify'
import prisma from '../lib/prisma.js'
import { sendAiTrialStartedEmail } from '../lib/email.js'

const aiSubscriptionsRoutes: FastifyPluginAsync = async (app) => {

  const isAdmin = async (req: any, reply: any) => {
    if ((req.user as any)?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' })
    }
  }

  // GET /ai-subscriptions/plans
  app.get('/plans', async (req, reply) => {
    const plans = await prisma.aiSubscriptionPlan.findMany({
      where: { is_active: true },
      orderBy: [{ is_featured: 'desc' }, { display_order: 'asc' }, { price_monthly: 'asc' }],
    })
    return reply.send({ data: plans })
  })

  // GET /ai-subscriptions/my-status
  app.get('/my-status', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: (req.user as any).id },
      select: { ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
    })
    if (!user) return reply.code(404).send({ message: 'Not found' })

    let daysLeft = null
    if (user.ai_subscription_status === 'trial' && user.ai_trial_started_at) {
      const elapsedMs = Date.now() - new Date(user.ai_trial_started_at).getTime()
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)
      daysLeft = Math.max(0, Math.ceil(15 - elapsedDays))
    }
    return reply.send({ data: { ...user, trial_days_left: daysLeft } })
  })

  // POST /ai-subscriptions/start-trial
  app.post('/start-trial', { preHandler: [(app as any).authenticate] }, async (req: any, reply) => {
    const userId = (req.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ message: 'Not found' })

    if (user.ai_subscription_status !== 'none') {
      return reply.code(400).send({ message: 'Έχετε ήδη χρησιμοποιήσει ή ενεργοποιήσει το δωρεάν trial' })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ai_subscription_status: 'trial', ai_trial_started_at: new Date() },
      select: { ai_subscription_status: true, ai_trial_started_at: true, email: true, full_name: true },
    })
    sendAiTrialStartedEmail(updated.email, { customerName: updated.full_name }).catch(() => {})
    return reply.send({ data: updated })
  })

  // POST /admin/ai-subscriptions/plans
  app.post('/admin/plans', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const plan = await prisma.aiSubscriptionPlan.create({ data: req.body })
    return reply.code(201).send({ data: plan })
  })

  // PATCH /admin/ai-subscriptions/plans/:id
  app.patch('/admin/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    const plan = await prisma.aiSubscriptionPlan.update({ where: { id: req.params.id }, data: req.body })
    return reply.send({ data: plan })
  })

  // DELETE /admin/ai-subscriptions/plans/:id
  app.delete('/admin/plans/:id', { preHandler: [(app as any).authenticate, isAdmin] }, async (req: any, reply) => {
    await prisma.aiSubscriptionPlan.delete({ where: { id: req.params.id } })
    return reply.send({ success: true })
  })
}

export default aiSubscriptionsRoutes
'@
$dir = Split-Path (Join-Path $root "apps\backend\src\routes\ai-subscriptions.ts")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\backend\src\routes\ai-subscriptions.ts") -Value $f10 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\backend\src\routes\ai-subscriptions.ts"

$f11 = @'
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { useAuthStore } from '@/store/auth'
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import ProviderLayout from '@/components/layout/ProviderLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingScreen from '@/components/ui/LoadingScreen'

const Home              = lazy(() => import('@/pages/Home'))
const Social            = lazy(() => import('@/pages/Social'))
const Marketplace       = lazy(() => import('@/pages/Marketplace'))
const ProductDetail     = lazy(() => import('@/pages/ProductDetail'))
const Services          = lazy(() => import('@/pages/Services'))
const ServiceDetail     = lazy(() => import('@/pages/ServiceDetail'))
const AiPetHealth       = lazy(() => import('@/pages/AiPetHealth'))
const AiEmotion         = lazy(() => import('@/pages/AiEmotion'))
const AiStoolUrine      = lazy(() => import('@/pages/AiStoolUrine'))
const PetPassport       = lazy(() => import('@/pages/PetPassport'))
const Playdates         = lazy(() => import('@/pages/Playdates'))
const Communities       = lazy(() => import('@/pages/Communities'))
const Telehealth        = lazy(() => import('@/pages/Telehealth'))
const TelehealthConfirmation = lazy(() => import('@/pages/TelehealthConfirmation'))
const Insurance         = lazy(() => import('@/pages/Insurance'))
const MyPets            = lazy(() => import('@/pages/MyPets'))
const PetDetail         = lazy(() => import('@/pages/PetDetail'))
const PetMedicalCenter  = lazy(() => import('@/pages/PetMedicalCenter'))
const PetTracker        = lazy(() => import('@/pages/PetTracker'))
const MyBookings        = lazy(() => import('@/pages/MyBookings'))
const Events            = lazy(() => import('@/pages/Events'))
const EventDetail       = lazy(() => import('@/pages/EventDetail'))
const Community         = lazy(() => import('@/pages/Community'))
const Forum             = lazy(() => import('@/pages/Forum'))
const ForumTopic        = lazy(() => import('@/pages/ForumTopic'))
const BreedExplorer     = lazy(() => import('@/pages/BreedExplorer'))
const BreedDetail       = lazy(() => import('@/pages/BreedDetail'))
const Profile           = lazy(() => import('@/pages/Profile'))
const Wishlist          = lazy(() => import('@/pages/Wishlist'))
const Checkout          = lazy(() => import('@/pages/Checkout'))
const MyOrders          = lazy(() => import('@/pages/MyOrders'))
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'))
const MarketInsights    = lazy(() => import('@/pages/MarketInsights'))
const Login             = lazy(() => import('@/pages/auth/Login'))
const Register          = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword    = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword     = lazy(() => import('@/pages/auth/ResetPassword'))
const ProviderDashboard = lazy(() => import('@/pages/provider/ProviderDashboard'))
const ProviderPackagesPage = lazy(() => import('@/pages/provider/ProviderPackagesPage'))
const AdminDashboard    = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminCatalogPage  = lazy(() => import('@/pages/admin/AdminCatalogPage'))
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage'))
const AdminPackagesPage = lazy(() => import('@/pages/admin/AdminPackagesPage'))
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage'))
const AdminCommissionsPage = lazy(() => import('@/pages/admin/AdminCommissionsPage'))
const ProductSubscribe  = lazy(() => import('@/pages/ProductSubscribe'))
const NotFound          = lazy(() => import('@/pages/NotFound'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false } },
})

function OAuthHandler() {
  return null
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function ProviderRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const canAccess = user?.role === 'service_provider' || user?.role === 'both' || user?.role === 'admin'
  return canAccess ? <>{children}</> : <Navigate to="/" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OAuthHandler />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login"           element={<Login />} />
                <Route path="/register"        element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password"  element={<ResetPassword />} />
              </Route>

              <Route element={<MainLayout />}>
                <Route path="/"                element={<Home />} />
                <Route path="/social"          element={<Social />} />
                <Route path="/marketplace"     element={<Marketplace />} />
                <Route path="/marketplace/:id" element={<ProductDetail />} />
                <Route path="/marketplace/:id/subscribe" element={<PrivateRoute><ProductSubscribe /></PrivateRoute>} />
                <Route path="/services"        element={<Services />} />
                <Route path="/services/:id"    element={<ServiceDetail />} />
                <Route path="/events"          element={<Events />} />
                <Route path="/events/:id"      element={<EventDetail />} />
                <Route path="/breeds"          element={<BreedExplorer />} />
                <Route path="/breeds/:id"      element={<BreedDetail />} />
                <Route path="/forum"           element={<Forum />} />
                <Route path="/forum/:id"       element={<ForumTopic />} />
                <Route path="/insurance"       element={<Insurance />} />
                <Route path="/ai-health"       element={<PrivateRoute><AiPetHealth /></PrivateRoute>} />
                <Route path="/ai-emotion"      element={<PrivateRoute><AiEmotion /></PrivateRoute>} />
                <Route path="/ai-stool-urine"  element={<PrivateRoute><AiStoolUrine /></PrivateRoute>} />
                <Route path="/passport"        element={<PrivateRoute><PetPassport /></PrivateRoute>} />
                <Route path="/playdates"       element={<PrivateRoute><Playdates /></PrivateRoute>} />
                <Route path="/communities"     element={<PrivateRoute><Communities /></PrivateRoute>} />
                <Route path="/telehealth"      element={<PrivateRoute><Telehealth /></PrivateRoute>} />
                <Route path="/telehealth/:id/confirmation" element={<PrivateRoute><TelehealthConfirmation /></PrivateRoute>} />
                <Route path="/my-pets"         element={<PrivateRoute><MyPets /></PrivateRoute>} />
                <Route path="/my-pets/:id"     element={<PrivateRoute><PetDetail /></PrivateRoute>} />
                <Route path="/medical-center"  element={<PrivateRoute><PetMedicalCenter /></PrivateRoute>} />
                <Route path="/tracker"         element={<PrivateRoute><PetTracker /></PrivateRoute>} />
                <Route path="/bookings"        element={<PrivateRoute><MyBookings /></PrivateRoute>} />
                <Route path="/community"       element={<PrivateRoute><Community /></PrivateRoute>} />
                <Route path="/profile"         element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/wishlist"        element={<PrivateRoute><Wishlist /></PrivateRoute>} />
                <Route path="/checkout"        element={<PrivateRoute><Checkout /></PrivateRoute>} />
                <Route path="/orders"          element={<PrivateRoute><MyOrders /></PrivateRoute>} />
                <Route path="/orders/:id"      element={<PrivateRoute><OrderConfirmation /></PrivateRoute>} />
                <Route path="/market-insights" element={<PrivateRoute><MarketInsights /></PrivateRoute>} />
              </Route>

              <Route element={<ProviderRoute><ProviderLayout /></ProviderRoute>}>
                <Route path="/provider"          element={<ProviderDashboard />} />
                <Route path="/provider/packages" element={<ProviderPackagesPage />} />
                <Route path="/provider/*"        element={<ProviderDashboard />} />
              </Route>

              <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="/admin"               element={<AdminDashboard />} />
                <Route path="/admin/catalog"       element={<AdminCatalogPage />} />
                <Route path="/admin/services"      element={<AdminServicesPage />} />
                <Route path="/admin/packages"      element={<AdminPackagesPage />} />
                <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
                <Route path="/admin/commissions"   element={<AdminCommissionsPage />} />
                <Route path="/admin/*"             element={<AdminDashboard />} />
              </Route>
              <Route path="*"        element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', background: '#1a1a1a', color: '#fff', fontSize: '14px' },
        }} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </I18nextProvider>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\App.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\App.tsx") -Value $f11 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\web\src\App.tsx"

$f12 = @'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Building2, Package, Layers, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/admin',              label: 'Επισκόπηση', icon: LayoutDashboard, exact: true },
  { path: '/admin/catalog',      label: 'Κατάλογος',  icon: BookOpen },
  { path: '/admin/services',     label: 'Υπηρεσίες',  icon: Building2 },
  { path: '/admin/packages',     label: 'Πακέτα',     icon: Package },
  { path: '/admin/subscriptions', label: 'Συνδρομές', icon: Layers },
  { path: '/admin/commissions',  label: 'Προμήθειες', icon: Percent },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
        <div className="page-container">
          <div className="flex flex-wrap gap-1 py-2">
            {tabs.map(tab => {
              const active = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path)
              return (
                <Link key={tab.path} to={tab.path} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', active ? 'bg-brand-900 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  <tab.icon size={16}/>{tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\components\layout\AdminLayout.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\components\layout\AdminLayout.tsx") -Value $f12 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\web\src\components\layout\AdminLayout.tsx"

$f13 = @'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Percent, ShoppingBag, Wrench, Save, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const PRODUCT_CATEGORIES = [
  { key: 'food',        label: 'Τροφές',     emoji: '🦴' },
  { key: 'toys',        label: 'Παιχνίδια',  emoji: '🎾' },
  { key: 'accessories', label: 'Αξεσουάρ',   emoji: '🎀' },
]

const SERVICE_CATEGORIES = [
  { key: 'services_default', label: 'Προεπιλογή Υπηρεσιών', emoji: '✨' },
  { key: 'veterinary',  label: 'Κτηνίατρος',  emoji: '🩺' },
  { key: 'grooming',    label: 'Περιποίηση',  emoji: '✂️' },
  { key: 'training',    label: 'Εκπαίδευση',  emoji: '🎓' },
  { key: 'hosting',     label: 'Φιλοξενία',   emoji: '🏠' },
  { key: 'walking',     label: 'Βόλτες',      emoji: '🚶' },
  { key: 'pet_taxi',    label: 'Pet Taxi',    emoji: '🚕' },
  { key: 'photography', label: 'Φωτογράφηση', emoji: '📸' },
  { key: 'pharmacy',    label: 'Φαρμακείο',   emoji: '💊' },
  { key: 'telehealth',  label: 'Τηλεϊατρική', emoji: '🩻' },
]

export default function AdminCommissionsPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [previewAmount, setPreviewAmount] = useState('100')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { data: rates, isLoading } = useQuery({
    queryKey: ['commission-rates'],
    queryFn: () => api.get('/settings/commission-rates').then(r => r.data?.data ?? {}),
  })

  useEffect(() => {
    if (rates) {
      const initial: Record<string, string> = {}
      for (const [k, v] of Object.entries(rates)) initial[k] = String(v)
      setDraft(initial)
    }
  }, [rates])

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, number> = {}
      for (const [k, v] of Object.entries(draft)) {
        if (v !== '') payload[k] = parseFloat(v)
      }
      return api.patch('/settings/commission-rates', payload)
    },
    onSuccess: () => {
      toast.success('Τα ποσοστά προμήθειας ενημερώθηκαν')
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] })
    },
    onError: (err: any) => toast.error(err?.message || 'Σφάλμα ενημέρωσης'),
  })

  const setRate = (key: string, val: string) => setDraft(d => ({ ...d, [key]: val }))

  const RateRow = ({ cat }: { cat: { key: string; label: string; emoji: string } }) => {
    const rateVal = parseFloat(draft[cat.key] || '0') || 0
    const amount = parseFloat(previewAmount) || 0
    const fee = Math.round(amount * (rateVal / 100) * 100) / 100
    const payout = Math.round((amount - fee) * 100) / 100
    return (
      <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <span className="text-xl shrink-0">{cat.emoji}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-[140px]">{cat.label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number" min={0} max={100} step={0.5}
            value={draft[cat.key] ?? ''}
            onChange={e => setRate(cat.key, e.target.value)}
            className="input w-20 text-sm text-right"
          />
          <span className="text-sm text-gray-400">%</span>
        </div>
        <div className="hidden sm:block text-xs text-gray-400 w-48 text-right">
          σε {previewAmount || 0}€ → πλατφόρμα <strong className="text-gray-600 dark:text-gray-300">{fee.toFixed(2)}€</strong>, πάροχος <strong className="text-green-600">{payout.toFixed(2)}€</strong>
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="page-container py-8 flex justify-center"><LoadingSpinner /></div>

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <Percent size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Προμήθειες Πλατφόρμας</h1>
            <p className="text-sm text-gray-500">Ποσοστό που κρατά το GlobiPet ανά κατηγορία προϊόντος/υπηρεσίας</p>
          </div>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <Save size={16} />{save.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
        </button>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
        <Info size={16} className="text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Φάση 1: τα ποσά καταγράφονται αυτόματα σε κάθε παραγγελία/κράτηση/συνεδρία (ορατά παρακάτω στα αντίστοιχα tabs), αλλά η μεταφορά χρημάτων στον πάροχο γίνεται ακόμα χειροκίνητα — αυτόματο payout (Stripe Connect/Viva sub-merchants) θα προστεθεί σε επόμενη φάση.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Δοκίμασε με ποσό</span>
        <input type="number" value={previewAmount} onChange={e => setPreviewAmount(e.target.value)} className="input w-24 text-sm" />
        <span className="text-xs text-gray-500">€</span>
      </div>

      {/* Products */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><ShoppingBag size={16}/> Προϊόντα (Κατάστημα)</h2>
        <p className="text-xs text-gray-500 mb-3">Εφαρμόζεται μόνο σε προϊόντα με δηλωμένο πάροχο (provider_email) — δικά σας/admin προϊόντα δεν έχουν προμήθεια.</p>
        {PRODUCT_CATEGORIES.map(cat => <RateRow key={cat.key} cat={cat} />)}
      </div>

      {/* Services */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><Wrench size={16}/> Υπηρεσίες & Τηλεϊατρική</h2>
        <p className="text-xs text-gray-500 mb-3">Η «Προεπιλογή Υπηρεσιών» ισχύει για κάθε τύπο υπηρεσίας χωρίς δικό του ποσοστό παρακάτω.</p>
        <RateRow cat={SERVICE_CATEGORIES[0]} />
        <button onClick={() => setShowAdvanced(s => !s)} className="text-xs text-brand-900 dark:text-brand-400 font-medium mt-3 mb-1">
          {showAdvanced ? '− Απόκρυψη ανά τύπο υπηρεσίας' : '+ Εξειδίκευση ανά τύπο υπηρεσίας'}
        </button>
        {showAdvanced && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {SERVICE_CATEGORIES.slice(1).map(cat => <RateRow key={cat.key} cat={cat} />)}
          </div>
        )}
      </div>
    </div>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\pages\admin\AdminCommissionsPage.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\pages\admin\AdminCommissionsPage.tsx") -Value $f13 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\web\src\pages\admin\AdminCommissionsPage.tsx"

$f14 = @'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Clock, Star, Search, Shield, Award, X, Lock, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function Telehealth() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [selectedVet, setSelectedVet] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [selectedPetId, setSelectedPetId] = useState('')

  // Real veterinary providers (telehealth-capable) from the services directory
  const { data: vets = [], isLoading } = useQuery({
    queryKey: ['telehealth-vets'],
    queryFn: () => api.get('/services?service_type=veterinary&limit=24').then(r => r.data?.data ?? []),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['my-pets'],
    queryFn: () => api.get('/pets/my').then(r => r.data?.data ?? []).catch(() => []),
    enabled: isAuthenticated,
  })

  const filteredVets = vets.filter((v: any) =>
    v.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.specializations?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  )

  const bookConsultation = useMutation({
    mutationFn: async () => {
      if (!selectedVet) throw new Error('Δεν επιλέχθηκε κτηνίατρος')
      const pet = pets.find((p: any) => p.id === selectedPetId)
      const { data } = await api.post('/telehealth', {
        provider_email: selectedVet.provider_email,
        provider_name: selectedVet.provider_name,
        service_id: selectedVet.id,
        pet_id: selectedPetId || undefined,
        pet_name: pet?.name,
        scheduled_date: bookingDate,
        scheduled_time: bookingTime,
        duration: 30,
        price: selectedVet.price,
      })
      return data
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Σφάλμα κατά την κράτηση'),
  })

  const openBooking = (vet: any) => {
    if (!isAuthenticated) { toast.error('Συνδεθείτε για να κλείσετε ραντεβού'); return }
    setSelectedVet(vet)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    setBookingDate(tomorrow.toISOString().split('T')[0])
    setBookingTime('10:00')
  }

  return (
    <>
      <div className="page-container py-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Video size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Τηλεϊατρική</h1>
              <p className="text-sm text-gray-500">Βιντεοκλήση με εξειδικευμένο κτηνίατρο — πληρωμή πριν τη συνεδρία</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shield, label: 'Ασφαλείς πληρωμές', value: 'Viva Wallet', color: 'text-green-600' },
            { icon: Clock, label: 'Διάρκεια συνεδρίας', value: '30 λεπτά', color: 'text-blue-600' },
            { icon: Award, label: 'Κτηνίατροι', value: String(vets.length), color: 'text-orange-600' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 text-center">
              <stat.icon size={20} className={cn('mx-auto mb-2', stat.color)} />
              <p className="font-bold text-gray-900 dark:text-white text-sm">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 mb-6">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Αναζήτηση κτηνιάτρου..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
        </div>

        {/* Vet list */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVets.map((vet: any, i: number) => (
              <motion.div key={vet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-sm shrink-0">
                    {getInitials(vet.provider_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{vet.provider_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{vet.specializations?.[0] || 'Γενική Κτηνιατρική'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={11} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{vet.rating || 0}</span>
                      <span className="text-xs text-gray-400">({vet.reviews_count || 0})</span>
                    </div>
                  </div>
                  {vet.is_verified && <Shield size={14} className="text-blue-500 shrink-0 mt-1.5" />}
                </div>

                <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                  <span>{vet.years_experience || 0} χρόνια εμπειρία</span>
                  <span className="font-semibold text-gray-900 dark:text-white">€{vet.price}/συνεδρία</span>
                </div>

                <button onClick={() => openBooking(vet)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all">
                  <Video size={13} /> Κλείσε & Πλήρωσε
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filteredVets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-900 dark:text-white">Δεν βρέθηκαν κτηνίατροι</p>
            <p className="text-sm text-gray-500 mt-1">Δοκιμάστε διαφορετική αναζήτηση</p>
          </div>
        )}
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {selectedVet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedVet(null)} />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto card p-6 shadow-2xl">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                    {getInitials(selectedVet.provider_name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedVet.provider_name}</p>
                    <p className="text-sm text-gray-500">{selectedVet.specializations?.[0] || 'Γενική Κτηνιατρική'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVet(null)} className="btn-ghost p-2"><X size={18} /></button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ημερομηνία</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="input w-full text-sm" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ώρα</label>
                  <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="input w-full text-sm" />
                </div>
                {pets.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Κατοικίδιο (προαιρετικό)</label>
                    <select value={selectedPetId} onChange={e => setSelectedPetId(e.target.value)} className="input w-full text-sm">
                      <option value="">— Επίλεξε —</option>
                      {pets.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 flex items-center gap-2">
                <Lock size={13} className="text-blue-600 shrink-0" />
                <span className="text-xs text-blue-600">Θα μεταφερθείς στο ασφαλές περιβάλλον πληρωμής Viva Wallet. Η κλήση ξεκλειδώνει μετά την επιβεβαίωση πληρωμής.</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Κόστος συνεδρίας</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">€{selectedVet.price}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedVet(null)} className="btn-secondary flex-1">Άκυρο</button>
                <button onClick={() => bookConsultation.mutate()} disabled={!bookingDate || !bookingTime || bookConsultation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50">
                  <Lock size={14}/>{bookConsultation.isPending ? 'Επεξεργασία...' : 'Πλήρωσε & Κλείσε'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\pages\Telehealth.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\pages\Telehealth.tsx") -Value $f14 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\web\src\pages\Telehealth.tsx"

$f15 = @'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

export default function JitsiCall({ roomName, vetName, onEnd }: { roomName: string; vetName: string; onEnd: () => void }) {
  const { user } = useAuthStore()
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(user?.full_name || 'Guest')}"&config.startWithAudioMuted=${muted}&config.startWithVideoMuted=${videoOff}&config.toolbarButtons=[]&config.disableDeepLinking=true&config.prejoinPageEnabled=false`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white font-medium text-sm">{vetName}</span>
          <span className="text-gray-400 text-xs">Τηλεϊατρική Συνεδρία</span>
        </div>
        <button onClick={onEnd} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 relative">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Jitsi Meet"
        />
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900 border-t border-gray-800">
        <button onClick={() => setMuted(!muted)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all', muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button onClick={() => setVideoOff(!videoOff)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all', videoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button onClick={() => setChatOpen(!chatOpen)}
          className="w-12 h-12 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center transition-all">
          <MessageSquare size={20} />
        </button>
        <button onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-all shadow-lg">
          <PhoneOff size={24} />
        </button>
      </div>
    </motion.div>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\components\features\telehealth\JitsiCall.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\components\features\telehealth\JitsiCall.tsx") -Value $f15 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\web\src\components\features\telehealth\JitsiCall.tsx"

$f16 = @'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Video, Calendar, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import JitsiCall from '@/components/features/telehealth/JitsiCall'

export default function TelehealthConfirmation() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeCall, setActiveCall] = useState(false)

  const transactionId = searchParams.get('t') || searchParams.get('transactionId') || searchParams.get('s')

  const { data: consultation, refetch } = useQuery({
    queryKey: ['telehealth', id],
    queryFn: () => api.get(`/telehealth/${id}`).then(r => r.data?.data),
    enabled: !!id,
  })

  const verify = useMutation({
    mutationFn: () => api.post(`/telehealth/${id}/viva/verify`, { transaction_id: transactionId }),
    onSuccess: () => refetch(),
  })

  useEffect(() => {
    if (id && consultation?.payment_status !== 'paid') {
      verify.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Poll every 3s while still unpaid (covers webhook-confirmed-before-redirect cases)
  useEffect(() => {
    if (consultation?.payment_status === 'paid') return
    const interval = setInterval(() => refetch(), 3000)
    return () => clearInterval(interval)
  }, [consultation?.payment_status, refetch])

  const isPaid = consultation?.payment_status === 'paid'
  const isPending = !consultation || consultation.payment_status === 'unpaid'

  if (activeCall && consultation?.meeting_url) {
    return <JitsiCall roomName={consultation.meeting_url} vetName={consultation.provider_name} onEnd={() => setActiveCall(false)} />
  }

  return (
    <div className="page-container py-16 max-w-md mx-auto text-center">
      {isPaid ? (
        <>
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή επιβεβαιώθηκε!</h1>
          <p className="text-sm text-gray-500 mb-6">Η συνεδρία σου με {consultation.provider_name} είναι έτοιμη.</p>
          <div className="card p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Calendar size={14} className="text-gray-400" /> {consultation.scheduled_date}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Clock size={14} className="text-gray-400" /> {consultation.scheduled_time}
            </div>
          </div>
          <button onClick={() => setActiveCall(true)} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Video size={16} /> Είσοδος στην κλήση
          </button>
          <button onClick={() => navigate('/telehealth')} className="btn-secondary w-full mt-3">Πίσω στην Τηλεϊατρική</button>
        </>
      ) : isPending ? (
        <>
          <Loader2 size={56} className="mx-auto text-blue-500 mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Επιβεβαίωση πληρωμής...</h1>
          <p className="text-sm text-gray-500">Περιμένουμε επιβεβαίωση από τη Viva Wallet. Μην κλείσεις αυτή τη σελίδα.</p>
        </>
      ) : (
        <>
          <XCircle size={56} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Η πληρωμή δεν ολοκληρώθηκε</h1>
          <p className="text-sm text-gray-500 mb-6">Δοκίμασε ξανά ή επικοινώνησε μαζί μας αν χρεώθηκες.</p>
          <button onClick={() => navigate('/telehealth')} className="btn-primary w-full">Πίσω στην Τηλεϊατρική</button>
        </>
      )}
    </div>
  )
}
'@
$dir = Split-Path (Join-Path $root "apps\web\src\pages\TelehealthConfirmation.tsx")
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Content -Path (Join-Path $root "apps\web\src\pages\TelehealthConfirmation.tsx") -Value $f16 -Encoding UTF8 -NoNewline
Write-Host "  OK: apps\web\src\pages\TelehealthConfirmation.tsx"

Write-Host ""
Write-Host "Done — 16 files updated." -ForegroundColor Green