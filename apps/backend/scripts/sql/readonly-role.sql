-- ============================================================================
-- GlobiPet — ρόλος ΜΟΝΟ ΑΝΑΓΝΩΣΗΣ για το εργαλείο SQL του διαχειριστή
-- (POST /api/admin/query, routes/admin.ts → DATABASE_URL_READONLY)
--
-- ΜΗΝ ΤΟ ΤΡΕΞΕΙΣ ΑΥΤΟΜΑΤΑ. Το τρέχει ο ιδιοκτήτης της βάσης (owner/superuser)
-- ΜΟΝΟ ΜΕ psql (ΟΧΙ από το Query tab της Railway ή άλλο γραφικό εργαλείο: το
-- αρχείο χρησιμοποιεί μεταβλητές του psql — \set / :'ro_password' — που μόνο
-- το psql καταλαβαίνει):
--      psql "<DATABASE_URL του owner>" -f readonly-role.sql
--
-- 1. Ο κωδικός ΠΡΕΠΕΙ να αλλάξει ΠΡΙΝ την εκτέλεση: γράψε τον ΜΙΑ φορά στη
--    γραμμή \set ro_password πιο κάτω (≥ 32 τυχαίοι χαρακτήρες, χωρίς ').
--    Αν μείνει CHANGE_ME_STRONG_PASSWORD (ή είναι < 32 χαρακτήρες), το αρχείο
--    σταματά με σφάλμα και δεν αλλάζει τίποτα.
-- 2. Τρέξε όλο το αρχείο (είναι μέσα σε BEGIN … COMMIT). Κάθε εκτέλεση ορίζει
--    ξανά τον κωδικό του ρόλου (ALTER ROLE … PASSWORD), άρα το ίδιο αρχείο
--    χρησιμεύει και για αλλαγή κωδικού.
-- 3. Όρισε στο Railway (backend):
--      DATABASE_URL_READONLY=postgresql://globipet_readonly:<κωδικός>@<host>:<port>/<db>?connection_limit=2
--    (ίδιο host/port/db με το DATABASE_URL, άλλος χρήστης/κωδικός).
--
-- ΣΤΗΛΕΣ: από το backend/prisma/schema.prisma (καμία στήλη με @map — τα ονόματα
-- των πεδίων είναι τα ονόματα των στηλών). ΠΡΙΝ το τρέξεις, επιβεβαίωσε στη
-- ΖΩΝΤΑΝΗ βάση ότι ταιριάζουν:
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name IN ('users','pet_trackers','calendar_connections','push_subscriptions','oauth_states')
--    ORDER BY table_name, ordinal_position;
-- Αν η βάση έχει στήλη που δεν είναι στη λίστα, το GRANT απλώς δεν τη δίνει
-- (ασφαλές)· αν λείπει στήλη της λίστας, το GRANT αποτυγχάνει και τίποτα δεν γράφεται.
--
-- ΣΚΟΠΙΜΑ ΧΩΡΙΣ ALTER DEFAULT PRIVILEGES: νέος πίνακας/στήλη ΔΕΝ γίνεται
-- αναγνώσιμος αυτόματα. Μετά από κάθε migration που προσθέτει πίνακα ή στήλη,
-- ξανατρέξε αυτό το αρχείο (είναι ιδεμποτικό) αφού ελέγξεις αν η νέα στήλη
-- είναι ευαίσθητη.
-- ============================================================================

\set ON_ERROR_STOP on
-- ΕΔΩ ο κωδικός (ΜΟΝΟ εδώ — χρησιμοποιείται πιο κάτω ως :'ro_password').
\set ro_password 'CHANGE_ME_STRONG_PASSWORD'

BEGIN;

-- Έλεγχος κωδικού: το psql δεν αντικαθιστά μεταβλητές μέσα σε $$…$$, οπότε ο
-- κωδικός περνά στο DO block μέσω ρύθμισης της συναλλαγής (is_local = true:
-- χάνεται στο COMMIT/ROLLBACK).
SELECT set_config('globipet.ro_password', :'ro_password', true) IS NOT NULL AS ro_password_loaded;
DO $$
DECLARE
  pw text := current_setting('globipet.ro_password', true);
BEGIN
  IF pw IS NULL OR pw = 'CHANGE_ME_STRONG_PASSWORD' OR length(pw) < 32 THEN
    RAISE EXCEPTION 'Άλλαξε το \set ro_password στην κορυφή του αρχείου (≥ 32 χαρακτήρες) πριν το τρέξεις.';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'globipet_readonly') THEN
    -- Χωρίς κωδικό εδώ· τον ορίζει το ALTER ROLE αμέσως μετά.
    CREATE ROLE globipet_readonly LOGIN;
  END IF;
