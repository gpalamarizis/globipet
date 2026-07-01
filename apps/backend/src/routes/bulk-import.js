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
var prisma_js_1 = require("../lib/prisma.js");
var bulkImportRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Admin only
        app.addHook('preHandler', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, app.authenticate(req, reply)];
                    case 1:
                        _c.sent();
                        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                            return [2 /*return*/, reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _c.sent();
                        return [2 /*return*/, reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // POST /admin/bulk-import/products
        app.post('/products', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var items, results, i, row, name_translations, description_translations, _i, _a, lang, data, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        items = req.body.items;
                        if (!Array.isArray(items) || items.length === 0) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Δεν δόθηκαν προϊόντα' })];
                        }
                        results = { created: 0, failed: 0, errors: [] };
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < items.length)) return [3 /*break*/, 6];
                        row = items[i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        // Required field validation
                        if (!row.name || !row.price || !row.category) {
                            throw new Error('Λείπουν υποχρεωτικά πεδία (name, price, category)');
                        }
                        name_translations = {};
                        description_translations = {};
                        for (_i = 0, _a = ['en', 'es', 'fr', 'zh']; _i < _a.length; _i++) {
                            lang = _a[_i];
                            if (row["name_".concat(lang)])
                                name_translations[lang] = String(row["name_".concat(lang)]);
                            if (row["description_".concat(lang)])
                                description_translations[lang] = String(row["description_".concat(lang)]);
                        }
                        data = {
                            name: String(row.name),
                            description: String(row.description || ''),
                            price: parseFloat(row.price),
                            category: String(row.category),
                            brand: row.brand ? String(row.brand) : null,
                            stock: row.stock ? parseInt(row.stock) : 0,
                            image_url: row.image_url ? String(row.image_url) : null,
                            target_species: row.target_species
                                ? String(row.target_species).split(',').map(function (s) { return s.trim(); }).filter(Boolean)
                                : [],
                            is_featured: row.is_featured === true || row.is_featured === 'true' || row.is_featured === 1,
                        };
                        if (Object.keys(name_translations).length > 0)
                            data.name_translations = name_translations;
                        if (Object.keys(description_translations).length > 0)
                            data.description_translations = description_translations;
                        if (row.discount_percentage)
                            data.discount_percentage = parseInt(row.discount_percentage);
                        if (row.sale_price)
                            data.sale_price = parseFloat(row.sale_price);
                        return [4 /*yield*/, prisma_js_1.default.product.create({ data: data })];
                    case 3:
                        _b.sent();
                        results.created++;
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _b.sent();
                        results.failed++;
                        results.errors.push({ row: i + 1, name: row.name || "\u0393\u03C1\u03B1\u03BC\u03BC\u03AE ".concat(i + 1), error: err_1.message });
                        return [3 /*break*/, 5];
                    case 5:
                        i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, results];
                }
            });
        }); });
        // POST /admin/bulk-import/services
        app.post('/services', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var items, results, i, row, provider_name_translations, description_translations, _i, _a, lang, data, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        items = req.body.items;
                        if (!Array.isArray(items) || items.length === 0) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Δεν δόθηκαν υπηρεσίες' })];
                        }
                        results = { created: 0, failed: 0, errors: [] };
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < items.length)) return [3 /*break*/, 6];
                        row = items[i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        if (!row.provider_name || !row.provider_email || !row.service_type || !row.city) {
                            throw new Error('Λείπουν υποχρεωτικά πεδία (provider_name, provider_email, service_type, city)');
                        }
                        provider_name_translations = {};
                        description_translations = {};
                        for (_i = 0, _a = ['en', 'es', 'fr', 'zh']; _i < _a.length; _i++) {
                            lang = _a[_i];
                            if (row["provider_name_".concat(lang)])
                                provider_name_translations[lang] = String(row["provider_name_".concat(lang)]);
                            if (row["description_".concat(lang)])
                                description_translations[lang] = String(row["description_".concat(lang)]);
                        }
                        data = {
                            provider_name: String(row.provider_name),
                            provider_email: String(row.provider_email),
                            service_type: String(row.service_type),
                            description: String(row.description || ''),
                            price: parseFloat(row.price) || 0,
                            city: String(row.city),
                            location: row.location ? String(row.location) : null,
                            contact_phone: row.contact_phone ? String(row.contact_phone) : null,
                            contact_email: row.contact_email ? String(row.contact_email) : null,
                            image_url: row.image_url ? String(row.image_url) : null,
                            years_experience: row.years_experience ? parseInt(row.years_experience) : null,
                            home_visits: row.home_visits === true || row.home_visits === 'true' || row.home_visits === 1,
                            emergency_available: row.emergency_available === true || row.emergency_available === 'true' || row.emergency_available === 1,
                            is_verified: row.is_verified === true || row.is_verified === 'true' || row.is_verified === 1,
                            specializations: row.specializations
                                ? String(row.specializations).split(',').map(function (s) { return s.trim(); }).filter(Boolean)
                                : [],
                            pet_types: row.pet_types
                                ? String(row.pet_types).split(',').map(function (s) { return s.trim(); }).filter(Boolean)
                                : [],
                            languages: row.languages
                                ? String(row.languages).split(',').map(function (s) { return s.trim(); }).filter(Boolean)
                                : [],
                            available_days: row.available_days
                                ? String(row.available_days).split(',').map(function (s) { return parseInt(s.trim()); }).filter(function (n) { return !isNaN(n); })
                                : [1, 2, 3, 4, 5],
                        };
                        if (Object.keys(provider_name_translations).length > 0)
                            data.provider_name_translations = provider_name_translations;
                        if (Object.keys(description_translations).length > 0)
                            data.description_translations = description_translations;
                        if (row.latitude)
                            data.latitude = parseFloat(row.latitude);
                        if (row.longitude)
                            data.longitude = parseFloat(row.longitude);
                        return [4 /*yield*/, prisma_js_1.default.service.create({ data: data })];
                    case 3:
                        _b.sent();
                        results.created++;
                        return [3 /*break*/, 5];
                    case 4:
                        err_2 = _b.sent();
                        results.failed++;
                        results.errors.push({ row: i + 1, name: row.provider_name || "\u0393\u03C1\u03B1\u03BC\u03BC\u03AE ".concat(i + 1), error: err_2.message });
                        return [3 /*break*/, 5];
                    case 5:
                        i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, results];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = bulkImportRoutes;
