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
var stripe_1 = require("stripe");
var prisma_js_1 = require("../lib/prisma.js");
var stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
var SETTING_KEY = 'food_subscription_discount_percent';
var subscriptionsRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // POST /subscriptions/food/:productId/checkout
        // Creates a Stripe Checkout Session in subscription mode for a 12-month food plan
        app.post('/food/:productId/checkout', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var productId, user, product, setting, discountPercent, monthlyPrice, session, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        productId = req.params.productId;
                        user = req.user;
                        return [4 /*yield*/, prisma_js_1.default.product.findUnique({ where: { id: productId } })];
                    case 1:
                        product = _a.sent();
                        if (!product)
                            return [2 /*return*/, reply.code(404).send({ message: 'Το προϊόν δεν βρέθηκε' })];
                        if (!product.is_subscribable)
                            return [2 /*return*/, reply.code(400).send({ message: 'Αυτό το προϊόν δεν διαθέτει συνδρομή' })];
                        return [4 /*yield*/, prisma_js_1.default.appSetting.findUnique({ where: { key: SETTING_KEY } })];
                    case 2:
                        setting = _a.sent();
                        discountPercent = setting ? parseFloat(setting.value) : 0;
                        monthlyPrice = Math.round(product.price * (1 - discountPercent / 100) * 100) / 100;
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, stripe.checkout.sessions.create({
                                mode: 'subscription',
                                customer_email: user.email,
                                line_items: [{
                                        price_data: {
                                            currency: 'eur',
                                            unit_amount: Math.round(monthlyPrice * 100),
                                            recurring: { interval: 'month' },
                                            product_data: { name: "\u03A3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE \u03C4\u03C1\u03BF\u03C6\u03AE\u03C2: ".concat(product.name, " (12 \u03BC\u03AE\u03BD\u03B5\u03C2)") },
                                        },
                                        quantity: 1,
                                    }],
                                subscription_data: {
                                    metadata: {
                                        user_id: user.id,
                                        product_id: product.id,
                                        discount_percent: String(discountPercent),
                                        monthly_price: String(monthlyPrice),
                                        plan_duration_months: '12',
                                    },
                                },
                                success_url: "".concat(process.env.FRONTEND_URL || 'https://globipet.com', "/marketplace/").concat(product.id, "?subscription=success"),
                                cancel_url: "".concat(process.env.FRONTEND_URL || 'https://globipet.com', "/marketplace/").concat(product.id, "?subscription=cancelled"),
                            })];
                    case 4:
                        session = _a.sent();
                        return [2 /*return*/, reply.send({ data: { checkout_url: session.url } })];
                    case 5:
                        err_1 = _a.sent();
                        console.error('Stripe checkout error:', err_1);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα δημιουργίας συνδρομής: ' + err_1.message })];
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        // GET /subscriptions/food/my
        app.get('/food/my', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var subs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.productSubscription.findMany({
                            where: { user_id: req.user.id },
                            include: { product: { select: { id: true, name: true, image_url: true, price: true } } },
                            orderBy: { created_at: 'desc' },
                        })];
                    case 1:
                        subs = _a.sent();
                        return [2 /*return*/, reply.send({ data: subs })];
                }
            });
        }); });
        // POST /subscriptions/food/:id/cancel
        app.post('/food/:id/cancel', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var sub, err_2, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.productSubscription.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        sub = _a.sent();
                        if (!sub || sub.user_id !== req.user.id)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (!sub.stripe_subscription_id) return [3 /*break*/, 5];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, stripe.subscriptions.cancel(sub.stripe_subscription_id)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        err_2 = _a.sent();
                        console.error('Stripe cancel error:', err_2);
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, prisma_js_1.default.productSubscription.update({
                            where: { id: sub.id },
                            data: { status: 'cancelled', end_date: new Date() },
                        })];
                    case 6:
                        updated = _a.sent();
                        return [2 /*return*/, reply.send({ data: updated })];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = subscriptionsRoutes;