END
$$;

-- Χωρίς συνθήκη: κάθε εκτέλεση ορίζει τον κωδικό (και για ρόλο που υπήρχε ήδη
-- με τον παλιό/placeholder κωδικό).
ALTER ROLE globipet_readonly WITH LOGIN PASSWORD :'ro_password';

-- Ασφαλείς προεπιλογές του ρόλου (ισχύουν σε κάθε σύνδεσή του).
ALTER ROLE globipet_readonly NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3;
ALTER ROLE globipet_readonly SET default_transaction_read_only = on;
ALTER ROLE globipet_readonly SET statement_timeout = '10s';
ALTER ROLE globipet_readonly SET idle_in_transaction_session_timeout = '30s';

-- Καθαρή αφετηρία: αφαιρείται ό,τι είχε δοθεί πριν (για επανάληψη του αρχείου).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM globipet_readonly;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM globipet_readonly;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO globipet_readonly', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO globipet_readonly;

-- ── Πίνακες χωρίς ευαίσθητες στήλες: SELECT σε όλο τον πίνακα ──
GRANT SELECT ON TABLE public.account_deletion_requests TO globipet_readonly;
GRANT SELECT ON TABLE public.achievements TO globipet_readonly;
GRANT SELECT ON TABLE public.ai_subscription_plans TO globipet_readonly;
GRANT SELECT ON TABLE public.app_settings TO globipet_readonly;
GRANT SELECT ON TABLE public.audit_logs TO globipet_readonly;
GRANT SELECT ON TABLE public.booking_packages TO globipet_readonly;
GRANT SELECT ON TABLE public.bookings TO globipet_readonly;
GRANT SELECT ON TABLE public.breach_incidents TO globipet_readonly;
GRANT SELECT ON TABLE public.breeds TO globipet_readonly;
GRANT SELECT ON TABLE public.campaign_audience TO globipet_readonly;
GRANT SELECT ON TABLE public.campaign_impressions TO globipet_readonly;
GRANT SELECT ON TABLE public.campaign_placements TO globipet_readonly;
GRANT SELECT ON TABLE public.campaign_targets TO globipet_readonly;
GRANT SELECT ON TABLE public.campaigns TO globipet_readonly;
GRANT SELECT ON TABLE public.cart_items TO globipet_readonly;
GRANT SELECT ON TABLE public.catalog_templates TO globipet_readonly;
GRANT SELECT ON TABLE public.communities TO globipet_readonly;
GRANT SELECT ON TABLE public.community_members TO globipet_readonly;
GRANT SELECT ON TABLE public.community_messages TO globipet_readonly;
GRANT SELECT ON TABLE public.contact_messages TO globipet_readonly;
GRANT SELECT ON TABLE public.customer_notes TO globipet_readonly;
GRANT SELECT ON TABLE public.event_registrations TO globipet_readonly;
GRANT SELECT ON TABLE public.events TO globipet_readonly;
GRANT SELECT ON TABLE public.forum_replies TO globipet_readonly;
GRANT SELECT ON TABLE public.forum_topics TO globipet_readonly;
GRANT SELECT ON TABLE public.health_records TO globipet_readonly;
GRANT SELECT ON TABLE public.insurance_plans TO globipet_readonly;
GRANT SELECT ON TABLE public.insurance_providers TO globipet_readonly;
GRANT SELECT ON TABLE public.loyalty_points TO globipet_readonly;
GRANT SELECT ON TABLE public.notifications TO globipet_readonly;
GRANT SELECT ON TABLE public.official_shelters TO globipet_readonly;
GRANT SELECT ON TABLE public.orders TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_allergies TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_chronic_conditions TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_dental_records TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_genetic_tests TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_imaging TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_lab_results TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_locations TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_medications TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_passport_access TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_pedigrees TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_surgeries TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_travel_documents TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_vital_signs TO globipet_readonly;
GRANT SELECT ON TABLE public.pet_weight_records TO globipet_readonly;
GRANT SELECT ON TABLE public.pets TO globipet_readonly;
GRANT SELECT ON TABLE public.playdate_events TO globipet_readonly;
GRANT SELECT ON TABLE public.playdate_invitations TO globipet_readonly;
GRANT SELECT ON TABLE public.post_comments TO globipet_readonly;
GRANT SELECT ON TABLE public.post_likes TO globipet_readonly;
GRANT SELECT ON TABLE public.posts TO globipet_readonly;
GRANT SELECT ON TABLE public.product_impressions TO globipet_readonly;
GRANT SELECT ON TABLE public.product_subscriptions TO globipet_readonly;
GRANT SELECT ON TABLE public.products TO globipet_readonly;
GRANT SELECT ON TABLE public.provider_messages TO globipet_readonly;
GRANT SELECT ON TABLE public.provider_staff TO globipet_readonly;
GRANT SELECT ON TABLE public.provider_verification_requests TO globipet_readonly;
GRANT SELECT ON TABLE public.reviews TO globipet_readonly;
GRANT SELECT ON TABLE public.service_packages TO globipet_readonly;
GRANT SELECT ON TABLE public.services TO globipet_readonly;
GRANT SELECT ON TABLE public.specialties TO globipet_readonly;
GRANT SELECT ON TABLE public.staff_service_prices TO globipet_readonly;
GRANT SELECT ON TABLE public.subprocessors TO globipet_readonly;
GRANT SELECT ON TABLE public.telehealth_consultations TO globipet_readonly;
GRANT SELECT ON TABLE public.translations TO globipet_readonly;
GRANT SELECT ON TABLE public.user_consents TO globipet_readonly;
GRANT SELECT ON TABLE public.user_insurance_subscriptions TO globipet_readonly;
GRANT SELECT ON TABLE public.vaccinations TO globipet_readonly;
GRANT SELECT ON TABLE public.welfare_organisations TO globipet_readonly;
GRANT SELECT ON TABLE public.wishlist TO globipet_readonly;

