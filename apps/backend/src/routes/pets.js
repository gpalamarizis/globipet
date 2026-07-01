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
var routes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        app.get('/my', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.pet.findMany({
                                where: { owner_email: email },
                                orderBy: { created_at: 'desc' },
                            })];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, { data: data }];
                }
            });
        }); });
        app.get('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, pet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.pet.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        pet = _a.sent();
                        if (!pet)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (pet.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, pet];
                }
            });
        }); });
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, name, species, breed, age, weight, gender, color, microchip_number, image_url, pet;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.body, name = _a.name, species = _a.species, breed = _a.breed, age = _a.age, weight = _a.weight, gender = _a.gender, color = _a.color, microchip_number = _a.microchip_number, image_url = _a.image_url;
                        if (!name || !species)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.pet.create({
                                data: {
                                    owner_email: email,
                                    name: name,
                                    species: species,
                                    breed: breed || null,
                                    age: age ? parseFloat(age) : null,
                                    weight: weight ? parseFloat(weight) : null,
                                    gender: gender || null,
                                    color: color || null,
                                    microchip_number: microchip_number || null,
                                    image_url: image_url || null,
                                }
                            })];
                    case 1:
                        pet = _b.sent();
                        return [2 /*return*/, reply.code(201).send({ data: pet })];
                }
            });
        }); });
        app.patch('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing, _a, name, species, breed, age, weight, gender, color, microchip_number, image_url, is_lost, last_seen_location, data, pet;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.pet.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _b.sent();
                        if (!existing)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (existing.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        _a = req.body, name = _a.name, species = _a.species, breed = _a.breed, age = _a.age, weight = _a.weight, gender = _a.gender, color = _a.color, microchip_number = _a.microchip_number, image_url = _a.image_url, is_lost = _a.is_lost, last_seen_location = _a.last_seen_location;
                        data = {};
                        if (name !== undefined)
                            data.name = name;
                        if (species !== undefined)
                            data.species = species;
                        if (breed !== undefined)
                            data.breed = breed;
                        if (age !== undefined)
                            data.age = age ? parseFloat(age) : null;
                        if (weight !== undefined)
                            data.weight = weight ? parseFloat(weight) : null;
                        if (gender !== undefined)
                            data.gender = gender;
                        if (color !== undefined)
                            data.color = color;
                        if (microchip_number !== undefined)
                            data.microchip_number = microchip_number;
                        if (image_url !== undefined)
                            data.image_url = image_url;
                        if (is_lost !== undefined)
                            data.is_lost = !!is_lost;
                        if (last_seen_location !== undefined)
                            data.last_seen_location = last_seen_location;
                        return [4 /*yield*/, prisma_js_1.default.pet.update({ where: { id: req.params.id }, data: data })];
                    case 2:
                        pet = _b.sent();
                        return [2 /*return*/, { data: pet }];
                }
            });
        }); });
        app.delete('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.pet.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (existing.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.pet.delete({ where: { id: req.params.id } })];
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
