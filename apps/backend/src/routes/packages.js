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
var packageRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // ===== PUBLIC =====
        app.get('/service/:serviceId', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var packages, grouped, _i, packages_1, pkg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.servicePackage.findMany({
                            where: { service_id: req.params.serviceId, is_active: true },
                            orderBy: [{ display_order: 'asc' }, { price: 'asc' }]
                        })];
                    case 1:
                        packages = _a.sent();
                        grouped = {};
                        for (_i = 0, packages_1 = packages; _i < packages_1.length; _i++) {
                            pkg = packages_1[_i];
                            if (!grouped[pkg.group])
                                grouped[pkg.group] = [];
                            grouped[pkg.group].push(pkg);
                        }
                        return [2 /*return*/, { data: packages, grouped: grouped }];
                }
            });
        }); });
        // ===== PROVIDER (authenticated) =====
        app.register(function (provider) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                provider.addHook('preHandler', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, app.authenticate(req, reply)];
                            case 1:
                                _b.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                _a = _b.sent();
                                return [2 /*return*/, reply.code(401).send({ message: 'Μη εξουσιοδοτημένος' })];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); });
                // List my services + packages
                provider.get('/my', function (req) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, services;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                userEmail = req.user.email;
                                return [4 /*yield*/, prisma_js_1.default.service.findMany({
                                        where: { provider_email: userEmail },
                                        include: {
                                            packages: { orderBy: [{ display_order: 'asc' }, { group: 'asc' }, { price: 'asc' }] }
                                        }
                                    })];
                            case 1:
                                services = _a.sent();
                                return [2 /*return*/, { data: services }];
                        }
                    });
                }); });
                // Onboarding: create service + packages (with custom prices)
                provider.post('/setup', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, _a, category, title, description, city, country, location, home_visits, emergency_available, years_experience, specializations, pet_types, languages, packages_with_prices, templatePackages, templateIds, templates, templatesById_1, result, user;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                userEmail = req.user.email;
                                _a = req.body, category = _a.category, title = _a.title, description = _a.description, city = _a.city, country = _a.country, location = _a.location, home_visits = _a.home_visits, emergency_available = _a.emergency_available, years_experience = _a.years_experience, specializations = _a.specializations, pet_types = _a.pet_types, languages = _a.languages, packages_with_prices = _a.packages_with_prices;
                                if (!category || !title) {
                                    return [2 /*return*/, reply.code(400).send({ message: 'Λείπει category ή title' })];
                                }
                                templatePackages = [];
                                if (!(Array.isArray(packages_with_prices) && packages_with_prices.length > 0)) return [3 /*break*/, 2];
                                templateIds = packages_with_prices.map(function (p) { return p.template_id; }).filter(Boolean);
                                return [4 /*yield*/, prisma_js_1.default.catalogTemplate.findMany({
                                        where: { id: { in: templateIds } }
                                    })];
                            case 1:
                                templates = _b.sent();
                                templatesById_1 = new Map(templates.map(function (t) { return [t.id, t]; }));
                                templatePackages = packages_with_prices
                                    .map(function (p) {
                                    var _a;
                                    var t = templatesById_1.get(p.template_id);
                                    if (!t)
                                        return null;
                                    return {
                                        group: t.group,
                                        name: t.name,
                                        description: t.description,
                                        size: t.size,
                                        pet_type: t.pet_type,
                                        breed_group: t.breed_group,
                                        modality: t.modality,
                                        price: parseFloat(String(p.price)) || 0,
                                        duration_minutes: parseInt(String((_a = p.duration_minutes) !== null && _a !== void 0 ? _a : t.suggested_duration_minutes)) || 60,
                                        is_addon: t.is_addon,
                                    };
                                })
                                    .filter(Boolean);
                                _b.label = 2;
                            case 2: return [4 /*yield*/, prisma_js_1.default.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                    var service;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.service.create({
                                                    data: {
                                                        provider_email: userEmail,
                                                        category: category,
                                                        title: title,
                                                        description: description || null,
                                                        city: city || null,
                                                        country: country || 'GR',
                                                        location: location || null,
                                                        home_visits: !!home_visits,
                                                        emergency_available: !!emergency_available,
                                                        years_experience: parseInt(years_experience) || 0,
                                                        specializations: Array.isArray(specializations) ? specializations : (specializations ? String(specializations).split(',').map(function (s) { return s.trim(); }) : []),
                                                        pet_types: Array.isArray(pet_types) ? pet_types : (pet_types ? String(pet_types).split(',').map(function (s) { return s.trim(); }) : []),
                                                        languages: Array.isArray(languages) ? languages : (languages ? String(languages).split(',').map(function (s) { return s.trim(); }) : ['el', 'en']),
                                                        is_active: true,
                                                    }
                                                })];
                                            case 1:
                                                service = _a.sent();
                                                if (!(templatePackages.length > 0)) return [3 /*break*/, 3];
                                                return [4 /*yield*/, tx.servicePackage.createMany({
                                                        data: templatePackages.map(function (p, i) { return (__assign(__assign({}, p), { service_id: service.id, display_order: i })); })
                                                    })];
                                            case 2:
                                                _a.sent();
                                                _a.label = 3;
                                            case 3: return [2 /*return*/, tx.service.findUnique({
                                                    where: { id: service.id },
                                                    include: { packages: true }
                                                })];
                                        }
                                    });
                                }); })];
                            case 3:
                                result = _b.sent();
                                return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: userEmail } })];
                            case 4:
                                user = _b.sent();
                                if (!(user && user.role === 'user')) return [3 /*break*/, 6];
                                return [4 /*yield*/, prisma_js_1.default.user.update({ where: { email: userEmail }, data: { role: 'service_provider' } })];
                            case 5:
                                _b.sent();
                                _b.label = 6;
                            case 6: return [2 /*return*/, { service: result, packages_count: templatePackages.length }];
                        }
                    });
                }); });
                // Bulk import from selected catalog templates (with prices)
                provider.post('/bulk', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, _a, service_id, packages_with_prices, service, templateIds, templates, templatesById, data, created;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                userEmail = req.user.email;
                                _a = req.body, service_id = _a.service_id, packages_with_prices = _a.packages_with_prices;
                                return [4 /*yield*/, prisma_js_1.default.service.findUnique({ where: { id: service_id } })];
                            case 1:
                                service = _b.sent();
                                if (!service || service.provider_email !== userEmail) {
                                    return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                                }
                                templateIds = packages_with_prices.map(function (p) { return p.template_id; }).filter(Boolean);
                                return [4 /*yield*/, prisma_js_1.default.catalogTemplate.findMany({ where: { id: { in: templateIds } } })];
                            case 2:
                                templates = _b.sent();
                                templatesById = new Map(templates.map(function (t) { return [t.id, t]; }));
                                data = packages_with_prices
                                    .map(function (p, i) {
                                    var _a;
                                    var t = templatesById.get(p.template_id);
                                    if (!t)
                                        return null;
                                    return {
                                        service_id: service_id,
                                        group: t.group,
                                        name: t.name,
                                        description: t.description,
                                        size: t.size,
                                        pet_type: t.pet_type,
                                        breed_group: t.breed_group,
                                        modality: t.modality,
                                        price: parseFloat(String(p.price)) || 0,
                                        duration_minutes: parseInt(String((_a = p.duration_minutes) !== null && _a !== void 0 ? _a : t.suggested_duration_minutes)) || 60,
                                        is_addon: t.is_addon,
                                        display_order: i,
                                    };
                                })
                                    .filter(Boolean);
                                return [4 /*yield*/, prisma_js_1.default.servicePackage.createMany({ data: data })];
                            case 3:
                                created = _b.sent();
                                return [2 /*return*/, { count: created.count }];
                        }
                    });
                }); });
                // Update existing service basic info
                provider.patch('/services/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, service, body, data, updated;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                userEmail = req.user.email;
                                return [4 /*yield*/, prisma_js_1.default.service.findUnique({ where: { id: req.params.id } })];
                            case 1:
                                service = _a.sent();
                                if (!service || service.provider_email !== userEmail) {
                                    return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                                }
                                body = req.body;
                                data = {};
                                if (body.title !== undefined)
                                    data.title = body.title;
                                if (body.description !== undefined)
                                    data.description = body.description;
                                if (body.city !== undefined)
                                    data.city = body.city;
                                if (body.country !== undefined)
                                    data.country = body.country;
                                if (body.location !== undefined)
                                    data.location = body.location;
                                if (body.home_visits !== undefined)
                                    data.home_visits = !!body.home_visits;
                                if (body.emergency_available !== undefined)
                                    data.emergency_available = !!body.emergency_available;
                                if (body.years_experience !== undefined)
                                    data.years_experience = parseInt(body.years_experience) || 0;
                                if (body.is_active !== undefined)
                                    data.is_active = !!body.is_active;
                                if (body.cover_image !== undefined)
                                    data.cover_image = body.cover_image;
                                if (body.specializations !== undefined) {
                                    data.specializations = Array.isArray(body.specializations)
                                        ? body.specializations
                                        : String(body.specializations).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                                }
                                if (body.pet_types !== undefined) {
                                    data.pet_types = Array.isArray(body.pet_types)
                                        ? body.pet_types
                                        : String(body.pet_types).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                                }
                                if (body.languages !== undefined) {
                                    data.languages = Array.isArray(body.languages)
                                        ? body.languages
                                        : String(body.languages).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                                }
                                return [4 /*yield*/, prisma_js_1.default.service.update({
                                        where: { id: req.params.id },
                                        data: data,
                                        include: { packages: true }
                                    })];
                            case 2:
                                updated = _a.sent();
                                return [2 /*return*/, updated];
                        }
                    });
                }); });
                provider.delete('/services/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, service;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                userEmail = req.user.email;
                                return [4 /*yield*/, prisma_js_1.default.service.findUnique({ where: { id: req.params.id } })];
                            case 1:
                                service = _a.sent();
                                if (!service || service.provider_email !== userEmail) {
                                    return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                                }
                                return [4 /*yield*/, prisma_js_1.default.service.delete({ where: { id: req.params.id } })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, reply.code(204).send()];
                        }
                    });
                }); });
                // Custom package CRUD
                provider.post('/', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, body, service, pkg;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                userEmail = req.user.email;
                                body = req.body;
                                return [4 /*yield*/, prisma_js_1.default.service.findUnique({ where: { id: body.service_id } })];
                            case 1:
                                service = _a.sent();
                                if (!service || service.provider_email !== userEmail) {
                                    return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα σε αυτή την υπηρεσία' })];
                                }
                                return [4 /*yield*/, prisma_js_1.default.servicePackage.create({
                                        data: {
                                            service_id: body.service_id,
                                            group: body.group, name: body.name, description: body.description || null,
                                            size: body.size || null, pet_type: body.pet_type || null,
                                            breed_group: body.breed_group || null, modality: body.modality || null,
                                            price: parseFloat(body.price), duration_minutes: parseInt(body.duration_minutes) || 60,
                                            is_addon: !!body.is_addon, is_active: body.is_active !== false,
                                            display_order: parseInt(body.display_order) || 0,
                                        }
                                    })];
                            case 2:
                                pkg = _a.sent();
                                return [2 /*return*/, pkg];
                        }
                    });
                }); });
                provider.patch('/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, pkg, body, updated;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                userEmail = req.user.email;
                                return [4 /*yield*/, prisma_js_1.default.servicePackage.findUnique({
                                        where: { id: req.params.id }, include: { service: true }
                                    })];
                            case 1:
                                pkg = _a.sent();
                                if (!pkg || pkg.service.provider_email !== userEmail) {
                                    return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                                }
                                body = req.body;
                                return [4 /*yield*/, prisma_js_1.default.servicePackage.update({
                                        where: { id: req.params.id },
                                        data: __assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign({}, (body.group && { group: body.group })), (body.name && { name: body.name })), (body.description !== undefined && { description: body.description })), (body.size !== undefined && { size: body.size })), (body.pet_type !== undefined && { pet_type: body.pet_type })), (body.breed_group !== undefined && { breed_group: body.breed_group })), (body.modality !== undefined && { modality: body.modality })), (body.price !== undefined && { price: parseFloat(body.price) })), (body.duration_minutes !== undefined && { duration_minutes: parseInt(body.duration_minutes) })), (body.is_addon !== undefined && { is_addon: !!body.is_addon })), (body.is_active !== undefined && { is_active: !!body.is_active })), (body.display_order !== undefined && { display_order: parseInt(body.display_order) }))
                                    })];
                            case 2:
                                updated = _a.sent();
                                return [2 /*return*/, updated];
                        }
                    });
                }); });
                provider.delete('/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
                    var userEmail, pkg;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                userEmail = req.user.email;
                                return [4 /*yield*/, prisma_js_1.default.servicePackage.findUnique({
                                        where: { id: req.params.id }, include: { service: true }
                                    })];
                            case 1:
                                pkg = _a.sent();
                                if (!pkg || pkg.service.provider_email !== userEmail) {
                                    return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                                }
                                return [4 /*yield*/, prisma_js_1.default.servicePackage.delete({ where: { id: req.params.id } })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/, reply.code(204).send()];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = packageRoutes;
