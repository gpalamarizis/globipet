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
var email_js_1 = require("../lib/email.js");
var notifications_js_1 = require("./notifications.js");
var bookingsRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        app.get('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, tab, now, where, data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.query.tab, tab = _a === void 0 ? 'upcoming' : _a;
                        now = new Date().toISOString().split('T')[0];
                        where = { customer_email: email };
                        if (tab === 'upcoming')
                            where.booking_date = { gte: now };
                        else if (tab === 'past')
                            where.booking_date = { lt: now };
                        return [4 /*yield*/, prisma_js_1.default.booking.findMany({ where: where, orderBy: { booking_date: 'asc' } })];
                    case 1:
                        data = _b.sent();
                        return [2 /*return*/, { data: data, total: data.length }];
                }
            });
        }); });
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, email, full_name, body, service, _b, providerEmail, providerName, totalPrice, category, _c, rate, platformFee, providerPayout, booking;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = req.user, email = _a.email, full_name = _a.full_name;
                        body = req.body;
                        if (!body.service_id) return [3 /*break*/, 2];
                        return [4 /*yield*/, prisma_js_1.default.service.findUnique({ where: { id: body.service_id } })];
                    case 1:
                        _b = _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _b = null;
                        _d.label = 3;
                    case 3:
                        service = _b;
                        providerEmail = (service === null || service === void 0 ? void 0 : service.provider_email) || body.provider_email;
                        providerName = (service === null || service === void 0 ? void 0 : service.provider_name) || body.provider_name;
                        totalPrice = parseFloat(body.total_price) || 0;
                        category = (service === null || service === void 0 ? void 0 : service.service_type) || null;
                        return [4 /*yield*/, (0, commission_js_1.calculateCommission)(totalPrice, category)];
                    case 4:
                        _c = _d.sent(), rate = _c.rate, platformFee = _c.platformFee, providerPayout = _c.providerPayout;
                        return [4 /*yield*/, prisma_js_1.default.booking.create({
                                data: __assign(__assign({}, body), { customer_email: email, customer_name: full_name, provider_email: providerEmail, provider_name: providerName, total_price: totalPrice, status: body.status || 'confirmed', commission_rate: rate, platform_fee_amount: platformFee, provider_payout_amount: providerPayout })
                            })
                            // Side effects — never block the booking response on email/notification failures
                        ];
                    case 5:
                        booking = _d.sent();
                        // Side effects — never block the booking response on email/notification failures
                        (0, email_js_1.sendBookingConfirmedEmail)(email, {
                            customerName: full_name || email.split('@')[0],
                            providerName: providerName || 'τον πάροχο',
                            date: booking.booking_date,
                            time: booking.booking_time,
                            price: totalPrice,
                        }).catch(function () { });
                        if (providerEmail) {
                            (0, email_js_1.sendProviderNewBookingEmail)(providerEmail, {
                                providerName: providerName || providerEmail.split('@')[0],
                                customerName: full_name || email.split('@')[0],
                                date: booking.booking_date,
                                time: booking.booking_time,
                                payoutAmount: providerPayout,
                            }).catch(function () { });
                            prisma_js_1.default.notification.create({
                                data: {
                                    user_email: providerEmail,
                                    title: 'Νέα κράτηση',
                                    message: "".concat(full_name || email.split('@')[0], " \u00B7 ").concat(booking.booking_date, " ").concat(booking.booking_time, " \u00B7 \u03B1\u03BC\u03BF\u03B9\u03B2\u03AE ").concat(providerPayout.toFixed(2), "\u20AC"),
                                    type: 'new_booking',
                                    link: '/provider',
                                },
                            }).then(function (notification) { return (0, notifications_js_1.broadcastToUser)(providerEmail, { type: 'notification', notification: notification }); }).catch(function () { });
                        }
                        return [2 /*return*/, reply.code(201).send(booking)];
                }
            });
        }); });
        app.patch('/:id', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_js_1.default.booking.update({ where: { id: req.params.id }, data: req.body })];
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = bookingsRoutes;
