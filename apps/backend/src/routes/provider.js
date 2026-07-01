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
var providerRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        app.addHook('preHandler', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var user, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, app.authenticate(req, reply)];
                    case 1:
                        _b.sent();
                        user = req.user;
                        if (!['service_provider', 'both', 'admin'].includes(user === null || user === void 0 ? void 0 : user.role)) {
                            return [2 /*return*/, reply.code(403).send({ message: 'Απαγορευμένη πρόσβαση' })];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Provider stats
        app.get('/stats', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var providerId, _a, bookings, services, reviews, revenueData, avgRating;
            var _b;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        providerId = req.user.id;
                        return [4 /*yield*/, Promise.all([
                                prisma_js_1.default.booking.count({ where: { provider_id: providerId } }),
                                prisma_js_1.default.service.count({ where: { provider_id: providerId } }),
                                prisma_js_1.default.review.findMany({ where: { provider_id: providerId }, select: { rating: true } }),
                            ])];
                    case 1:
                        _a = _e.sent(), bookings = _a[0], services = _a[1], reviews = _a[2];
                        return [4 /*yield*/, prisma_js_1.default.booking.aggregate({
                                where: { provider_id: providerId, status: 'completed' },
                                _sum: { total_price: true }
                            })];
                    case 2:
                        revenueData = _e.sent();
                        avgRating = reviews.length > 0
                            ? (reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length).toFixed(1)
                            : null;
                        _b = {
                            bookings: bookings,
                            services: services,
                            revenue: (_d = (_c = revenueData._sum.total_price) === null || _c === void 0 ? void 0 : _c.toFixed(2)) !== null && _d !== void 0 ? _d : '0',
                            rating: avgRating ? "".concat(avgRating, " \u2605") : '—'
                        };
                        return [4 /*yield*/, prisma_js_1.default.product.count({ where: { provider_id: providerId } })];
                    case 3: return [2 /*return*/, (_b.products = _e.sent(),
                            _b)];
                }
            });
        }); });
        // Provider bookings
        app.get('/bookings', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var bookings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.booking.findMany({
                            where: { provider_id: req.user.id },
                            orderBy: { scheduled_at: 'asc' },
                            include: { service: true, user: { select: { full_name: true, email: true, phone: true } } },
                        })];
                    case 1:
                        bookings = _a.sent();
                        return [2 /*return*/, { data: bookings }];
                }
            });
        }); });
        // Update booking status
        app.patch('/bookings/:id', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var booking;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.booking.update({
                            where: { id: req.params.id },
                            data: { status: req.body.status }
                        })];
                    case 1:
                        booking = _a.sent();
                        return [2 /*return*/, booking];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = providerRoutes;
