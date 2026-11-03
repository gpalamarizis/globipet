-- Καθαρισμός δοκιμαστικών δεδομένων που φαίνονται δημόσια (έλεγχος 03/11/2026).
-- ΠΑΡΑΓΩΓΗ: να τρέξει μόνο με έγκριση. Όλα αφορούν συγκεκριμένα id — τίποτα μαζικό.
--
--   cd C:\gp\apps\backend
--   npx prisma db execute --file src/scripts/cleanup-test-data-20261103.sql --schema prisma/schema.prisma

BEGIN;

-- 1. Δύο εγγραφές του μητρώου φιλοζωικών με όνομα «>» (λάθος στην εισαγωγή).
--    Απόκρυψη, όχι διαγραφή: το μητρώο είναι επίσημο και μπορεί να διορθωθεί.
UPDATE welfare_organisations SET is_active = false
 WHERE id IN ('6bc1a59a-a9e1-4683-8a32-41e9ba808601', 'd6ae9659-9ee5-468a-9b70-95c1ec3ced7f')
   AND name = '>';

-- 2. Δοκιμαστικό θέμα φόρουμ «Τεστ υγεία» (οι απαντήσεις σβήνονται μαζί — ON DELETE CASCADE).
DELETE FROM forum_topics
 WHERE id = 'c8290edb-f0d2-4236-975d-d26a81cc36d3' AND title = 'Τεστ υγεία';

-- 3. Δοκιμαστική εκδήλωση «Τεστ εκδήλωση» (31/10 — οι εγγραφές σβήνονται μαζί).
DELETE FROM events
 WHERE id = '33e16eec-3c66-46a8-9e01-a44cae679ad6' AND title = 'Τεστ εκδήλωση';

COMMIT;
