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
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Seeding sample pet food products...');
                    return [4 /*yield*/, prisma.product.createMany({
                            data: [
                                {
                                    name: 'Royal Canin Adult Large Breed 15kg',
                                    description: 'Ξηρή τροφή για ενήλικους σκύλους μεγαλόσωμων ράτσων (26-44kg). Ισορροπημένη διατροφή για υγιή άρθρωση και πέψη.',
                                    price: 64.90,
                                    category: 'food',
                                    brand: 'Royal Canin',
                                    stock: 40,
                                    rating: 4.7,
                                    reviews_count: 132,
                                    target_species: ['dog'],
                                    is_featured: true,
                                    is_subscribable: true,
                                },
                                {
                                    name: 'Royal Canin Kitten 4kg',
                                    description: 'Ξηρή τροφή για γατάκια έως 12 μηνών. Στηρίζει το ανοσοποιητικό και την υγιή ανάπτυξη.',
                                    price: 29.90,
                                    category: 'food',
                                    brand: 'Royal Canin',
                                    stock: 55,
                                    rating: 4.8,
                                    reviews_count: 98,
                                    target_species: ['cat'],
                                    is_featured: false,
                                    is_subscribable: true,
                                },
                                {
                                    name: 'Royal Canin Renal Diet 2kg',
                                    description: 'Διαιτητική τροφή για σκύλους και γάτες με χρόνια νεφρική ανεπάρκεια. Μόνο κατόπιν οδηγίας κτηνιάτρου.',
                                    price: 34.90,
                                    category: 'food',
                                    brand: 'Royal Canin',
                                    stock: 20,
                                    rating: 4.6,
                                    reviews_count: 41,
                                    target_species: ['dog', 'cat'],
                                    is_featured: false,
                                    is_subscribable: true,
                                },
                                {
                                    name: 'Acana Wild Prairie 11.4kg',
                                    description: 'Grain-free ξηρή τροφή με κοτόπουλο ελευθέρας βοσκής και ψάρι. Υψηλή περιεκτικότητα σε πρωτεΐνη για ενήλικους σκύλους όλων των μεγεθών.',
                                    price: 79.90,
                                    category: 'food',
                                    brand: 'Acana',
                                    stock: 30,
                                    rating: 4.9,
                                    reviews_count: 76,
                                    target_species: ['dog'],
                                    is_featured: true,
                                    is_subscribable: true,
                                },
                                {
                                    name: 'Acana Adult Small Breed 6kg',
                                    description: 'Grain-free τροφή ειδικά σχεδιασμένη για μικρόσωμες ράτσες σκύλων, με βιολογικά κατάλληλες πρώτες ύλες.',
                                    price: 49.90,
                                    category: 'food',
                                    brand: 'Acana',
                                    stock: 35,
                                    rating: 4.8,
                                    reviews_count: 53,
                                    target_species: ['dog'],
                                    is_featured: false,
                                    is_subscribable: true,
                                },
                            ]
                        })];
                case 1:
                    _a.sent();
                    console.log('✅ Seeded 5 products (3 Royal Canin, 2 Acana) — all marked as is_subscribable');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(console.error)
    .finally(function () { return prisma.$disconnect(); });
