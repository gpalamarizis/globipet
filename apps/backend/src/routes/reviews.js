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
var routes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        app.get('/', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, service_id, provider_email, data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.query, service_id = _a.service_id, provider_email = _a.provider_email;
                        return [4 /*yield*/, prisma_js_1.default.review.findMany({
                                where: __assign(__assign({}, (service_id && { service_id: service_id })), (provider_email && { provider_email: provider_email })),
                                orderBy: { created_at: 'desc' },
                            })];
                    case 1:
                        data = _b.sent();
                        return [2 /*return*/, { data: data }];
                }
            });
        }); });
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, email, full_name, _b, service_id, provider_email, rating, comment, booking_id, review, reviews, avg;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.user, email = _a.email, full_name = _a.full_name;
                        _b = req.body, service_id = _b.service_id, provider_email = _b.provider_email, rating = _b.rating, comment = _b.comment, booking_id = _b.booking_id;
                        if (!service_id || !provider_email || !rating)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.review.create({
                                data: { service_id: service_id, provider_email: provider_email, customer_email: email, customer_name: full_name || email.split('@')[0], rating: parseInt(rating), comment: comment || null, booking_id: booking_id || null }
                            })
                            // Update service rating
                        ];
                    case 1:
                        review = _c.sent();
                        return [4 /*yield*/, prisma_js_1.default.review.findMany({ where: { service_id: service_id }, select: { rating: true } })];
                    case 2:
                        reviews = _c.sent();
                        avg = reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length;
                        return [4 /*yield*/, prisma_js_1.default.service.update({ where: { id: service_id }, data: { rating: avg, review_count: reviews.length } })];
                    case 3:
                        _c.sent();
                        return [2 /*return*/, reply.code(201).send({ data: review })];
                }
            });
        }); });
        app.delete('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.review.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing || existing.customer_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.review.delete({ where: { id: req.params.id } })];
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
