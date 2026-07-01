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
var notifications_js_1 = require("./notifications.js");
var stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
var webhooksRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Capture raw body ONLY within this plugin's scope (encapsulated — doesn't affect other routes)
        app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
            done(null, body);
        });
        app.post('/stripe', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var sig, event, _a, session, subscription, meta, existing, invoice, subId, productSub, nextDelivery, notification, invoice, subId, productSub, notification, subscription, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sig = req.headers['stripe-signature'];
                        try {
                            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
                        }
                        catch (err) {
                            console.error('Stripe webhook signature error:', err.message);
                            return [2 /*return*/, reply.code(400).send("Webhook Error: ".concat(err.message))];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 21, , 22]);
                        _a = event.type;
                        switch (_a) {
                            case 'checkout.session.completed': return [3 /*break*/, 2];
                            case 'invoice.payment_succeeded': return [3 /*break*/, 7];
                            case 'invoice.payment_failed': return [3 /*break*/, 13];
                            case 'customer.subscription.deleted': return [3 /*break*/, 18];
                        }
                        return [3 /*break*/, 20];
                    case 2:
                        session = event.data.object;
                        if (!(session.mode === 'subscription' && session.subscription)) return [3 /*break*/, 6];
                        return [4 /*yield*/, stripe.subscriptions.retrieve(session.subscription)];
                    case 3:
                        subscription = _b.sent();
                        meta = subscription.metadata;
                        if (!((meta === null || meta === void 0 ? void 0 : meta.product_id) && (meta === null || meta === void 0 ? void 0 : meta.user_id))) return [3 /*break*/, 6];
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.findUnique({
                                where: { stripe_subscription_id: subscription.id },
                            })];
                    case 4:
                        existing = _b.sent();
                        if (!!existing) return [3 /*break*/, 6];
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.create({
                                data: {
                                    user_id: meta.user_id,
                                    product_id: meta.product_id,
                                    discount_percent: parseFloat(meta.discount_percent || '0'),
                                    monthly_price: parseFloat(meta.monthly_price || '0'),
                                    status: 'active',
                                    stripe_customer_id: session.customer,
                                    stripe_subscription_id: subscription.id,
                                    next_delivery_date: new Date(),
                                    deliveries_completed: 0,
                                },
                            })];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6: return [3 /*break*/, 20];
                    case 7:
                        invoice = event.data.object;
                        subId = invoice.subscription;
                        if (!subId) return [3 /*break*/, 12];
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.findUnique({
                                where: { stripe_subscription_id: subId },
                                include: { product: true, user: true },
                            })];
                    case 8:
                        productSub = _b.sent();
                        if (!productSub) return [3 /*break*/, 12];
                        nextDelivery = new Date();
                        nextDelivery.setMonth(nextDelivery.getMonth() + 1);
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.update({
                                where: { id: productSub.id },
                                data: {
                                    deliveries_completed: { increment: 1 },
                                    next_delivery_date: nextDelivery,
                                    status: 'active',
                                },
                            })
                            // Create the monthly delivery order
                        ];
                    case 9:
                        _b.sent();
                        // Create the monthly delivery order
                        return [4 /*yield*/, prisma_js_1.default.order.create({
                                data: {
                                    user_email: productSub.user.email,
                                    user_name: productSub.user.full_name,
                                    items: [{ product_id: productSub.product_id, name: productSub.product.name, price: productSub.monthly_price, quantity: 1 }],
                                    total_amount: productSub.monthly_price,
                                    status: 'processing',
                                    shipping_address: {},
                                    payment_method: 'stripe_subscription',
                                    notes: "\u0391\u03C5\u03C4\u03CC\u03BC\u03B1\u03C4\u03B7 \u03BC\u03B7\u03BD\u03B9\u03B1\u03AF\u03B1 \u03C0\u03B1\u03C1\u03AC\u03B4\u03BF\u03C3\u03B7 \u03C3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE\u03C2 (\u03C0\u03B1\u03C1\u03AC\u03B4\u03BF\u03C3\u03B7 #".concat(productSub.deliveries_completed + 1, "/12)"),
                                },
                            })];
                    case 10:
                        // Create the monthly delivery order
                        _b.sent();
                        return [4 /*yield*/, prisma_js_1.default.notification.create({
                                data: {
                                    user_email: productSub.user.email,
                                    title: 'Η μηνιαία παράδοση τροφής προγραμματίστηκε',
                                    message: "\u0397 \u03C0\u03BB\u03B7\u03C1\u03C9\u03BC\u03AE \u03C4\u03B7\u03C2 \u03C3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE\u03C2 \u03C3\u03BF\u03C5 \u03B3\u03B9\u03B1 \"".concat(productSub.product.name, "\" \u03AD\u03B3\u03B9\u03BD\u03B5 \u03B5\u03C0\u03B9\u03C4\u03C5\u03C7\u03CE\u03C2. \u0397 \u03C0\u03B1\u03C1\u03AC\u03B4\u03BF\u03C3\u03B7 \u03B5\u03C4\u03BF\u03B9\u03BC\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9."),
                                    type: 'subscription_delivery',
                                    link: '/orders',
                                },
                            })];
                    case 11:
                        notification = _b.sent();
                        (0, notifications_js_1.broadcastToUser)(productSub.user_id, { type: 'notification', notification: notification });
                        _b.label = 12;
                    case 12: return [3 /*break*/, 20];
                    case 13:
                        invoice = event.data.object;
                        subId = invoice.subscription;
                        if (!subId) return [3 /*break*/, 17];
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.findUnique({
                                where: { stripe_subscription_id: subId },
                                include: { user: true, product: true },
                            })];
                    case 14:
                        productSub = _b.sent();
                        if (!productSub) return [3 /*break*/, 17];
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.update({
                                where: { id: productSub.id },
                                data: { status: 'payment_failed' },
                            })];
                    case 15:
                        _b.sent();
                        return [4 /*yield*/, prisma_js_1.default.notification.create({
                                data: {
                                    user_email: productSub.user.email,
                                    title: 'Αποτυχία πληρωμής συνδρομής',
                                    message: "\u0397 \u03C7\u03C1\u03AD\u03C9\u03C3\u03B7 \u03B3\u03B9\u03B1 \u03C4\u03B7 \u03C3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE \"".concat(productSub.product.name, "\" \u03B1\u03C0\u03AD\u03C4\u03C5\u03C7\u03B5. \u0395\u03BD\u03B7\u03BC\u03AD\u03C1\u03C9\u03C3\u03B5 \u03C4\u03B1 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1 \u03C0\u03BB\u03B7\u03C1\u03C9\u03BC\u03AE\u03C2 \u03C3\u03BF\u03C5."),
                                    type: 'subscription_payment_failed',
                                    link: '/profile',
                                },
                            })];
                    case 16:
                        notification = _b.sent();
                        (0, notifications_js_1.broadcastToUser)(productSub.user_id, { type: 'notification', notification: notification });
                        _b.label = 17;
                    case 17: return [3 /*break*/, 20];
                    case 18:
                        subscription = event.data.object;
                        return [4 /*yield*/, prisma_js_1.default.productSubscription.updateMany({
                                where: { stripe_subscription_id: subscription.id },
                                data: { status: 'cancelled', end_date: new Date() },
                            })];
                    case 19:
                        _b.sent();
                        return [3 /*break*/, 20];
                    case 20: return [2 /*return*/, reply.send({ received: true })];
                    case 21:
                        err_1 = _b.sent();
                        console.error('Stripe webhook handler error:', err_1);
                        return [2 /*return*/, reply.code(500).send({ message: err_1.message })];
                    case 22: return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = webhooksRoutes;
