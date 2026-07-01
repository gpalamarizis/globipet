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
exports.markTelehealthPaid = markTelehealthPaid;
exports.findTelehealthById = findTelehealthById;
var prisma_js_1 = require("../lib/prisma.js");
var viva_js_1 = require("../lib/viva.js");
var commission_js_1 = require("../lib/commission.js");
var email_js_1 = require("../lib/email.js");
var notifications_js_1 = require("./notifications.js");
// Fires once when a consultation is confirmed paid: generates the meeting room,
// sends customer + provider emails, and notifies the provider in-app.
// Exported (top-level) so orders.ts's shared Viva webhook can call it as a fallback
// when a paid merchantTrns id doesn't match an Order (i.e. it's a telehealth payment).
function markTelehealthPaid(consultationId, transactionId) {
    return __awaiter(this, void 0, void 0, function () {
        var updated, consultation;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.updateMany({
                        where: { id: consultationId, payment_status: { not: 'paid' } },
                        data: {
                            payment_status: 'paid',
                            status: 'scheduled',
                            payment_ref: String(transactionId),
                            meeting_url: "globipet-th-".concat(consultationId),
                        },
                    })];
                case 1:
                    updated = _a.sent();
                    if (updated.count === 0)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.findUnique({ where: { id: consultationId } })];
                case 2:
                    consultation = _a.sent();
                    if (!consultation)
                        return [2 /*return*/, true];
                    (0, email_js_1.sendTelehealthConfirmedEmail)(consultation.client_email, {
                        customerName: consultation.client_name,
                        providerName: consultation.provider_name,
                        date: consultation.scheduled_date,
                        time: consultation.scheduled_time,
                    }).catch(function () { });
                    (0, email_js_1.sendProviderNewTelehealthEmail)(consultation.provider_email, {
                        providerName: consultation.provider_name,
                        customerName: consultation.client_name,
                        date: consultation.scheduled_date,
                        time: consultation.scheduled_time,
                        payoutAmount: consultation.provider_payout_amount || 0,
                    }).catch(function () { });
                    prisma_js_1.default.notification.create({
                        data: {
                            user_email: consultation.provider_email,
                            title: '🔔 Ασθενής σε περιμένει!',
                            message: "".concat(consultation.client_name, " \u03C0\u03BB\u03AE\u03C1\u03C9\u03C3\u03B5 \u03BA\u03B1\u03B9 \u03C3\u03B5 \u03C0\u03B5\u03C1\u03B9\u03BC\u03AD\u03BD\u03B5\u03B9 \u03B3\u03B9\u03B1 \u03C4\u03B7\u03BB\u03B5\u03CA\u03B1\u03C4\u03C1\u03B9\u03BA\u03AE \u00B7 ").concat(consultation.scheduled_date, " ").concat(consultation.scheduled_time),
                            type: 'incoming_call',
                            link: "/provider/telehealth/".concat(consultation.id),
                        },
                    }).then(function (notification) {
                        // Standard notification push
                        (0, notifications_js_1.broadcastToUser)(consultation.provider_email, { type: 'notification', notification: notification });
                        // Also send dedicated incoming_call event so provider UI can show a prominent alert
                        (0, notifications_js_1.broadcastToUser)(consultation.provider_email, {
                            type: 'incoming_call',
                            consultation_id: consultation.id,
                            client_name: consultation.client_name,
                            pet_name: consultation.pet_name,
                            meeting_url: consultation.meeting_url,
                        });
                    }).catch(function () { });
                    return [2 /*return*/, true];
            }
        });
    });
}
// Returns the TelehealthConsultation row if `id` matches one — used by orders.ts's
// shared Viva webhook to detect which kind of payment just succeeded.
function findTelehealthById(id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, prisma_js_1.default.telehealthConsultation.findUnique({ where: { id: id } })];
        });
    });
}
var routes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // GET /telehealth/available-now — public, returns vets currently online
        app.get('/available-now', function (_req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var vets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.service.findMany({
                            where: { service_type: 'veterinary', is_active: true, is_available_now: true },
                            orderBy: { available_since: 'asc' },
                        })];
                    case 1:
                        vets = _a.sent();
                        return [2 /*return*/, reply.send({ data: vets })];
                }
            });
        }); });
        // PATCH /telehealth/availability — provider toggles their own availability
        app.patch('/availability', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, is_available, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        is_available = req.body.is_available;
                        return [4 /*yield*/, prisma_js_1.default.service.updateMany({
                                where: { provider_email: email, service_type: 'veterinary' },
                                data: {
                                    is_available_now: is_available,
                                    available_since: is_available ? new Date() : null,
                                },
                            })];
                    case 1:
                        updated = _a.sent();
                        if (updated.count === 0) {
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε κτηνιατρική υπηρεσία για αυτόν τον πάροχο' })];
                        }
                        // Broadcast availability change so telehealth page updates in real-time
                        (0, notifications_js_1.broadcastToUser)('__all__', {
                            type: 'vet_availability_change',
                            provider_email: email,
                            is_available_now: is_available,
                        });
                        return [2 /*return*/, reply.send({ ok: true, is_available_now: is_available })];
                }
            });
        }); });
        app.get('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.findMany({
                                where: { OR: [{ client_email: email }, { provider_email: email }] },
                                orderBy: { scheduled_date: 'desc' },
                            })];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, { data: data }];
                }
            });
        }); });
        app.get('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, consultation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        consultation = _a.sent();
                        if (!consultation)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (consultation.client_email !== email && consultation.provider_email !== email) {
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        }
                        return [2 /*return*/, { data: consultation }];
                }
            });
        }); });
        // Create a pending consultation and start Viva Smart Checkout. Payment MUST be confirmed
        // (via /:id/viva/verify or the shared orders.ts webhook fallback) before meeting_url is set.
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, email, full_name, _b, provider_email, provider_name, service_id, pet_id, pet_name, scheduled_date, scheduled_time, duration, notes, price, sessionPrice, _c, rate, platformFee, providerPayout, consultation, frontendUrl, _d, orderCode, checkoutUrl, err_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _a = req.user, email = _a.email, full_name = _a.full_name;
                        _b = req.body, provider_email = _b.provider_email, provider_name = _b.provider_name, service_id = _b.service_id, pet_id = _b.pet_id, pet_name = _b.pet_name, scheduled_date = _b.scheduled_date, scheduled_time = _b.scheduled_time, duration = _b.duration, notes = _b.notes, price = _b.price;
                        if (!provider_email || !scheduled_date || !scheduled_time)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        sessionPrice = parseFloat(price) || 0;
                        return [4 /*yield*/, (0, commission_js_1.calculateCommission)(sessionPrice, 'telehealth')];
                    case 1:
                        _c = _e.sent(), rate = _c.rate, platformFee = _c.platformFee, providerPayout = _c.providerPayout;
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.create({
                                data: {
                                    provider_email: provider_email,
                                    provider_name: provider_name || provider_email,
                                    client_email: email, client_name: full_name || email.split('@')[0],
                                    pet_id: pet_id || null, pet_name: pet_name || null,
                                    service_id: service_id || null,
                                    scheduled_date: scheduled_date,
                                    scheduled_time: scheduled_time,
                                    duration: parseInt(duration) || 30,
                                    notes: notes || null,
                                    price: sessionPrice,
                                    status: 'pending_payment',
                                    payment_status: 'unpaid',
                                    commission_rate: rate,
                                    platform_fee_amount: platformFee,
                                    provider_payout_amount: providerPayout,
                                }
                            })];
                    case 2:
                        consultation = _e.sent();
                        _e.label = 3;
                    case 3:
                        _e.trys.push([3, 6, , 7]);
                        frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com';
                        return [4 /*yield*/, (0, viva_js_1.createVivaPaymentOrder)({
                                amount: sessionPrice,
                                customerEmail: email,
                                customerName: full_name,
                                orderId: consultation.id,
                                description: "GlobiPet \u03C4\u03B7\u03BB\u03B5\u03CA\u03B1\u03C4\u03C1\u03B9\u03BA\u03AE \u03BC\u03B5 ".concat(provider_name || provider_email),
                                successUrl: "".concat(frontendUrl, "/telehealth/").concat(consultation.id, "/confirmation"),
                                failureUrl: "".concat(frontendUrl, "/telehealth/").concat(consultation.id, "/confirmation"),
                            })];
                    case 4:
                        _d = _e.sent(), orderCode = _d.orderCode, checkoutUrl = _d.checkoutUrl;
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.update({
                                where: { id: consultation.id },
                                data: { payment_ref: String(orderCode) },
                            })];
                    case 5:
                        _e.sent();
                        return [2 /*return*/, reply.code(201).send({ data: consultation, checkoutUrl: checkoutUrl })];
                    case 6:
                        err_1 = _e.sent();
                        console.error('Telehealth Viva checkout error:', err_1);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα δημιουργίας πληρωμής: ' + err_1.message })];
                    case 7: return [2 /*return*/];
                }
            });
        }); });
        // Manual verify (called from the confirmation page after Viva redirect)
        app.post('/:id/viva/verify', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var id, transaction_id, consultation, transaction, fresh, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = req.params.id;
                        transaction_id = req.body.transaction_id;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.findUnique({ where: { id: id } })];
                    case 2:
                        consultation = _a.sent();
                        if (!consultation)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (consultation.payment_status === 'paid') {
                            return [2 /*return*/, { paid: true, data: consultation }];
                        }
                        if (!transaction_id) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, viva_js_1.getVivaTransaction)(transaction_id)];
                    case 3:
                        transaction = _a.sent();
                        if (!(transaction.statusId === 'F')) return [3 /*break*/, 6];
                        return [4 /*yield*/, markTelehealthPaid(id, transaction_id)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.findUnique({ where: { id: id } })];
                    case 5:
                        fresh = _a.sent();
                        return [2 /*return*/, { paid: true, data: fresh }];
                    case 6: return [2 /*return*/, { paid: false, data: consultation }];
                    case 7:
                        err_2 = _a.sent();
                        console.error('Telehealth verify error:', err_2);
                        return [2 /*return*/, reply.code(500).send({ message: err_2.message })];
                    case 8: return [2 /*return*/];
                }
            });
        }); });
        app.patch('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (existing.client_email !== email && existing.provider_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, prisma_js_1.default.telehealthConsultation.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing || existing.client_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.telehealthConsultation.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = routes;
