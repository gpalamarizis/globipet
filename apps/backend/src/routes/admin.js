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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_js_1 = require("../lib/prisma.js");
var bcryptjs_1 = require("bcryptjs");
var adminRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
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
        app.get('/stats', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, users, pets, orders, providers, products, bookings, revenueData;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            prisma_js_1.default.user.count(),
                            prisma_js_1.default.pet.count(),
                            prisma_js_1.default.order.count(),
                            prisma_js_1.default.user.count({ where: { role: 'service_provider' } }),
                            prisma_js_1.default.product.count(),
                            prisma_js_1.default.booking.count(),
                        ])];
                    case 1:
                        _a = _d.sent(), users = _a[0], pets = _a[1], orders = _a[2], providers = _a[3], products = _a[4], bookings = _a[5];
                        return [4 /*yield*/, prisma_js_1.default.order.aggregate({
                                _sum: { total_amount: true },
                                where: { status: 'delivered' }
                            })];
                    case 2:
                        revenueData = _d.sent();
                        return [2 /*return*/, {
                                users: users,
                                pets: pets,
                                orders: orders,
                                providers: providers,
                                products: products,
                                bookings: bookings,
                                revenue: (_c = (_b = revenueData._sum.total_amount) === null || _b === void 0 ? void 0 : _b.toFixed(2)) !== null && _c !== void 0 ? _c : '0',
                                total_records: users + pets + orders + products + bookings,
                            }];
                }
            });
        }); });
        app.get('/users', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var role, users;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        role = req.query.role;
                        return [4 /*yield*/, prisma_js_1.default.user.findMany({
                                where: role ? { role: role } : undefined,
                                orderBy: { created_at: 'desc' },
                                select: {
                                    id: true,
                                    full_name: true,
                                    email: true,
                                    role: true,
                                    profile_photo: true,
                                    created_at: true,
                                },
                            })];
                    case 1:
                        users = _a.sent();
                        return [2 /*return*/, { data: users }];
                }
            });
        }); });
        app.post('/users', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, full_name, email, password, role, existing, password_hash, user;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, full_name = _a.full_name, email = _a.email, password = _a.password, role = _a.role;
                        if (!email || !password) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Email και κωδικός είναι υποχρεωτικά' })];
                        }
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        existing = _b.sent();
                        if (existing) {
                            return [2 /*return*/, reply.code(409).send({ message: 'Το email χρησιμοποιείται ήδη' })];
                        }
                        return [4 /*yield*/, bcryptjs_1.default.hash(password, 12)];
                    case 2:
                        password_hash = _b.sent();
                        return [4 /*yield*/, prisma_js_1.default.user.create({
                                data: {
                                    full_name: full_name || email.split('@')[0],
                                    email: email,
                                    password_hash: password_hash,
                                    role: role || 'user',
                                },
                                select: {
                                    id: true, full_name: true, email: true, role: true, created_at: true
                                }
                            })];
                    case 3:
                        user = _b.sent();
                        return [2 /*return*/, user];
                }
            });
        }); });
        app.patch('/users/:id', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, password, rest, data, _b, user;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.body, password = _a.password, rest = __rest(_a, ["password"]);
                        data = __assign({}, rest);
                        if (!password) return [3 /*break*/, 2];
                        _b = data;
                        return [4 /*yield*/, bcryptjs_1.default.hash(password, 12)];
                    case 1:
                        _b.password_hash = _c.sent();
                        _c.label = 2;
                    case 2: return [4 /*yield*/, prisma_js_1.default.user.update({
                            where: { id: req.params.id },
                            data: data,
                            select: {
                                id: true, full_name: true, email: true, role: true, created_at: true
                            }
                        })];
                    case 3:
                        user = _c.sent();
                        return [2 /*return*/, user];
                }
            });
        }); });
        app.delete('/users/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.user.delete({ where: { id: req.params.id } })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        app.post('/query', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var sql, dangerous, start, rows, duration, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = req.body.sql;
                        if (!sql)
                            return [2 /*return*/, reply.code(400).send({ message: 'Δεν δόθηκε SQL query' })];
                        dangerous = /\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i.test(sql);
                        if (dangerous)
                            return [2 /*return*/, reply.code(400).send({ message: 'Επικίνδυνη εντολή SQL δεν επιτρέπεται' })];
                        start = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, prisma_js_1.default.$queryRawUnsafe(sql)];
                    case 2:
                        rows = _a.sent();
                        duration = Date.now() - start;
                        return [2 /*return*/, {
                                rows: Array.isArray(rows) ? rows : [rows],
                                rowCount: Array.isArray(rows) ? rows.length : 1,
                                duration: duration
                            }];
                    case 3:
                        err_1 = _a.sent();
                        return [2 /*return*/, reply.code(400).send({ message: err_1.message })];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // POST /admin/email — send custom email to one user or broadcast to a role group
        app.post('/email', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, to_email, to_role, subject, body, apiKey, from, htmlBody, recipients, whereClause, users, BATCH, sent, failed, i, batch;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, to_email = _a.to_email, to_role = _a.to_role, subject = _a.subject, body = _a.body;
                        if (!subject || !body)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν θέμα ή περιεχόμενο' })];
                        if (!to_email && !to_role)
                            return [2 /*return*/, reply.code(400).send({ message: 'Δώσε email παραλήπτη ή ρόλο ομάδας' })];
                        apiKey = process.env.RESEND_API_KEY;
                        from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>';
                        if (!apiKey)
                            return [2 /*return*/, reply.code(500).send({ message: 'RESEND_API_KEY δεν έχει οριστεί στο Railway' })];
                        htmlBody = "<!DOCTYPE html><html><body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;\">\n      <div style=\"background:#E65100;padding:20px 24px;border-radius:12px 12px 0 0;\">\n        <span style=\"color:#fff;font-size:18px;font-weight:800;\">\uD83D\uDC3E globipet</span>\n      </div>\n      <div style=\"background:#fff;padding:28px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;\">\n        ".concat(body.replace(/\n/g, '<br/>'), "\n      </div>\n      <p style=\"color:#999;font-size:11px;text-align:center;margin-top:16px;\">GlobiPet \u00B7 globipet.com</p>\n    </body></html>");
                        recipients = [];
                        if (!to_email) return [3 /*break*/, 1];
                        recipients = [to_email];
                        return [3 /*break*/, 3];
                    case 1:
                        if (!to_role) return [3 /*break*/, 3];
                        whereClause = to_role === 'all'
                            ? {}
                            : { role: to_role };
                        return [4 /*yield*/, prisma_js_1.default.user.findMany({ where: whereClause, select: { email: true } })];
                    case 2:
                        users = _b.sent();
                        recipients = users.map(function (u) { return u.email; });
                        _b.label = 3;
                    case 3:
                        if (recipients.length === 0) {
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκαν παραλήπτες' })];
                        }
                        BATCH = 50;
                        sent = 0;
                        failed = 0;
                        i = 0;
                        _b.label = 4;
                    case 4:
                        if (!(i < recipients.length)) return [3 /*break*/, 7];
                        batch = recipients.slice(i, i + BATCH);
                        return [4 /*yield*/, Promise.allSettled(batch.map(function (email) { return __awaiter(void 0, void 0, void 0, function () {
                                var res, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, fetch('https://api.resend.com/emails', {
                                                    method: 'POST',
                                                    headers: { 'Authorization': "Bearer ".concat(apiKey), 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ from: from, to: email, subject: subject, html: htmlBody }),
                                                })];
                                        case 1:
                                            res = _b.sent();
                                            if (res.ok)
                                                sent++;
                                            else
                                                failed++;
                                            return [3 /*break*/, 3];
                                        case 2:
                                            _a = _b.sent();
                                            failed++;
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        i += BATCH;
                        return [3 /*break*/, 4];
                    case 7: return [2 /*return*/, reply.send({
                            ok: true,
                            recipients_count: recipients.length,
                            sent: sent,
                            failed: failed,
                            message: "\u0395\u03C3\u03C4\u03AC\u03BB\u03B7 \u03C3\u03B5 ".concat(sent, " \u03B1\u03C0\u03CC ").concat(recipients.length, " \u03C0\u03B1\u03C1\u03B1\u03BB\u03AE\u03C0\u03C4\u03B5\u03C2").concat(failed > 0 ? " (".concat(failed, " \u03B1\u03C0\u03AD\u03C4\u03C5\u03C7\u03B1\u03BD)") : ''),
                        })];
                }
            });
        }); });
        // GET /admin/users/search — search users for the email composer autocomplete
        app.get('/users/search', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, q, role, where, users;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.query, q = _a.q, role = _a.role;
                        where = {};
                        if (role)
                            where.role = role;
                        if (q)
                            where.OR = [
                                { email: { contains: q, mode: 'insensitive' } },
                                { full_name: { contains: q, mode: 'insensitive' } },
                            ];
                        return [4 /*yield*/, prisma_js_1.default.user.findMany({
                                where: where,
                                select: { id: true, email: true, full_name: true, role: true },
                                take: 20,
                                orderBy: { full_name: 'asc' },
                            })];
                    case 1:
                        users = _b.sent();
                        return [2 /*return*/, reply.send({ data: users })];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = adminRoutes;
