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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_js_1 = require("../lib/prisma.js");
var adminSubscriptionsRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
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
        // GET /admin/subscriptions/ai
        app.get('/ai', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var users;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.user.findMany({
                            where: { ai_subscription_status: { not: 'none' } },
                            select: { id: true, full_name: true, email: true, ai_subscription_status: true, ai_trial_started_at: true, ai_subscription_plan_id: true },
                            orderBy: { ai_trial_started_at: 'desc' },
                        })];
                    case 1:
                        users = _a.sent();
                        return [2 /*return*/, reply.send({ data: users })];
                }
            });
        }); });
        // GET /admin/subscriptions/food
        app.get('/food', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var subs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.productSubscription.findMany({
                            include: {
                                user: { select: { id: true, full_name: true, email: true } },
                                product: { select: { id: true, name: true, image_url: true } },
                            },
                            orderBy: { created_at: 'desc' },
                        })];
                    case 1:
                        subs = _a.sent();
                        return [2 /*return*/, reply.send({ data: subs })];
                }
            });
        }); });
        // PATCH /admin/subscriptions/food/:id — admin can pause/cancel/reactivate
        app.patch('/food/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var status, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        status = req.body.status;
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.update({
                                where: { id: req.params.id },
                                data: { status: status },
                            })];
                    case 1:
                        updated = _a.sent();
                        return [2 /*return*/, reply.send({ data: updated })];
                }
            });
        }); });
        // GET /admin/subscriptions/insurance
        app.get('/insurance', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var subs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.userInsuranceSubscription.findMany({
                            include: {
                                user: { select: { id: true, full_name: true, email: true } },
                                plan: { select: { id: true, name: true, name_el: true, tier: true, price_monthly: true, provider: { select: { name: true } } } },
                            },
                            orderBy: { created_at: 'desc' },
                        })];
                    case 1:
                        subs = _a.sent();
                        return [2 /*return*/, reply.send({ data: subs })];
                }
            });
        }); });
        // POST /admin/subscriptions/insurance — admin manually registers a user's insurance plan
        app.post('/insurance', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, user_id, plan_id, pet_id, sub;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, user_id = _a.user_id, plan_id = _a.plan_id, pet_id = _a.pet_id;
                        if (!user_id || !plan_id)
                            return [2 /*return*/, reply.code(400).send({ message: 'user_id και plan_id απαιτούνται' })];
                        return [4 /*yield*/, prisma_js_1.default.userInsuranceSubscription.create({
                                data: { user_id: user_id, plan_id: plan_id, pet_id: pet_id, status: 'active' },
                            })];
                    case 1:
                        sub = _b.sent();
                        return [2 /*return*/, reply.code(201).send({ data: sub })];
                }
            });
        }); });
        // PATCH /admin/subscriptions/insurance/:id
        app.patch('/insurance/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var status, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        status = req.body.status;
                        return [4 /*yield*/, prisma_js_1.default.userInsuranceSubscription.update({
                                where: { id: req.params.id },
                                data: { status: status },
                            })];
                    case 1:
                        updated = _a.sent();
                        return [2 /*return*/, reply.send({ data: updated })];
                }
            });
        }); });
        // GET /admin/subscriptions/overview — unified table across all subscription types
        app.get('/overview', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, aiUsers, foodSubs, insuranceSubs, rows;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            prisma_js_1.default.user.findMany({
                                where: { ai_subscription_status: { not: 'none' } },
                                select: { id: true, full_name: true, email: true, ai_subscription_status: true, ai_trial_started_at: true },
                            }),
                            prisma_js_1.default.productSubscription.findMany({
                                include: { user: { select: { full_name: true, email: true } }, product: { select: { name: true } } },
                            }),
                            prisma_js_1.default.userInsuranceSubscription.findMany({
                                include: { user: { select: { full_name: true, email: true } }, plan: { select: { name_el: true, name: true } } },
                            }),
                        ])];
                    case 1:
                        _a = _b.sent(), aiUsers = _a[0], foodSubs = _a[1], insuranceSubs = _a[2];
                        rows = __spreadArray(__spreadArray(__spreadArray([], aiUsers.map(function (u) { return ({
                            type: 'ai',
                            user_name: u.full_name,
                            user_email: u.email,
                            plan_name: 'AI Health',
                            status: u.ai_subscription_status,
                            started_at: u.ai_trial_started_at,
                        }); }), true), foodSubs.map(function (s) { return ({
                            type: 'food',
                            user_name: s.user.full_name,
                            user_email: s.user.email,
                            plan_name: "\u03A4\u03C1\u03BF\u03C6\u03AE: ".concat(s.product.name),
                            status: s.status,
                            started_at: s.start_date,
                            price: s.monthly_price,
                        }); }), true), insuranceSubs.map(function (s) { return ({
                            type: 'insurance',
                            user_name: s.user.full_name,
                            user_email: s.user.email,
                            plan_name: s.plan.name_el || s.plan.name,
                            status: s.status,
                            started_at: s.started_at,
                        }); }), true).sort(function (a, b) { return new Date(b.started_at).getTime() - new Date(a.started_at).getTime(); });
                        return [2 /*return*/, reply.send({ data: rows })];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = adminSubscriptionsRoutes;
