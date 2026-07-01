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
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var interamerican, allianz, generali;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Seeding insurance providers and plans...');
                    // Clear existing
                    return [4 /*yield*/, prisma.insurancePlan.deleteMany()];
                case 1:
                    // Clear existing
                    _a.sent();
                    return [4 /*yield*/, prisma.insuranceProvider.deleteMany()
                        // Interamerican
                    ];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma.insuranceProvider.create({
                            data: {
                                name: 'Interamerican',
                                name_el: 'Interamerican',
                                website: 'https://www.interamerican.gr',
                                phone: '210 9480000',
                                email: 'info@interamerican.gr',
                                description: 'Κορυφαία ασφαλιστική εταιρεία στην Ελλάδα με εξειδικευμένα προϊόντα για κατοικίδια.',
                                is_active: true,
                                display_order: 1,
                            }
                        })];
                case 3:
                    interamerican = _a.sent();
                    return [4 /*yield*/, prisma.insurancePlan.createMany({
                            data: [
                                {
                                    provider_id: interamerican.id,
                                    name: 'Pet Basic',
                                    name_el: 'Βασική Κάλυψη',
                                    description: 'Βασική ασφάλιση για ατυχήματα και επείγοντα περιστατικά.',
                                    tier: 'basic',
                                    price_monthly: 12.90,
                                    price_annual: 139.90,
                                    covers_accidents: true,
                                    covers_illness: false,
                                    covers_surgery: false,
                                    covers_dental: false,
                                    covers_preventive: false,
                                    covers_liability: true,
                                    covers_death: false,
                                    annual_limit: 1500,
                                    deductible: 50,
                                    reimbursement_percent: 70,
                                    waiting_period_days: 14,
                                    pet_types: ['dog', 'cat'],
                                    max_age_years: 10,
                                    min_age_months: 3,
                                    is_active: true,
                                    is_featured: false,
                                    display_order: 1,
                                },
                                {
                                    provider_id: interamerican.id,
                                    name: 'Pet Standard',
                                    name_el: 'Standard Κάλυψη',
                                    description: 'Ολοκληρωμένη ασφάλιση για ασθένειες και ατυχήματα.',
                                    tier: 'standard',
                                    price_monthly: 24.90,
                                    price_annual: 269.90,
                                    covers_accidents: true,
                                    covers_illness: true,
                                    covers_surgery: false,
                                    covers_dental: false,
                                    covers_preventive: true,
                                    covers_liability: true,
                                    covers_death: false,
                                    annual_limit: 3000,
                                    deductible: 30,
                                    reimbursement_percent: 80,
                                    waiting_period_days: 14,
                                    pet_types: ['dog', 'cat'],
                                    max_age_years: 10,
                                    min_age_months: 3,
                                    is_active: true,
                                    is_featured: true,
                                    display_order: 2,
                                },
                                {
                                    provider_id: interamerican.id,
                                    name: 'Pet Premium',
                                    name_el: 'Premium Κάλυψη',
                                    description: 'Πλήρης κάλυψη συμπεριλαμβανομένου χειρουργείου και οδοντιατρείου.',
                                    tier: 'premium',
                                    price_monthly: 44.90,
                                    price_annual: 489.90,
                                    covers_accidents: true,
                                    covers_illness: true,
                                    covers_surgery: true,
                                    covers_dental: true,
                                    covers_preventive: true,
                                    covers_liability: true,
                                    covers_death: true,
                                    annual_limit: 6000,
                                    deductible: 20,
                                    reimbursement_percent: 90,
                                    waiting_period_days: 7,
                                    pet_types: ['dog', 'cat', 'rabbit'],
                                    max_age_years: 12,
                                    min_age_months: 2,
                                    features: ['24/7 Τηλεφωνική υποστήριξη', 'Δωρεάν 2η ιατρική γνώμη', 'Κάλυψη εξωτερικού'],
                                    is_active: true,
                                    is_featured: false,
                                    display_order: 3,
                                }
                            ]
                        })
                        // Allianz
                    ];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.insuranceProvider.create({
                            data: {
                                name: 'Allianz',
                                name_el: 'Allianz Ελλάδος',
                                website: 'https://www.allianz.gr',
                                phone: '210 6930000',
                                description: 'Παγκόσμιος ηγέτης στον ασφαλιστικό κλάδο με εξειδικευμένα πλάνα για κατοικίδια.',
                                is_active: true,
                                display_order: 2,
                            }
                        })];
                case 5:
                    allianz = _a.sent();
                    return [4 /*yield*/, prisma.insurancePlan.createMany({
                            data: [
                                {
                                    provider_id: allianz.id,
                                    name: 'PetCare Basic',
                                    name_el: 'PetCare Βασικό',
                                    tier: 'basic',
                                    price_monthly: 9.90,
                                    price_annual: 109.90,
                                    covers_accidents: true,
                                    covers_illness: false,
                                    covers_surgery: false,
                                    covers_dental: false,
                                    covers_preventive: false,
                                    covers_liability: false,
                                    covers_death: false,
                                    annual_limit: 1000,
                                    deductible: 75,
                                    reimbursement_percent: 70,
                                    waiting_period_days: 21,
                                    pet_types: ['dog', 'cat'],
                                    max_age_years: 8,
                                    min_age_months: 3,
                                    is_active: true,
                                    is_featured: false,
                                    display_order: 1,
                                },
                                {
                                    provider_id: allianz.id,
                                    name: 'PetCare Comprehensive',
                                    name_el: 'PetCare Ολοκληρωμένο',
                                    tier: 'comprehensive',
                                    price_monthly: 54.90,
                                    price_annual: 599.90,
                                    covers_accidents: true,
                                    covers_illness: true,
                                    covers_surgery: true,
                                    covers_dental: true,
                                    covers_preventive: true,
                                    covers_liability: true,
                                    covers_death: true,
                                    annual_limit: 10000,
                                    deductible: 0,
                                    reimbursement_percent: 100,
                                    waiting_period_days: 0,
                                    pet_types: ['dog', 'cat', 'rabbit', 'bird'],
                                    max_age_years: 15,
                                    min_age_months: 2,
                                    features: ['Μηδενική απαλλαγή', '100% αποζημίωση', 'Κάλυψη από 1η ημέρα', 'Φυσιοθεραπεία'],
                                    is_active: true,
                                    is_featured: true,
                                    display_order: 2,
                                }
                            ]
                        })
                        // Generali
                    ];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, prisma.insuranceProvider.create({
                            data: {
                                name: 'Generali',
                                name_el: 'Generali Ελλάδος',
                                website: 'https://www.generali.gr',
                                phone: '210 8099000',
                                description: 'Ευρωπαϊκή ασφαλιστική με ειδικά πλάνα για κατοικίδια όλων των ειδών.',
                                is_active: true,
                                display_order: 3,
                            }
                        })];
                case 7:
                    generali = _a.sent();
                    return [4 /*yield*/, prisma.insurancePlan.createMany({
                            data: [
                                {
                                    provider_id: generali.id,
                                    name: 'MyPet Standard',
                                    name_el: 'MyPet Standard',
                                    tier: 'standard',
                                    price_monthly: 19.90,
                                    price_annual: 219.90,
                                    covers_accidents: true,
                                    covers_illness: true,
                                    covers_surgery: false,
                                    covers_dental: false,
                                    covers_preventive: true,
                                    covers_liability: false,
                                    covers_death: false,
                                    annual_limit: 2500,
                                    deductible: 40,
                                    reimbursement_percent: 80,
                                    waiting_period_days: 14,
                                    pet_types: ['dog', 'cat'],
                                    max_age_years: 10,
                                    is_active: true,
                                    is_featured: false,
                                    display_order: 1,
                                },
                                {
                                    provider_id: generali.id,
                                    name: 'MyPet Premium',
                                    name_el: 'MyPet Premium',
                                    tier: 'premium',
                                    price_monthly: 38.90,
                                    price_annual: 419.90,
                                    covers_accidents: true,
                                    covers_illness: true,
                                    covers_surgery: true,
                                    covers_dental: false,
                                    covers_preventive: true,
                                    covers_liability: true,
                                    covers_death: true,
                                    annual_limit: 5000,
                                    deductible: 25,
                                    reimbursement_percent: 85,
                                    waiting_period_days: 10,
                                    pet_types: ['dog', 'cat', 'rabbit'],
                                    max_age_years: 12,
                                    features: ['Εκτός συνόρων κάλυψη', 'Απώλεια/κλοπή', 'Ψυχολογική υποστήριξη ιδιοκτήτη'],
                                    is_active: true,
                                    is_featured: true,
                                    display_order: 2,
                                }
                            ]
                        })];
                case 8:
                    _a.sent();
                    console.log('✅ Insurance seed completed!');
                    console.log("   - 3 providers");
                    console.log("   - 7 plans");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(console.error)
    .finally(function () { return prisma.$disconnect(); });
