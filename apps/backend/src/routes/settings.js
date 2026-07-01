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
var prisma_js_1 = require("../lib/prisma.js");
var commission_js_1 = require("../lib/commission.js");
var SETTING_KEY = 'food_subscription_discount_percent';
var settingsRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    var isAdmin, DEFAULT_CONTENT;
    return __generator(this, function (_a) {
        isAdmin = function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                    return [2 /*return*/, reply.code(403).send({ message: 'Forbidden' })];
                }
                return [2 /*return*/];
            });
        }); };
        // GET /settings/food-subscription-discount — public, used by storefront to show current discount
        app.get('/food-subscription-discount', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var setting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.appSetting.findUnique({ where: { key: SETTING_KEY } })];
                    case 1:
                        setting = _a.sent();
                        return [2 /*return*/, reply.send({ data: { discount_percent: setting ? parseFloat(setting.value) : 0 } })];
                }
            });
        }); });
        // PATCH /admin/settings/food-subscription-discount — admin sets the global %
        app.patch('/admin/food-subscription-discount', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var discount_percent, setting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        discount_percent = req.body.discount_percent;
                        if (discount_percent == null || discount_percent < 0 || discount_percent > 100) {
                            return [2 /*return*/, reply.code(400).send({ message: 'discount_percent πρέπει να είναι 0-100' })];
                        }
                        return [4 /*yield*/, prisma_js_1.default.appSetting.upsert({
                                where: { key: SETTING_KEY },
                                update: { value: String(discount_percent) },
                                create: { key: SETTING_KEY, value: String(discount_percent) },
                            })];
                    case 1:
                        setting = _a.sent();
                        return [2 /*return*/, reply.send({ data: { discount_percent: parseFloat(setting.value) } })];
                }
            });
        }); });
        // GET /settings/commission-rates — admin only
        app.get('/commission-rates', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var rates;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, commission_js_1.getCommissionRates)()];
                    case 1:
                        rates = _a.sent();
                        return [2 /*return*/, reply.send({ data: rates })];
                }
            });
        }); });
        // PATCH /settings/commission-rates — admin only, partial update
        app.patch('/commission-rates', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var body, _i, _a, _b, key, val, rates;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        body = req.body;
                        for (_i = 0, _a = Object.entries(body); _i < _a.length; _i++) {
                            _b = _a[_i], key = _b[0], val = _b[1];
                            if (typeof val !== 'number' || val < 0 || val > 100) {
                                return [2 /*return*/, reply.code(400).send({ message: "\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C4\u03B9\u03BC\u03AE \u03B3\u03B9\u03B1 ".concat(key, ": \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 0-100") })];
                            }
                        }
                        return [4 /*yield*/, (0, commission_js_1.setCommissionRates)(body)];
                    case 1:
                        rates = _c.sent();
                        return [2 /*return*/, reply.send({ data: rates })];
                }
            });
        }); });
        DEFAULT_CONTENT = {
            home: {
                hero_title_1: 'Η καλύτερη φροντίδα για τους',
                hero_title_2: 'καλύτερους φίλους σου',
                hero_subtitle: 'Το all-in-one pet super-app για κατοικίδια και ιδιοκτήτες',
                hero_cta: 'Ξεκινήστε Τώρα',
                stat_users: '50K+',
                stat_users_label: 'Χρήστες',
                stat_providers: '2K+',
                stat_providers_label: 'Πάροχοι',
                stat_pets: '120K+',
                stat_pets_label: 'Κατοικίδια',
                stat_rating: '4.9★',
                stat_rating_label: 'Βαθμολογία',
                marquee_text: 'Η καλύτερη εφαρμογή κατοικιδίων στον κόσμο',
                services_title: 'Υπηρεσίες',
                services_subtitle: 'Βρες τον καλύτερο πάροχο κοντά σου',
            },
            general: {
                site_name: 'GlobiPet',
                tagline: '#1 Pet Super-App',
                footer_slogan: 'Best care for the best human\'s friends',
                contact_email: 'info@globipet.com',
            },
            legal: {
                page_title: 'Νομική Υποστήριξη Κατοικιδίων',
                page_subtitle: 'AI νομικός σύμβουλος + σύνδεση με εξειδικευμένους δικηγόρους',
            },
            telehealth: {
                page_title: 'Τηλεϊατρική',
                page_subtitle: 'Βιντεοκλήση με εξειδικευμένο κτηνίατρο — πληρωμή πριν τη συνεδρία',
            },
        };
        // GET /settings/content/:section — public
        app.get('/content/:section', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var section, setting, defaults, stored;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        section = req.params.section;
                        return [4 /*yield*/, prisma_js_1.default.appSetting.findUnique({ where: { key: "content_".concat(section) } })];
                    case 1:
                        setting = _a.sent();
                        defaults = DEFAULT_CONTENT[section] || {};
                        if (!setting)
                            return [2 /*return*/, reply.send({ data: defaults })];
                        try {
                            stored = JSON.parse(setting.value);
                            return [2 /*return*/, reply.send({ data: __assign(__assign({}, defaults), stored) })];
                        }
                        catch (_b) {
                            return [2 /*return*/, reply.send({ data: defaults })];
                        }
                        return [2 /*return*/];
                }
            });
        }); });
        // GET /settings/content — admin: all sections
        app.get('/content', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var settings, result, _i, settings_1, s, section;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.appSetting.findMany({ where: { key: { startsWith: 'content_' } } })];
                    case 1:
                        settings = _a.sent();
                        result = __assign({}, DEFAULT_CONTENT);
                        for (_i = 0, settings_1 = settings; _i < settings_1.length; _i++) {
                            s = settings_1[_i];
                            section = s.key.replace('content_', '');
                            try {
                                result[section] = __assign(__assign({}, (DEFAULT_CONTENT[section] || {})), JSON.parse(s.value));
                            }
                            catch (_b) { }
                        }
                        return [2 /*return*/, reply.send({ data: result })];
                }
            });
        }); });
        // PATCH /settings/content/:section — admin only
        app.patch('/content/:section', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var section, body, existing, current, merged;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        section = req.params.section;
                        body = req.body;
                        return [4 /*yield*/, prisma_js_1.default.appSetting.findUnique({ where: { key: "content_".concat(section) } })];
                    case 1:
                        existing = _a.sent();
                        current = {};
                        if (existing) {
                            try {
                                current = JSON.parse(existing.value);
                            }
                            catch (_b) { }
                        }
                        merged = __assign(__assign({}, current), body);
                        return [4 /*yield*/, prisma_js_1.default.appSetting.upsert({
                                where: { key: "content_".concat(section) },
                                update: { value: JSON.stringify(merged) },
                                create: { key: "content_".concat(section), value: JSON.stringify(merged) },
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.send({ data: merged })];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = settingsRoutes;
