"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var pass, usersData, users, _i, usersData_1, u, _a, _b, pets, groomingService, vetService, booking1, booking2, community;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('Seeding demo data across all categories...');
                    return [4 /*yield*/, bcryptjs_1.default.hash('Demo12345!', 10)
                        // ---- Users (customers + providers) ----
                    ];
                case 1:
                    pass = _c.sent();
                    usersData = [
                        { full_name: 'Μαρία Παπαδοπούλου', email: 'maria.demo@globipet.com', role: 'user', city: 'Αθήνα' },
                        { full_name: 'Γιώργος Νικολάου', email: 'giorgos.demo@globipet.com', role: 'user', city: 'Θεσσαλονίκη' },
                        { full_name: 'Σοφία Δημητρίου', email: 'sofia.demo@globipet.com', role: 'user', city: 'Πάτρα' },
                        { full_name: 'Ελένη Κωνσταντίνου', email: 'eleni.groomer@globipet.com', role: 'service_provider', city: 'Αθήνα' },
                        { full_name: 'Δρ. Ανδρέας Σταύρου', email: 'andreas.vet@globipet.com', role: 'service_provider', city: 'Αθήνα' },
                    ];
                    users = {};
                    _i = 0, usersData_1 = usersData;
                    _c.label = 2;
                case 2:
                    if (!(_i < usersData_1.length)) return [3 /*break*/, 5];
                    u = usersData_1[_i];
                    _a = users;
                    _b = u.email;
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: u.email },
                            update: {},
                            create: __assign(__assign({}, u), { password_hash: pass, is_verified: true, preferred_language: 'el' }),
                        })];
                case 3:
                    _a[_b] = _c.sent();
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, Promise.all([
                        prisma.pet.create({ data: { owner_email: 'maria.demo@globipet.com', name: 'Rex', species: 'dog', breed: 'Labrador', age: 3, weight: 28, gender: 'male', vaccination_status: 'up_to_date' } }),
                        prisma.pet.create({ data: { owner_email: 'giorgos.demo@globipet.com', name: 'Luna', species: 'cat', breed: 'Persian', age: 2, weight: 4.2, gender: 'female', vaccination_status: 'up_to_date' } }),
                        prisma.pet.create({ data: { owner_email: 'sofia.demo@globipet.com', name: 'Max', species: 'dog', breed: 'Golden Retriever', age: 5, weight: 32, gender: 'male', vaccination_status: 'up_to_date' } }),
                    ])
                    // ---- Services ----
                ];
                case 6:
                    pets = _c.sent();
                    return [4 /*yield*/, prisma.service.create({
                            data: {
                                provider_email: 'eleni.groomer@globipet.com', provider_name: 'Ελένη Κωνσταντίνου',
                                service_type: 'grooming', description: 'Πλήρες grooming για σκύλους και γάτες όλων των μεγεθών.',
                                price: 25, city: 'Αθήνα', contact_phone: '6900000001', available_days: [1, 2, 3, 4, 5],
                                rating: 4.8, reviews_count: 2, is_active: true, is_verified: true,
                            }
                        })];
                case 7:
                    groomingService = _c.sent();
                    return [4 /*yield*/, prisma.service.create({
                            data: {
                                provider_email: 'andreas.vet@globipet.com', provider_name: 'Δρ. Ανδρέας Σταύρου',
                                service_type: 'veterinary', description: 'Γενική κτηνιατρική εξέταση και εμβολιασμοί.',
                                price: 40, city: 'Αθήνα', contact_phone: '6900000002', available_days: [1, 2, 3, 4, 5],
                                rating: 4.9, reviews_count: 1, is_active: true, is_verified: true,
                            }
                        })
                        // ---- Bookings ----
                    ];
                case 8:
                    vetService = _c.sent();
                    return [4 /*yield*/, prisma.booking.create({
                            data: {
                                service_id: groomingService.id, provider_email: 'eleni.groomer@globipet.com', provider_name: 'Ελένη Κωνσταντίνου',
                                customer_email: 'maria.demo@globipet.com', customer_name: 'Μαρία Παπαδοπούλου',
                                pet_id: pets[0].id, pet_name: 'Rex', booking_date: '2026-06-20', booking_time: '11:00',
                                duration: 60, total_price: 25, status: 'completed', rating: 5, review: 'Εξαιρετική δουλειά!',
                            }
                        })];
                case 9:
                    booking1 = _c.sent();
                    return [4 /*yield*/, prisma.booking.create({
                            data: {
                                service_id: vetService.id, provider_email: 'andreas.vet@globipet.com', provider_name: 'Δρ. Ανδρέας Σταύρου',
                                customer_email: 'giorgos.demo@globipet.com', customer_name: 'Γιώργος Νικολάου',
                                pet_id: pets[1].id, pet_name: 'Luna', booking_date: '2026-06-22', booking_time: '17:30',
                                duration: 30, total_price: 40, status: 'confirmed',
                            }
                        })];
                case 10:
                    booking2 = _c.sent();
                    return [4 /*yield*/, prisma.booking.create({
                            data: {
                                service_id: groomingService.id, provider_email: 'eleni.groomer@globipet.com', provider_name: 'Ελένη Κωνσταντίνου',
                                customer_email: 'sofia.demo@globipet.com', customer_name: 'Σοφία Δημητρίου',
                                pet_id: pets[2].id, pet_name: 'Max', booking_date: '2026-06-25', booking_time: '10:00',
                                duration: 60, total_price: 25, status: 'pending',
                            }
                        })
                        // ---- Reviews ----
                    ];
                case 11:
                    _c.sent();
                    // ---- Reviews ----
                    return [4 /*yield*/, prisma.review.createMany({
                            data: [
                                { service_id: groomingService.id, provider_email: 'eleni.groomer@globipet.com', customer_email: 'maria.demo@globipet.com', customer_name: 'Μαρία Παπαδοπούλου', rating: 5, comment: 'Πολύ προσεκτική με τον Rex, σίγουρα θα ξανάρθω!', booking_id: booking1.id },
                                { service_id: vetService.id, provider_email: 'andreas.vet@globipet.com', customer_email: 'giorgos.demo@globipet.com', customer_name: 'Γιώργος Νικολάου', rating: 5, comment: 'Πολύ επαγγελματίας, εξήγησε όλα καθαρά.', booking_id: booking2.id },
                            ]
                        })
                        // ---- Events ----
                    ];
                case 12:
                    // ---- Reviews ----
                    _c.sent();
                    // ---- Events ----
                    return [4 /*yield*/, prisma.event.createMany({
                            data: [
                                { title: 'Pet Expo Athens 2026', description: 'Η μεγαλύτερη εκθεσιακή εκδήλωση για κατοικίδια στην Ελλάδα.', event_type: 'expo', date: '2026-07-12', time: '10:00', location: 'Στάδιο Ειρήνης & Φιλίας', city: 'Αθήνα', country: 'Ελλάδα', capacity: 500, registered_count: 87, price: 5, organizer: 'GlobiPet', organizer_email: 'events@globipet.com' },
                                { title: 'Πρωινή βόλτα σκύλων - Πάρκο Γουδή', description: 'Συνάντηση ιδιοκτητών σκύλων για κοινή βόλτα και κοινωνικοποίηση.', event_type: 'meetup', date: '2026-06-21', time: '09:00', location: 'Πάρκο Γουδή', city: 'Αθήνα', country: 'Ελλάδα', capacity: 30, registered_count: 14, price: 0, organizer: 'GlobiPet Community', organizer_email: 'community@globipet.com' },
                            ]
                        })
                        // ---- Forum topics ----
                    ];
                case 13:
                    // ---- Events ----
                    _c.sent();
                    // ---- Forum topics ----
                    return [4 /*yield*/, prisma.forumTopic.createMany({
                            data: [
                                { author_email: 'maria.demo@globipet.com', author_name: 'Μαρία Παπαδοπούλου', title: 'Καλύτερη τροφή για ηλικιωμένο σκύλο;', content: 'Ο Rex μου είναι 9 χρονών, τι τροφή προτείνετε;', category: 'nutrition', tags: ['τροφή', 'senior'], views_count: 124, replies_count: 6 },
                                { author_email: 'sofia.demo@globipet.com', author_name: 'Σοφία Δημητρίου', title: 'Συμβουλές για πρώτο κατοικίδιο', content: 'Σκέφτομαι να υιοθετήσω το πρώτο μου κουτάβι, οδηγίες;', category: 'general', tags: ['νέος ιδιοκτήτης'], views_count: 256, replies_count: 11, is_pinned: true },
                            ]
                        })
                        // ---- Social posts ----
                    ];
                case 14:
                    // ---- Forum topics ----
                    _c.sent();
                    // ---- Social posts ----
                    return [4 /*yield*/, prisma.post.createMany({
                            data: [
                                { author_email: 'maria.demo@globipet.com', author_name: 'Μαρία Παπαδοπούλου', content: 'Ο Rex μετά το grooming σήμερα! 🐾✨', likes_count: 34, comments_count: 5, tags: ['grooming'], pet_id: pets[0].id, pet_name: 'Rex' },
                                { author_email: 'giorgos.demo@globipet.com', author_name: 'Γιώργος Νικολάου', content: 'Η Luna απολαμβάνει το ηλιόλουστο απόγευμα ☀️🐱', likes_count: 52, comments_count: 8, pet_id: pets[1].id, pet_name: 'Luna' },
                            ]
                        })
                        // ---- Community + members ----
                    ];
                case 15:
                    // ---- Social posts ----
                    _c.sent();
                    return [4 /*yield*/, prisma.community.create({
                            data: { creator_email: 'maria.demo@globipet.com', creator_name: 'Μαρία Παπαδοπούλου', name: 'Φιλόζωοι Αθήνας', description: 'Κοινότητα για ιδιοκτήτες κατοικίδιων στην Αθήνα.', city: 'Αθήνα', latitude: 37.9838, longitude: 23.7275, member_count: 3 }
                        })];
                case 16:
                    community = _c.sent();
                    return [4 /*yield*/, prisma.communityMember.createMany({
                            data: [
                                { community_id: community.id, user_email: 'maria.demo@globipet.com', user_name: 'Μαρία Παπαδοπούλου', role: 'admin' },
                                { community_id: community.id, user_email: 'giorgos.demo@globipet.com', user_name: 'Γιώργος Νικολάου', role: 'member' },
                                { community_id: community.id, user_email: 'sofia.demo@globipet.com', user_name: 'Σοφία Δημητρίου', role: 'member' },
                            ]
                        })
                        // ---- Playdate event ----
                    ];
                case 17:
                    _c.sent();
                    // ---- Playdate event ----
                    return [4 /*yield*/, prisma.playdateEvent.create({
                            data: {
                                creator_email: 'sofia.demo@globipet.com', creator_name: 'Σοφία Δημητρίου',
                                title: 'Playdate για Golden Retrievers', description: 'Συνάντηση για σκύλους μεγάλου μεγέθους.',
                                event_type: 'play', date: '2026-06-23', time: '18:00', location: 'Πάρκο Γουδή', city: 'Αθήνα',
                                max_participants: 8, pet_types: ['dog'],
                            }
                        })];
                case 18:
                    // ---- Playdate event ----
                    _c.sent();
                    console.log('✅ Demo data seeded: 5 users, 3 pets, 2 services, 3 bookings, 2 reviews, 2 events, 2 forum topics, 2 posts, 1 community (3 members), 1 playdate');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(console.error)
    .finally(function () { return prisma.$disconnect(); });
