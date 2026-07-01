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
        // Health Records
        app.get('/records', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, pet_id, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        pet_id = req.query.pet_id;
                        return [4 /*yield*/, prisma_js_1.default.healthRecord.findMany({
                                where: __assign({ owner_email: email }, (pet_id && { pet_id: pet_id })),
                                orderBy: { date: 'desc' },
                            })];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, { data: data }];
                }
            });
        }); });
        app.post('/records', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, pet_id, record_type, title, description, date, vet_name, clinic_name, cost, next_appointment, record;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.body, pet_id = _a.pet_id, record_type = _a.record_type, title = _a.title, description = _a.description, date = _a.date, vet_name = _a.vet_name, clinic_name = _a.clinic_name, cost = _a.cost, next_appointment = _a.next_appointment;
                        if (!pet_id || !record_type || !title || !date)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.healthRecord.create({
                                data: { pet_id: pet_id, owner_email: email, record_type: record_type, title: title, description: description || '', date: date, vet_name: vet_name || null, clinic_name: clinic_name || null, cost: cost ? parseFloat(cost) : null, next_appointment: next_appointment || null, attachments: [] }
                            })];
                    case 1:
                        record = _b.sent();
                        return [2 /*return*/, reply.code(201).send({ data: record })];
                }
            });
        }); });
        app.patch('/records/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing, record;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.healthRecord.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing || existing.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.healthRecord.update({ where: { id: req.params.id }, data: req.body })];
                    case 2:
                        record = _a.sent();
                        return [2 /*return*/, { data: record }];
                }
            });
        }); });
        app.delete('/records/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.healthRecord.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing || existing.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.healthRecord.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // Vaccinations
        app.get('/vaccinations', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, pet_id, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        pet_id = req.query.pet_id;
                        return [4 /*yield*/, prisma_js_1.default.vaccination.findMany({
                                where: __assign({ owner_email: email }, (pet_id && { pet_id: pet_id })),
                                orderBy: { date_administered: 'desc' },
                            })];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, { data: data }];
                }
            });
        }); });
        app.post('/vaccinations', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, pet_id, vaccine_name, vaccine_type, date_administered, next_due_date, vet_name, vaccination;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.body, pet_id = _a.pet_id, vaccine_name = _a.vaccine_name, vaccine_type = _a.vaccine_type, date_administered = _a.date_administered, next_due_date = _a.next_due_date, vet_name = _a.vet_name;
                        if (!pet_id || !vaccine_name || !date_administered)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.vaccination.create({
                                data: { pet_id: pet_id, owner_email: email, vaccine_name: vaccine_name, vaccine_type: vaccine_type || 'other', date_administered: date_administered, next_due_date: next_due_date || null, vet_name: vet_name || null }
                            })];
                    case 1:
                        vaccination = _b.sent();
                        return [2 /*return*/, reply.code(201).send({ data: vaccination })];
                }
            });
        }); });
        app.delete('/vaccinations/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.vaccination.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing || existing.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.vaccination.delete({ where: { id: req.params.id } })];
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
