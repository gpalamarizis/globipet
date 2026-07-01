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
var viva_js_1 = require("../lib/viva.js");
var commission_js_1 = require("../lib/commission.js");
var email_js_1 = require("../lib/email.js");
var notifications_js_1 = require("./notifications.js");
var telehealth_js_1 = require("./telehealth.js");
var ordersRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    // Fires once when an order transitions to paid: buyer confirmation email +
    // provider new-order email/in-app notification (per distinct provider in items).
    function firePaidSideEffects(orderId) {
        return __awaiter(this, void 0, void 0, function () {
            var order, items, byProvider, _i, items_1, i, entry, _a, _b, _c, providerEmail, info, provider, notification, err_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, prisma_js_1.default.order.findUnique({ where: { id: orderId } })];
                    case 1:
                        order = _d.sent();
                        if (!order)
                            return [2 /*return*/];
                        items = order.items;
                        (0, email_js_1.sendOrderConfirmedEmail)(order.user_email, {
                            orderId: order.id,
                            customerName: order.user_name,
                            items: items.map(function (i) { return ({ name: i.name, price: i.price, quantity: i.quantity }); }),
                            total: order.total_amount,
                        }).catch(function () { });
                        byProvider = new Map();
                        for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
                            i = items_1[_i];
                            if (!i.provider_email)
                                continue;
                            entry = byProvider.get(i.provider_email) || { payout: 0, itemNames: [] };
                            entry.payout += i.provider_payout || 0;
                            entry.itemNames.push("".concat(i.name, " \u00D7").concat(i.quantity));
                            byProvider.set(i.provider_email, entry);
                        }
                        _a = 0, _b = byProvider.entries();
                        _d.label = 2;
                    case 2:
                        if (!(_a < _b.length)) return [3 /*break*/, 6];
                        _c = _b[_a], providerEmail = _c[0], info = _c[1];
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: providerEmail } })];
                    case 3:
                        provider = _d.sent();
                        (0, email_js_1.sendProviderNewOrderEmail)(providerEmail, {
                            providerName: (provider === null || provider === void 0 ? void 0 : provider.full_name) || providerEmail.split('@')[0],
                            orderId: order.id,
                            productName: info.itemNames.join(', '),
                            quantity: 1,
                            payoutAmount: Math.round(info.payout * 100) / 100,
                        }).catch(function () { });
                        return [4 /*yield*/, prisma_js_1.default.notification.create({
                                data: {
                                    user_email: providerEmail,
                                    title: 'Νέα παραγγελία προϊόντος',
                                    message: "".concat(info.itemNames.join(', '), " \u2014 \u03B1\u03BC\u03BF\u03B9\u03B2\u03AE ").concat((Math.round(info.payout * 100) / 100).toFixed(2), "\u20AC"),
                                    type: 'new_order',
                                    link: '/provider',
                                },
                            })];
                    case 4:
                        notification = _d.sent();
                        (0, notifications_js_1.broadcastToUser)(providerEmail, { type: 'notification', notification: notification });
                        _d.label = 5;
                    case 5:
                        _a++;
                        return [3 /*break*/, 2];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        err_1 = _d.sent();
                        console.error('firePaidSideEffects error:', err_1);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    }
    return __generator(this, function (_a) {
        // Get my orders
        app.get('/my', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, orders;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.order.findMany({
                                where: { user_email: email },
                                orderBy: { created_at: 'desc' },
                            })];
                    case 1:
                        orders = _a.sent();
                        return [2 /*return*/, { data: orders }];
                }
            });
        }); });
        // Get order by ID
        app.get('/:id', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var order;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.order.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        order = _a.sent();
                        return [2 /*return*/, order];
                }
            });
        }); });
        // Create order
        app.post('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, email, full_name, _b, items, shipping_address, payment_method, total_amount, productIds, products, productMap, totalPlatformFee, totalProviderPayout, enrichedItems, order;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.user, email = _a.email, full_name = _a.full_name;
                        _b = req.body, items = _b.items, shipping_address = _b.shipping_address, payment_method = _b.payment_method, total_amount = _b.total_amount;
                        productIds = items.map(function (i) { return i.product_id || i.id; }).filter(Boolean);
                        return [4 /*yield*/, prisma_js_1.default.product.findMany({ where: { id: { in: productIds } } })];
                    case 1:
                        products = _c.sent();
                        productMap = new Map(products.map(function (p) { return [p.id, p]; }));
                        totalPlatformFee = 0;
                        totalProviderPayout = 0;
                        return [4 /*yield*/, Promise.all(items.map(function (item) { return __awaiter(void 0, void 0, void 0, function () {
                                var productId, product, price, quantity, lineTotal, category, providerEmail, commission_rate, platform_fee, provider_payout, c;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            productId = item.product_id || item.id;
                                            product = productMap.get(productId);
                                            price = parseFloat((_b = (_a = item.product_price) !== null && _a !== void 0 ? _a : item.price) !== null && _b !== void 0 ? _b : 0);
                                            quantity = item.quantity;
                                            lineTotal = price * quantity;
                                            category = (product === null || product === void 0 ? void 0 : product.category) || null;
                                            providerEmail = (product === null || product === void 0 ? void 0 : product.provider_email) || null;
                                            commission_rate = null;
                                            platform_fee = null;
                                            provider_payout = null;
                                            if (!providerEmail) return [3 /*break*/, 2];
                                            return [4 /*yield*/, (0, commission_js_1.calculateCommission)(lineTotal, category)];
                                        case 1:
                                            c = _c.sent();
                                            commission_rate = c.rate;
                                            platform_fee = c.platformFee;
                                            provider_payout = c.providerPayout;
                                            totalPlatformFee += c.platformFee;
                                            totalProviderPayout += c.providerPayout;
                                            _c.label = 2;
                                        case 2: return [2 /*return*/, {
                                                product_id: productId,
                                                name: item.product_name || item.name,
                                                price: price,
                                                quantity: quantity,
                                                image: item.product_image || item.image || null,
                                                category: category,
                                                provider_email: providerEmail,
                                                commission_rate: commission_rate,
                                                platform_fee: platform_fee,
                                                provider_payout: provider_payout,
                                            }];
                                    }
                                });
                            }); }))];
                    case 2:
                        enrichedItems = _c.sent();
                        return [4 /*yield*/, prisma_js_1.default.order.create({
                                data: {
                                    user_email: email,
                                    user_name: full_name || email.split('@')[0],
                                    items: enrichedItems,
                                    total_amount: parseFloat(total_amount),
                                    status: 'pending',
                                    shipping_address: shipping_address,
                                    payment_method: payment_method,
                                    platform_fee_amount: totalPlatformFee > 0 ? Math.round(totalPlatformFee * 100) / 100 : null,
                                    provider_payout_amount: totalProviderPayout > 0 ? Math.round(totalProviderPayout * 100) / 100 : null,
                                }
                            })
                            // Clear cart
                        ];
                    case 3:
                        order = _c.sent();
                        // Clear cart
                        return [4 /*yield*/, prisma_js_1.default.cartItem.deleteMany({ where: { user_email: email } })];
                    case 4:
                        // Clear cart
                        _c.sent();
                        return [2 /*return*/, order];
                }
            });
        }); });
        // ─── VIVA.COM SMART CHECKOUT ─────────────────────────────────────
        app.post('/viva/checkout', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, order_id, total_amount, user, order, _b, orderCode, checkoutUrl, err_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.body, order_id = _a.order_id, total_amount = _a.total_amount;
                        user = req.user;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, prisma_js_1.default.order.findUnique({ where: { id: order_id } })];
                    case 2:
                        order = _c.sent();
                        if (!order || order.user_email !== user.email) {
                            return [2 /*return*/, reply.code(404).send({ message: 'Η παραγγελία δεν βρέθηκε' })];
                        }
                        return [4 /*yield*/, (0, viva_js_1.createVivaPaymentOrder)({
                                amount: parseFloat(total_amount || order.total_amount),
                                customerEmail: user.email,
                                customerName: user.full_name,
                                orderId: order_id,
                                description: "GlobiPet \u03C0\u03B1\u03C1\u03B1\u03B3\u03B3\u03B5\u03BB\u03AF\u03B1 #".concat(order_id.slice(0, 8)),
                            })];
                    case 3:
                        _b = _c.sent(), orderCode = _b.orderCode, checkoutUrl = _b.checkoutUrl;
                        return [4 /*yield*/, prisma_js_1.default.order.update({
                                where: { id: order_id },
                                data: { payment_ref: String(orderCode), payment_method: 'viva' },
                            })];
                    case 4:
                        _c.sent();
                        return [2 /*return*/, { checkoutUrl: checkoutUrl, orderCode: orderCode }];
                    case 5:
                        err_2 = _c.sent();
                        console.error('Viva checkout error:', err_2);
                        return [2 /*return*/, reply.code(500).send({ message: err_2.message || 'Σφάλμα πληρωμής' })];
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        // Viva webhook - payment confirmation (PUBLIC - no auth)
        app.post('/viva/webhook', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var event_1, eventType, eventData, merchantTrns, transactionId, statusId, updated, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        event_1 = req.body;
                        eventType = event_1.EventTypeId;
                        eventData = event_1.EventData;
                        if (!(eventType === 1796 && eventData)) return [3 /*break*/, 5];
                        merchantTrns = eventData.MerchantTrns // our order id
                        ;
                        transactionId = eventData.TransactionId;
                        statusId = eventData.StatusId // 'F' = Finished
                        ;
                        if (!(merchantTrns && statusId === 'F')) return [3 /*break*/, 5];
                        return [4 /*yield*/, prisma_js_1.default.order.updateMany({
                                where: { id: merchantTrns, payment_status: { not: 'paid' } },
                                data: {
                                    status: 'confirmed',
                                    payment_status: 'paid',
                                    payment_ref: String(transactionId),
                                },
                            }).catch(function () { return null; })];
                    case 1:
                        updated = _a.sent();
                        if (!(updated && updated.count > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, firePaidSideEffects(merchantTrns)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: 
                    // Not an order — try telehealth (same shared webhook URL handles both)
                    return [4 /*yield*/, (0, telehealth_js_1.markTelehealthPaid)(merchantTrns, String(transactionId)).catch(function (err) {
                            console.error('markTelehealthPaid fallback error:', err);
                        })];
                    case 4:
                        // Not an order — try telehealth (same shared webhook URL handles both)
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, reply.code(200).send({ received: true })];
                    case 6:
                        err_3 = _a.sent();
                        console.error('Viva webhook error:', err_3);
                        return [2 /*return*/, reply.code(200).send({ received: true })];
                    case 7: return [2 /*return*/];
                }
            });
        }); });
        // Viva webhook verification key (Viva sends GET to verify endpoint)
        app.get('/viva/webhook', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var merchantId, apiKey, isDemo, baseUrl, credentials, res, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        merchantId = process.env.VIVA_MERCHANT_ID;
                        apiKey = process.env.VIVA_API_KEY;
                        isDemo = (process.env.VIVA_ENV || 'demo') === 'demo';
                        baseUrl = isDemo
                            ? 'https://demo.vivapayments.com'
                            : 'https://www.vivapayments.com';
                        credentials = Buffer.from("".concat(merchantId, ":").concat(apiKey)).toString('base64');
                        return [4 /*yield*/, fetch("".concat(baseUrl, "/api/messages/config/token"), {
                                headers: { 'Authorization': "Basic ".concat(credentials) }
                            })];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, { Key: data.Key }];
                }
            });
        }); });
        // Manual verify (called from success page)
        app.post('/viva/verify', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, order_id, transaction_id, transaction, updated, err_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, order_id = _a.order_id, transaction_id = _a.transaction_id;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        if (!transaction_id) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, viva_js_1.getVivaTransaction)(transaction_id)];
                    case 2:
                        transaction = _b.sent();
                        if (!(transaction.statusId === 'F')) return [3 /*break*/, 6];
                        return [4 /*yield*/, prisma_js_1.default.order.updateMany({
                                where: { id: order_id, payment_status: { not: 'paid' } },
                                data: { status: 'confirmed', payment_status: 'paid', payment_ref: String(transaction_id) },
                            })];
                    case 3:
                        updated = _b.sent();
                        if (!(updated.count > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, firePaidSideEffects(order_id)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [2 /*return*/, { paid: true, order_id: order_id }];
                    case 6: return [2 /*return*/, { paid: false, order_id: order_id }];
                    case 7:
                        err_4 = _b.sent();
                        console.error('Viva verify error:', err_4);
                        return [2 /*return*/, reply.code(500).send({ message: err_4.message })];
                    case 8: return [2 /*return*/];
                }
            });
        }); });
        // Admin: get all orders
        app.get('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var user, orders;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        user = req.user;
                        if (user.role !== 'admin')
                            return [2 /*return*/, { data: [] }];
                        return [4 /*yield*/, prisma_js_1.default.order.findMany({
                                orderBy: { created_at: 'desc' },
                                take: 50,
                            })];
                    case 1:
                        orders = _a.sent();
                        return [2 /*return*/, { data: orders }];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = ordersRoutes;