-- ── Πίνακες με ευαίσθητες στήλες: SELECT ΜΟΝΟ στις υπόλοιπες (column-level) ──
-- users: ΧΩΡΙΣ password_hash, google_id, reset_token, reset_token_expires, email_verify_token, email_verify_expires
GRANT SELECT (id, full_name, email, role, profile_photo, bio, phone, city, country, preferred_language, website, loyalty_tier, total_points, created_at, updated_at, is_verified, address, latitude, longitude, ai_subscription_status, ai_trial_started_at, ai_subscription_plan_id, birth_date, email_verified_at, token_version)
   ON TABLE public.users TO globipet_readonly;
-- pet_trackers: ΧΩΡΙΣ device_token
GRANT SELECT (id, pet_id, owner_email, device_id, name, brand, model, battery_percent, signal_strength, last_seen_at, is_active, created_at, updated_at)
   ON TABLE public.pet_trackers TO globipet_readonly;
-- calendar_connections: ΧΩΡΙΣ access_token, refresh_token
GRANT SELECT (id, user_email, provider, expires_at, calendar_id, account_email, is_active, last_synced_at, created_at, updated_at)
   ON TABLE public.calendar_connections TO globipet_readonly;
-- push_subscriptions: ΧΩΡΙΣ expo_token, endpoint, p256dh, auth
GRANT SELECT (id, user_id, platform, device_name, last_seen_at, created_at)
   ON TABLE public.push_subscriptions TO globipet_readonly;
-- oauth_states: ΧΩΡΙΣ state
GRANT SELECT (user_email, provider, created_at, expires_at)
   ON TABLE public.oauth_states TO globipet_readonly;

-- ΔΕΝ δίνονται: INSERT/UPDATE/DELETE/TRUNCATE, EXECUTE σε συναρτήσεις πέρα από
-- όσα έχει το PUBLIC, CREATE στο schema. Τα pg_read_file/pg_ls_dir κ.λπ. είναι
-- ήδη μόνο για superuser/pg_read_server_files. Τα pg_advisory_lock* είναι
-- ανοιχτά στο PUBLIC (το API τα χρειάζεται): τα κόβει ο έλεγχος κειμένου του
-- /admin/query, και το default_transaction_read_only δεν τα επηρεάζει.
-- ΜΗΝ προσθέσεις: ALTER DEFAULT PRIVILEGES (σκόπιμα — βλ. πάνω).

COMMIT;

-- Έλεγχος (ως globipet_readonly):
--   SELECT id, email FROM users LIMIT 1;          -- επιτρέπεται
--   SELECT password_hash FROM users LIMIT 1;      -- ERROR: permission denied
--   SELECT * FROM users LIMIT 1;                  -- ERROR: permission denied
--   UPDATE users SET bio = bio WHERE false;       -- ERROR: read-only / permission denied
