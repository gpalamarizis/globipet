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
exports.default = insuranceRoutes;
var prisma_js_1 = require("../lib/prisma.js");
function insuranceRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var isAdmin;
        var _this = this;
        return __generator(this, function (_a) {
            isAdmin = function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                        return [2 /*return*/, reply.code(403).send({ message: 'Forbidden' })];
                    }
                    return [2 /*return*/];
                });
            }); };
            // GET /insurance/providers
            app.get('/insurance/providers', function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var providers;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insuranceProvider.findMany({
                                where: { is_active: true },
                                include: {
                                    plans: {
                                        where: { is_active: true },
                                        orderBy: [{ display_order: 'asc' }, { price_monthly: 'asc' }],
                                    },
                                },
                                orderBy: { display_order: 'asc' },
                            })];
                        case 1:
                            providers = _a.sent();
                            return [2 /*return*/, reply.send({ data: providers })];
                    }
                });
            }); });
            // GET /insurance/plans
            app.get('/insurance/plans', function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var _a, pet_type, tier, max_price, covers_surgery, covers_dental, plans;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = req.query, pet_type = _a.pet_type, tier = _a.tier, max_price = _a.max_price, covers_surgery = _a.covers_surgery, covers_dental = _a.covers_dental;
                            return [4 /*yield*/, prisma_js_1.prisma.insurancePlan.findMany({
                                    where: __assign(__assign(__assign(__assign(__assign({ is_active: true }, (pet_type && { pet_types: { has: pet_type } })), (tier && { tier: tier })), (max_price && { price_monthly: { lte: parseFloat(max_price) } })), (covers_surgery === 'true' && { covers_surgery: true })), (covers_dental === 'true' && { covers_dental: true })),
                                    include: {
                                        provider: { select: { id: true, name: true, name_el: true, logo_url: true, website: true, phone: true } },
                                    },
                                    orderBy: [{ is_featured: 'desc' }, { display_order: 'asc' }, { price_monthly: 'asc' }],
                                })];
                        case 1:
                            plans = _b.sent();
                            return [2 /*return*/, reply.send({ data: plans })];
                    }
                });
            }); });
            // GET /insurance/plans/:id
            app.get('/insurance/plans/:id', function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var plan;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insurancePlan.findUnique({
                                where: { id: req.params.id },
                                include: { provider: true },
                            })];
                        case 1:
                            plan = _a.sent();
                            if (!plan)
                                return [2 /*return*/, reply.code(404).send({ message: 'Not found' })];
                            return [2 /*return*/, reply.send({ data: plan })];
                    }
                });
            }); });
            // ============ ADMIN ROUTES ============
            // POST /admin/insurance/providers
            app.post('/admin/insurance/providers', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var provider;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insuranceProvider.create({ data: req.body })];
                        case 1:
                            provider = _a.sent();
                            return [2 /*return*/, reply.code(201).send({ data: provider })];
                    }
                });
            }); });
            // PATCH /admin/insurance/providers/:id
            app.patch('/admin/insurance/providers/:id', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var provider;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insuranceProvider.update({ where: { id: req.params.id }, data: req.body })];
                        case 1:
                            provider = _a.sent();
                            return [2 /*return*/, reply.send({ data: provider })];
                    }
                });
            }); });
            // DELETE /admin/insurance/providers/:id
            app.delete('/admin/insurance/providers/:id', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insuranceProvider.delete({ where: { id: req.params.id } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true })];
                    }
                });
            }); });
            // POST /admin/insurance/plans
            app.post('/admin/insurance/plans', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var plan;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insurancePlan.create({ data: req.body })];
                        case 1:
                            plan = _a.sent();
                            return [2 /*return*/, reply.code(201).send({ data: plan })];
                    }
                });
            }); });
            // PATCH /admin/insurance/plans/:id
            app.patch('/admin/insurance/plans/:id', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var plan;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insurancePlan.update({ where: { id: req.params.id }, data: req.body })];
                        case 1:
                            plan = _a.sent();
                            return [2 /*return*/, reply.send({ data: plan })];
                    }
                });
            }); });
            // DELETE /admin/insurance/plans/:id
            app.delete('/admin/insurance/plans/:id', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_js_1.prisma.insurancePlan.delete({ where: { id: req.params.id } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, reply.send({ success: true })];
                    }
                });
            }); });
            // POST /insurance/bulk-import
            app.post('/insurance/bulk-import', { preHandler: [app.authenticate, isAdmin] }, function (req, reply) { return __awaiter(_this, void 0, void 0, function () {
                var _a, _b, providers, _c, plans, results, i, row, err_1, i, row, provider, err_2;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = req.body, _b = _a.providers, providers = _b === void 0 ? [] : _b, _c = _a.plans, plans = _c === void 0 ? [] : _c;
                            results = { providers_created: 0, plans_created: 0, errors: [] };
                            i = 0;
                            _d.label = 1;
                        case 1:
                            if (!(i < providers.length)) return [3 /*break*/, 6];
                            row = providers[i];
                            _d.label = 2;
                        case 2:
                            _d.trys.push([2, 4, , 5]);
                            if (!row.name)
                                throw new Error('Λείπει το όνομα εταιρείας');
                            return [4 /*yield*/, prisma_js_1.prisma.insuranceProvider.upsert({
                                    where: { name: row.name },
                                    update: { name_el: row.name_el, website: row.website, phone: row.phone, email: row.email, description: row.description, logo_url: row.logo_url, display_order: parseInt(row.display_order) || 0 },
                                    create: { name: row.name, name_el: row.name_el, website: row.website, phone: row.phone, email: row.email, description: row.description, logo_url: row.logo_url, display_order: parseInt(row.display_order) || 0, is_active: true },
                                })];
                        case 3:
                            _d.sent();
                            results.providers_created++;
                            return [3 /*break*/, 5];
                        case 4:
                            err_1 = _d.sent();
                            results.errors.push({ type: 'provider', row: i + 1, error: err_1.message });
                            return [3 /*break*/, 5];
                        case 5:
                            i++;
                            return [3 /*break*/, 1];
                        case 6:
                            i = 0;
                            _d.label = 7;
                        case 7:
                            if (!(i < plans.length)) return [3 /*break*/, 13];
                            row = plans[i];
                            _d.label = 8;
                        case 8:
                            _d.trys.push([8, 11, , 12]);
                            if (!row.provider_name || !row.plan_name || !row.tier || !row.price_monthly) {
                                throw new Error('Λείπουν υποχρεωτικά πεδία');
                            }
                            return [4 /*yield*/, prisma_js_1.prisma.insuranceProvider.findFirst({ where: { name: row.provider_name } })];
                        case 9:
                            provider = _d.sent();
                            if (!provider)
                                throw new Error("\u0394\u03B5\u03BD \u03B2\u03C1\u03AD\u03B8\u03B7\u03BA\u03B5 \u03B5\u03C4\u03B1\u03B9\u03C1\u03B5\u03AF\u03B1: ".concat(row.provider_name));
                            return [4 /*yield*/, prisma_js_1.prisma.insurancePlan.create({
                                    data: {
                                        provider_id: provider.id,
                                        name: row.plan_name,
                                        name_el: row.plan_name_el || null,
                                        tier: row.tier,
                                        price_monthly: parseFloat(row.price_monthly),
                                        price_annual: row.price_annual ? parseFloat(row.price_annual) : null,
                                        covers_accidents: row.covers_accidents === 'TRUE' || row.covers_accidents === true,
                                        covers_illness: row.covers_illness === 'TRUE' || row.covers_illness === true,
                                        covers_surgery: row.covers_surgery === 'TRUE' || row.covers_surgery === true,
                                        covers_dental: row.covers_dental === 'TRUE' || row.covers_dental === true,
                                        covers_preventive: row.covers_preventive === 'TRUE' || row.covers_preventive === true,
                                        covers_liability: row.covers_liability === 'TRUE' || row.covers_liability === true,
                                        covers_death: row.covers_death === 'TRUE' || row.covers_death === true,
                                        annual_limit: row.annual_limit ? parseFloat(row.annual_limit) : null,
                                        deductible: row.deductible ? parseFloat(row.deductible) : null,
                                        reimbursement_percent: row.reimbursement_pct ? parseInt(row.reimbursement_pct) : null,
                                        waiting_period_days: row.waiting_days ? parseInt(row.waiting_days) : 14,
                                        pet_types: row.pet_types ? row.pet_types.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [],
                                        is_active: true,
                                    }
                                })];
                        case 10:
                            _d.sent();
                            results.plans_created++;
                            return [3 /*break*/, 12];
                        case 11:
                            err_2 = _d.sent();
                            results.errors.push({ type: 'plan', row: i + 1, name: row.plan_name, error: err_2.message });
                            return [3 /*break*/, 12];
                        case 12:
                            i++;
                            return [3 /*break*/, 7];
                        case 13: return [2 /*return*/, reply.send(results)];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
