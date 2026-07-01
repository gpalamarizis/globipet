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
/**
 * Admin endpoints for catalog templates + services + packages of any provider.
 * Mounted at /api/admin/catalog
 */
var adminCatalogRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
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
        // ─── CATALOG TEMPLATES ───────────────────────────────────────
        app.get('/templates', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var category, templates;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        category = req.query.category;
                        return [4 /*yield*/, prisma_js_1.default.catalogTemplate.findMany({
                                where: category ? { category: category } : undefined,
                                orderBy: [{ category: 'asc' }, { display_order: 'asc' }]
                            })];
                    case 1:
                        templates = _a.sent();
                        return [2 /*return*/, { data: templates }];
                }
            });
        }); });
        app.post('/templates', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var body, tpl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        body = req.body;
                        return [4 /*yield*/, prisma_js_1.default.catalogTemplate.create({
                                data: {
                                    category: body.category,
                                    group: body.group,
                                    name: body.name,
                                    description: body.description || null,
                                    size: body.size || null,
                                    pet_type: body.pet_type || null,
                                    breed_group: body.breed_group || null,
                                    modality: body.modality || null,
                                    suggested_duration_minutes: parseInt(body.suggested_duration_minutes) || 60,
                                    is_addon: !!body.is_addon,
                                    is_active: body.is_active !== false,
                                    display_order: parseInt(body.display_order) || 0,
                                }
                            })];
                    case 1:
                        tpl = _a.sent();
                        return [2 /*return*/, tpl];
                }
            });
        }); });
        app.patch('/templates/:id', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var body, data, _i, _a, f;
            return __generator(this, function (_b) {
                body = req.body;
                data = {};
                for (_i = 0, _a = ['category', 'group', 'name', 'description', 'size', 'pet_type', 'breed_group', 'modality']; _i < _a.length; _i++) {
                    f = _a[_i];
                    if (body[f] !== undefined)
                        data[f] = body[f];
                }
                if (body.suggested_duration_minutes !== undefined)
                    data.suggested_duration_minutes = parseInt(body.suggested_duration_minutes) || 60;
                if (body.is_addon !== undefined)
                    data.is_addon = !!body.is_addon;
                if (body.is_active !== undefined)
                    data.is_active = !!body.is_active;
                if (body.display_order !== undefined)
                    data.display_order = parseInt(body.display_order) || 0;
                return [2 /*return*/, prisma_js_1.default.catalogTemplate.update({ where: { id: req.params.id }, data: data })];
            });
        }); });
        app.delete('/templates/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.catalogTemplate.delete({ where: { id: req.params.id } })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── PROVIDER SERVICES (all providers) ───────────────────────
        app.get('/services', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var services;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.service.findMany({
                            include: {
                                packages: { orderBy: [{ display_order: 'asc' }, { group: 'asc' }] }
                            },
                            orderBy: { created_at: 'desc' }
                        })];
                    case 1:
                        services = _a.sent();
                        return [2 /*return*/, { data: services }];
                }
            });
        }); });
        app.patch('/services/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var body, data, allowed, _i, allowed_1, f, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        body = req.body;
                        data = {};
                        allowed = ['title', 'description', 'city', 'country', 'location', 'category',
                            'home_visits', 'emergency_available', 'years_experience', 'is_active', 'is_verified',
                            'cover_image', 'specializations', 'pet_types', 'languages'];
                        for (_i = 0, allowed_1 = allowed; _i < allowed_1.length; _i++) {
                            f = allowed_1[_i];
                            if (body[f] !== undefined) {
                                if (['home_visits', 'emergency_available', 'is_active', 'is_verified'].includes(f))
                                    data[f] = !!body[f];
                                else if (f === 'years_experience')
                                    data[f] = parseInt(body[f]) || 0;
                                else if (['specializations', 'pet_types', 'languages'].includes(f)) {
                                    data[f] = Array.isArray(body[f]) ? body[f] :
                                        String(body[f]).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                                }
                                else
                                    data[f] = body[f];
                            }
                        }
                        return [4 /*yield*/, prisma_js_1.default.service.update({
                                where: { id: req.params.id },
                                data: data,
                                include: { packages: true }
                            })];
                    case 1:
                        updated = _a.sent();
                        return [2 /*return*/, updated];
                }
            });
        }); });
        app.delete('/services/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.service.delete({ where: { id: req.params.id } })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── PROVIDER PACKAGES (all) ─────────────────────────────────
        app.get('/packages', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var service_id, packages;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        service_id = req.query.service_id;
                        return [4 /*yield*/, prisma_js_1.default.servicePackage.findMany({
                                where: service_id ? { service_id: service_id } : undefined,
                                include: { service: { select: { id: true, title: true, provider_email: true, category: true } } },
                                orderBy: [{ service_id: 'asc' }, { display_order: 'asc' }]
                            })];
                    case 1:
                        packages = _a.sent();
                        return [2 /*return*/, { data: packages }];
                }
            });
        }); });
        app.patch('/packages/:id', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var body, data, _i, _a, f;
            return __generator(this, function (_b) {
                body = req.body;
                data = {};
                for (_i = 0, _a = ['group', 'name', 'description', 'size', 'pet_type', 'breed_group', 'modality']; _i < _a.length; _i++) {
                    f = _a[_i];
                    if (body[f] !== undefined)
                        data[f] = body[f];
                }
                if (body.price !== undefined)
                    data.price = parseFloat(body.price) || 0;
                if (body.duration_minutes !== undefined)
                    data.duration_minutes = parseInt(body.duration_minutes) || 60;
                if (body.is_addon !== undefined)
                    data.is_addon = !!body.is_addon;
                if (body.is_active !== undefined)
                    data.is_active = !!body.is_active;
                if (body.display_order !== undefined)
                    data.display_order = parseInt(body.display_order) || 0;
                return [2 /*return*/, prisma_js_1.default.servicePackage.update({ where: { id: req.params.id }, data: data })];
            });
        }); });
        app.delete('/packages/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.servicePackage.delete({ where: { id: req.params.id } })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = adminCatalogRoutes;
