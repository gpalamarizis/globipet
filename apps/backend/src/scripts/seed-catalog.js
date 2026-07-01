"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-off seed script to populate catalog_templates table.
 * Run once: cd apps/backend && npx tsx src/scripts/seed-catalog.ts
 */
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
// All templates — prices NOT included (providers set their own)
var TEMPLATES = [
    // ===== GROOMING =====
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'small', suggested_duration_minutes: 45 },
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'medium', suggested_duration_minutes: 60 },
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'large', suggested_duration_minutes: 75 },
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο', size: 'xlarge', suggested_duration_minutes: 90 },
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'small', suggested_duration_minutes: 60 },
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'medium', suggested_duration_minutes: 75 },
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'large', suggested_duration_minutes: 90 },
    { category: 'grooming', group: 'bathing', name: 'Μπάνιο & χτένισμα', size: 'xlarge', suggested_duration_minutes: 105 },
    { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', description: 'Μπάνιο, στέγνωμα, κούρεμα, νύχια, αυτιά', size: 'small', suggested_duration_minutes: 90 },
    { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'medium', suggested_duration_minutes: 105 },
    { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'large', suggested_duration_minutes: 120 },
    { category: 'grooming', group: 'haircut', name: 'Πλήρες grooming (Full Groom)', size: 'xlarge', suggested_duration_minutes: 150 },
    { category: 'grooming', group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'small', suggested_duration_minutes: 60 },
    { category: 'grooming', group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'medium', suggested_duration_minutes: 75 },
    { category: 'grooming', group: 'haircut', name: 'De-shedding (αφαίρεση υποτρίχωσης)', size: 'large', suggested_duration_minutes: 90 },
    { category: 'grooming', group: 'haircut', name: 'Hand stripping', description: 'Παραδοσιακό για Terriers / Schnauzers', breed_group: 'terrier', size: 'small', suggested_duration_minutes: 90 },
    { category: 'grooming', group: 'haircut', name: 'Hand stripping', breed_group: 'terrier', size: 'medium', suggested_duration_minutes: 120 },
    { category: 'grooming', group: 'haircut', name: 'Hand stripping', breed_group: 'schnauzer', size: 'medium', suggested_duration_minutes: 120 },
    { category: 'grooming', group: 'haircut', name: 'De-matting (ξεκοτσίδωμα)', description: 'Επιπλέον χρέωση ανάλογα την κατάσταση', size: 'medium', suggested_duration_minutes: 30 },
    { category: 'grooming', group: 'addon', name: 'Κοπή νυχιών', is_addon: true, suggested_duration_minutes: 10 },
    { category: 'grooming', group: 'addon', name: 'Καθαρισμός αυτιών', is_addon: true, suggested_duration_minutes: 10 },
    { category: 'grooming', group: 'addon', name: 'Καθαρισμός παρά-πρωκτικών αδένων', is_addon: true, suggested_duration_minutes: 10 },
    { category: 'grooming', group: 'addon', name: 'Βούρτσισμα δοντιών', is_addon: true, suggested_duration_minutes: 10 },
    { category: 'grooming', group: 'addon', name: 'Blueberry facial', is_addon: true, suggested_duration_minutes: 10 },
    { category: 'grooming', group: 'addon', name: 'Oatmeal bath (ευαίσθητα δέρματα)', is_addon: true, suggested_duration_minutes: 15 },
    { category: 'grooming', group: 'addon', name: 'Παρφούμ', is_addon: true, suggested_duration_minutes: 5 },
    { category: 'grooming', group: 'addon', name: 'Nail polish (βερνίκι νυχιών)', is_addon: true, suggested_duration_minutes: 15 },
    { category: 'grooming', group: 'addon', name: 'Φιόγκος / κορδέλα', is_addon: true, suggested_duration_minutes: 5 },
    // ===== VETERINARY =====
    { category: 'veterinary', group: 'consultation', name: 'Επίσκεψη στο ιατρείο', modality: 'in_clinic', suggested_duration_minutes: 30 },
    { category: 'veterinary', group: 'consultation', name: 'Κατ\' οίκον επίσκεψη', modality: 'home_visit', suggested_duration_minutes: 45 },
    { category: 'veterinary', group: 'consultation', name: 'Τηλεσυμβουλευτική', modality: 'telehealth', suggested_duration_minutes: 20 },
    { category: 'veterinary', group: 'consultation', name: 'Επείγον περιστατικό', modality: 'emergency', suggested_duration_minutes: 30 },
    { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός βασικός (5πλά)', pet_type: 'dog', suggested_duration_minutes: 20 },
    { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός πλήρης (7πλά)', pet_type: 'dog', suggested_duration_minutes: 20 },
    { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός λύσσας', pet_type: 'dog', suggested_duration_minutes: 15 },
    { category: 'veterinary', group: 'vaccination', name: 'Εμβολιασμός γάτας (4πλά)', pet_type: 'cat', suggested_duration_minutes: 20 },
    { category: 'veterinary', group: 'vaccination', name: 'Αντιπαρασιτική προφύλαξη', suggested_duration_minutes: 10 },
    { category: 'veterinary', group: 'surgery', name: 'Στείρωση σκύλου αρσενικού', pet_type: 'dog', suggested_duration_minutes: 90 },
    { category: 'veterinary', group: 'surgery', name: 'Στείρωση σκύλου θηλυκού', pet_type: 'dog', suggested_duration_minutes: 120 },
    { category: 'veterinary', group: 'surgery', name: 'Στείρωση γάτας αρσενικής', pet_type: 'cat', suggested_duration_minutes: 45 },
    { category: 'veterinary', group: 'surgery', name: 'Στείρωση γάτας θηλυκής', pet_type: 'cat', suggested_duration_minutes: 75 },
    { category: 'veterinary', group: 'surgery', name: 'Μικρή χειρουργική επέμβαση', suggested_duration_minutes: 60 },
    { category: 'veterinary', group: 'dental', name: 'Καθαρισμός δοντιών (υπερηχητικός)', suggested_duration_minutes: 60 },
    { category: 'veterinary', group: 'dental', name: 'Εξαγωγή δοντιού', suggested_duration_minutes: 30 },
    { category: 'veterinary', group: 'diagnostics', name: 'Γενική εξέταση αίματος', suggested_duration_minutes: 15 },
    { category: 'veterinary', group: 'diagnostics', name: 'Βιοχημικός έλεγχος', suggested_duration_minutes: 15 },
    { category: 'veterinary', group: 'diagnostics', name: 'Έλεγχος Leishmania', suggested_duration_minutes: 15 },
    { category: 'veterinary', group: 'diagnostics', name: 'Έλεγχος Ehrlichia', suggested_duration_minutes: 15 },
    { category: 'veterinary', group: 'diagnostics', name: '4DX test (μεταδιδόμενα)', suggested_duration_minutes: 15 },
    { category: 'veterinary', group: 'other', name: 'Τοποθέτηση microchip', suggested_duration_minutes: 15 },
    { category: 'veterinary', group: 'other', name: 'Διαβατήριο', suggested_duration_minutes: 20 },
    // ===== CLINIC (everything vet + advanced diagnostics + specialties + oncology) =====
    { category: 'clinic', group: 'consultation', name: 'Επίσκεψη στο ιατρείο', modality: 'in_clinic', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'consultation', name: 'Κατ\' οίκον επίσκεψη', modality: 'home_visit', suggested_duration_minutes: 45 },
    { category: 'clinic', group: 'consultation', name: 'Τηλεσυμβουλευτική', modality: 'telehealth', suggested_duration_minutes: 20 },
    { category: 'clinic', group: 'consultation', name: 'Επείγον περιστατικό', modality: 'emergency', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός βασικός (5πλά)', pet_type: 'dog', suggested_duration_minutes: 20 },
    { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός πλήρης (7πλά)', pet_type: 'dog', suggested_duration_minutes: 20 },
    { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός λύσσας', pet_type: 'dog', suggested_duration_minutes: 15 },
    { category: 'clinic', group: 'vaccination', name: 'Εμβολιασμός γάτας (4πλά)', pet_type: 'cat', suggested_duration_minutes: 20 },
    { category: 'clinic', group: 'vaccination', name: 'Αντιπαρασιτική προφύλαξη', suggested_duration_minutes: 10 },
    { category: 'clinic', group: 'surgery', name: 'Στείρωση σκύλου αρσενικού', pet_type: 'dog', suggested_duration_minutes: 90 },
    { category: 'clinic', group: 'surgery', name: 'Στείρωση σκύλου θηλυκού', pet_type: 'dog', suggested_duration_minutes: 120 },
    { category: 'clinic', group: 'surgery', name: 'Στείρωση γάτας αρσενικής', pet_type: 'cat', suggested_duration_minutes: 45 },
    { category: 'clinic', group: 'surgery', name: 'Στείρωση γάτας θηλυκής', pet_type: 'cat', suggested_duration_minutes: 75 },
    { category: 'clinic', group: 'surgery', name: 'Μικρή χειρουργική επέμβαση', suggested_duration_minutes: 60 },
    { category: 'clinic', group: 'dental', name: 'Καθαρισμός δοντιών (υπερηχητικός)', suggested_duration_minutes: 60 },
    { category: 'clinic', group: 'dental', name: 'Εξαγωγή δοντιού', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'diagnostics', name: 'Γενική εξέταση αίματος', suggested_duration_minutes: 15 },
    { category: 'clinic', group: 'diagnostics', name: 'Βιοχημικός έλεγχος', suggested_duration_minutes: 15 },
    { category: 'clinic', group: 'diagnostics', name: 'Έλεγχος Leishmania', suggested_duration_minutes: 15 },
    { category: 'clinic', group: 'diagnostics', name: 'Έλεγχος Ehrlichia', suggested_duration_minutes: 15 },
    { category: 'clinic', group: 'diagnostics', name: '4DX test (μεταδιδόμενα)', suggested_duration_minutes: 15 },
    { category: 'clinic', group: 'diagnostics', name: 'Ψηφιακή ακτινογραφία', suggested_duration_minutes: 20 },
    { category: 'clinic', group: 'diagnostics', name: 'Υπέρηχος κοιλίας', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'diagnostics', name: 'Υπερηχοκαρδιογραφία', suggested_duration_minutes: 45 },
    { category: 'clinic', group: 'diagnostics', name: 'Ενδοσκόπηση', suggested_duration_minutes: 60 },
    { category: 'clinic', group: 'diagnostics', name: 'Γαστροσκόπηση', suggested_duration_minutes: 75 },
    { category: 'clinic', group: 'diagnostics', name: 'Κολονοσκόπηση', suggested_duration_minutes: 90 },
    { category: 'clinic', group: 'diagnostics', name: 'Ρινοσκόπηση', suggested_duration_minutes: 60 },
    { category: 'clinic', group: 'diagnostics', name: 'Λαπαροσκόπηση (διαγνωστική)', suggested_duration_minutes: 120 },
    { category: 'clinic', group: 'specialty', name: 'Δερματολογική εκτίμηση', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'specialty', name: 'Καρδιολογική εκτίμηση', suggested_duration_minutes: 45 },
    { category: 'clinic', group: 'specialty', name: 'Ορθοπεδική εκτίμηση', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'specialty', name: 'Οφθαλμολογική εκτίμηση', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'specialty', name: 'Νευρολογική εκτίμηση', suggested_duration_minutes: 45 },
    { category: 'clinic', group: 'specialty', name: 'Ενδοκρινολογική εκτίμηση', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'oncology', name: 'Ογκολογική εκτίμηση', suggested_duration_minutes: 60 },
    { category: 'clinic', group: 'oncology', name: 'Δειγματοληψία (FNA)', suggested_duration_minutes: 20 },
    { category: 'clinic', group: 'oncology', name: 'Βιοψία υπό υπέρηχο', suggested_duration_minutes: 45 },
    { category: 'clinic', group: 'oncology', name: 'Χημειοθεραπεία (συνεδρία)', suggested_duration_minutes: 90 },
    { category: 'clinic', group: 'oncology', name: 'Ογκολογική παρακολούθηση', suggested_duration_minutes: 30 },
    { category: 'clinic', group: 'other', name: 'Νοσηλεία (ημέρα)', suggested_duration_minutes: 1440 },
    { category: 'clinic', group: 'other', name: 'Νοσηλεία εντατικής (ημέρα)', suggested_duration_minutes: 1440 },
    { category: 'clinic', group: 'other', name: '24ωρη παρακολούθηση', suggested_duration_minutes: 1440 },
    { category: 'clinic', group: 'other', name: 'Τοποθέτηση microchip', suggested_duration_minutes: 15 },
    { category: 'clinic', group: 'other', name: 'Διαβατήριο', suggested_duration_minutes: 20 },
    // ===== WALKING =====
    { category: 'walking', group: 'service', name: 'Βόλτα 30 λεπτά', size: 'small', suggested_duration_minutes: 30 },
    { category: 'walking', group: 'service', name: 'Βόλτα 30 λεπτά', size: 'medium', suggested_duration_minutes: 30 },
    { category: 'walking', group: 'service', name: 'Βόλτα 30 λεπτά', size: 'large', suggested_duration_minutes: 30 },
    { category: 'walking', group: 'service', name: 'Βόλτα 60 λεπτά', size: 'small', suggested_duration_minutes: 60 },
    { category: 'walking', group: 'service', name: 'Βόλτα 60 λεπτά', size: 'medium', suggested_duration_minutes: 60 },
    { category: 'walking', group: 'service', name: 'Βόλτα 60 λεπτά', size: 'large', suggested_duration_minutes: 60 },
    { category: 'walking', group: 'addon', name: 'Επιπλέον σκύλος', is_addon: true, suggested_duration_minutes: 0 },
    { category: 'walking', group: 'addon', name: 'GPS tracking + φωτογραφίες', is_addon: true, suggested_duration_minutes: 0 },
    // ===== SITTING =====
    { category: 'sitting', group: 'service', name: 'Επίσκεψη στο σπίτι (30΄)', modality: 'home_visit', suggested_duration_minutes: 30 },
    { category: 'sitting', group: 'service', name: 'Επίσκεψη στο σπίτι (60΄)', modality: 'home_visit', suggested_duration_minutes: 60 },
    { category: 'sitting', group: 'service', name: 'Μέρα φροντίδας (10ω)', suggested_duration_minutes: 600 },
    { category: 'sitting', group: 'service', name: 'Διανυκτέρευση (1 βράδυ)', suggested_duration_minutes: 1440 },
    { category: 'sitting', group: 'addon', name: 'Επιπλέον κατοικίδιο', is_addon: true, suggested_duration_minutes: 0 },
    { category: 'sitting', group: 'addon', name: 'Χορήγηση φαρμακευτικής αγωγής', is_addon: true, suggested_duration_minutes: 0 },
    // ===== BOARDING / DAYCARE (shared) =====
    { category: 'boarding', group: 'service', name: 'Daycare (ημέρα)', size: 'small', suggested_duration_minutes: 600 },
    { category: 'boarding', group: 'service', name: 'Daycare (ημέρα)', size: 'medium', suggested_duration_minutes: 600 },
    { category: 'boarding', group: 'service', name: 'Daycare (ημέρα)', size: 'large', suggested_duration_minutes: 600 },
    { category: 'boarding', group: 'service', name: 'Boarding (1 βράδυ)', size: 'small', suggested_duration_minutes: 1440 },
    { category: 'boarding', group: 'service', name: 'Boarding (1 βράδυ)', size: 'medium', suggested_duration_minutes: 1440 },
    { category: 'boarding', group: 'service', name: 'Boarding (1 βράδυ)', size: 'large', suggested_duration_minutes: 1440 },
    { category: 'boarding', group: 'service', name: 'Luxury suite (1 βράδυ)', suggested_duration_minutes: 1440 },
    { category: 'boarding', group: 'addon', name: 'Επιπλέον σκύλος (συγκάτοικος)', is_addon: true, suggested_duration_minutes: 0 },
    { category: 'boarding', group: 'addon', name: 'Premium γεύμα', is_addon: true, suggested_duration_minutes: 0 },
    { category: 'daycare', group: 'service', name: 'Daycare (ημέρα)', size: 'small', suggested_duration_minutes: 600 },
    { category: 'daycare', group: 'service', name: 'Daycare (ημέρα)', size: 'medium', suggested_duration_minutes: 600 },
    { category: 'daycare', group: 'service', name: 'Daycare (ημέρα)', size: 'large', suggested_duration_minutes: 600 },
    { category: 'daycare', group: 'addon', name: 'Premium γεύμα', is_addon: true, suggested_duration_minutes: 0 },
    // ===== TRAINING =====
    { category: 'training', group: 'service', name: 'Ατομικό μάθημα (60΄)', suggested_duration_minutes: 60 },
    { category: 'training', group: 'service', name: 'Πακέτο 5 ατομικών', suggested_duration_minutes: 60 },
    { category: 'training', group: 'service', name: 'Πακέτο 10 ατομικών', suggested_duration_minutes: 60 },
    { category: 'training', group: 'service', name: 'Ομαδικό μάθημα (60΄)', suggested_duration_minutes: 60 },
    { category: 'training', group: 'service', name: 'Κουτάβι basic course (4 εβδ.)', suggested_duration_minutes: 60 },
    { category: 'training', group: 'service', name: 'Διόρθωση συμπεριφοράς (intensive)', suggested_duration_minutes: 90 },
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var i, t, count;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log("\u03A3\u03B2\u03AE\u03C3\u03B9\u03BC\u03BF \u03C5\u03C0\u03B1\u03C1\u03C7\u03CC\u03BD\u03C4\u03C9\u03BD templates...");
                    return [4 /*yield*/, prisma.catalogTemplate.deleteMany()];
                case 1:
                    _g.sent();
                    console.log("\u0395\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03AE ".concat(TEMPLATES.length, " templates..."));
                    i = 0;
                    _g.label = 2;
                case 2:
                    if (!(i < TEMPLATES.length)) return [3 /*break*/, 5];
                    t = TEMPLATES[i];
                    return [4 /*yield*/, prisma.catalogTemplate.create({
                            data: {
                                category: t.category,
                                group: t.group,
                                name: t.name,
                                description: (_a = t.description) !== null && _a !== void 0 ? _a : null,
                                size: (_b = t.size) !== null && _b !== void 0 ? _b : null,
                                pet_type: (_c = t.pet_type) !== null && _c !== void 0 ? _c : null,
                                breed_group: (_d = t.breed_group) !== null && _d !== void 0 ? _d : null,
                                modality: (_e = t.modality) !== null && _e !== void 0 ? _e : null,
                                suggested_duration_minutes: t.suggested_duration_minutes,
                                is_addon: (_f = t.is_addon) !== null && _f !== void 0 ? _f : false,
                                display_order: i,
                            }
                        })];
                case 3:
                    _g.sent();
                    _g.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, prisma.catalogTemplate.count()];
                case 6:
                    count = _g.sent();
                    console.log("\u2705 Done. ".concat(count, " templates \u03C3\u03C4\u03B7 \u03B2\u03AC\u03C3\u03B7."));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) { console.error(e); process.exit(1); })
    .finally(function () { return prisma.$disconnect(); });
