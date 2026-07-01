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
    // ─── HELPERS ──────────────────────────────────────────────────────
    function assertPetOwner(petId, email) {
        return __awaiter(this, void 0, void 0, function () {
            var pet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.pet.findUnique({ where: { id: petId } })];
                    case 1:
                        pet = _a.sent();
                        if (!pet)
                            throw { statusCode: 404, message: 'Κατοικίδιο δεν βρέθηκε' };
                        if (pet.owner_email !== email)
                            throw { statusCode: 403, message: 'Δεν έχετε δικαίωμα' };
                        return [2 /*return*/, pet];
                }
            });
        });
    }
    return __generator(this, function (_a) {
        // ─── GET FULL PASSPORT ────────────────────────────────────────────
        app.get('/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, petId, pet, hasAccess, _a, _b, vaccinations, healthRecords, pedigree, travelDocs, medications, labResults, imaging, surgeries, allergies, chronicConditions, dentalRecords, weightRecords, geneticTests, vitalSigns, accessList;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        petId = req.params.petId;
                        return [4 /*yield*/, prisma_js_1.default.pet.findUnique({ where: { id: petId } })];
                    case 1:
                        pet = _c.sent();
                        if (!pet)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })
                                // Owner or approved vet can view
                            ];
                        _a = pet.owner_email === email;
                        if (_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma_js_1.default.petPassportAccess.findFirst({ where: { pet_id: petId, provider_email: email, status: 'approved' } })];
                    case 2:
                        _a = (_c.sent());
                        _c.label = 3;
                    case 3:
                        hasAccess = _a;
                        if (!hasAccess)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, Promise.all([
                                prisma_js_1.default.vaccination.findMany({ where: { pet_id: petId }, orderBy: { date_administered: 'desc' } }),
                                prisma_js_1.default.healthRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petPedigree.findUnique({ where: { pet_id: petId } }),
                                prisma_js_1.default.petTravelDocument.findMany({ where: { pet_id: petId }, orderBy: { departure_date: 'desc' } }),
                                prisma_js_1.default.petMedication.findMany({ where: { pet_id: petId }, orderBy: { start_date: 'desc' } }),
                                prisma_js_1.default.petLabResult.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petImaging.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petSurgery.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petAllergy.findMany({ where: { pet_id: petId }, orderBy: { created_at: 'desc' } }),
                                prisma_js_1.default.petChronicCondition.findMany({ where: { pet_id: petId }, orderBy: { diagnosed_date: 'desc' } }),
                                prisma_js_1.default.petDentalRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petWeightRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'asc' } }),
                                prisma_js_1.default.petGeneticTest.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petVitalSigns.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                pet.owner_email === email ? prisma_js_1.default.petPassportAccess.findMany({ where: { pet_id: petId } }) : [],
                            ])];
                    case 4:
                        _b = _c.sent(), vaccinations = _b[0], healthRecords = _b[1], pedigree = _b[2], travelDocs = _b[3], medications = _b[4], labResults = _b[5], imaging = _b[6], surgeries = _b[7], allergies = _b[8], chronicConditions = _b[9], dentalRecords = _b[10], weightRecords = _b[11], geneticTests = _b[12], vitalSigns = _b[13], accessList = _b[14];
                        return [2 /*return*/, {
                                pet: pet,
                                vaccinations: vaccinations,
                                healthRecords: healthRecords,
                                pedigree: pedigree,
                                travelDocs: travelDocs,
                                medications: medications,
                                labResults: labResults,
                                imaging: imaging,
                                surgeries: surgeries,
                                allergies: allergies,
                                chronicConditions: chronicConditions,
                                dentalRecords: dentalRecords,
                                weightRecords: weightRecords,
                                geneticTests: geneticTests,
                                vitalSigns: vitalSigns,
                                accessList: accessList,
                            }];
                }
            });
        }); });
        // ─── PDF EXPORT ──────────────────────────────────────────────────
        app.get('/:petId/pdf', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, petId, pet, hasAccess, _a, _b, vaccinations, healthRecords, medications, labResults, imaging, surgeries, allergies, chronicConditions, dentalRecords, weightRecords, section, row, html;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        petId = req.params.petId;
                        return [4 /*yield*/, prisma_js_1.default.pet.findUnique({ where: { id: petId } })];
                    case 1:
                        pet = _c.sent();
                        if (!pet)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        _a = pet.owner_email === email;
                        if (_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma_js_1.default.petPassportAccess.findFirst({ where: { pet_id: petId, provider_email: email, status: 'approved' } })];
                    case 2:
                        _a = (_c.sent());
                        _c.label = 3;
                    case 3:
                        hasAccess = _a;
                        if (!hasAccess)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, Promise.all([
                                prisma_js_1.default.vaccination.findMany({ where: { pet_id: petId }, orderBy: { date_administered: 'desc' } }),
                                prisma_js_1.default.healthRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petMedication.findMany({ where: { pet_id: petId }, orderBy: { start_date: 'desc' } }),
                                prisma_js_1.default.petLabResult.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petImaging.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petSurgery.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petAllergy.findMany({ where: { pet_id: petId } }),
                                prisma_js_1.default.petChronicCondition.findMany({ where: { pet_id: petId } }),
                                prisma_js_1.default.petDentalRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'desc' } }),
                                prisma_js_1.default.petWeightRecord.findMany({ where: { pet_id: petId }, orderBy: { date: 'asc' } }),
                            ])];
                    case 4:
                        _b = _c.sent(), vaccinations = _b[0], healthRecords = _b[1], medications = _b[2], labResults = _b[3], imaging = _b[4], surgeries = _b[5], allergies = _b[6], chronicConditions = _b[7], dentalRecords = _b[8], weightRecords = _b[9];
                        section = function (title, rows) { return rows ? "<h2>".concat(title, "</h2><table>").concat(rows, "</table>") : ''; };
                        row = function (label, val) { return val ? "<tr><td>".concat(label, "</td><td>").concat(val, "</td></tr>") : ''; };
                        html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>\u0399\u03B1\u03C4\u03C1\u03B9\u03BA\u03CC\u03C2 \u03A6\u03AC\u03BA\u03B5\u03BB\u03BF\u03C2 - ".concat(pet.name, "</title>\n<style>\n  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;max-width:900px;margin:0 auto}\n  h1{color:#E65100;border-bottom:3px solid #E65100;padding-bottom:8px;margin-bottom:16px}\n  h2{color:#333;border-left:4px solid #E65100;padding-left:8px;margin-top:24px;margin-bottom:8px;font-size:14px;text-transform:uppercase;letter-spacing:1px}\n  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}\n  th{background:#E65100;color:white;padding:6px 8px;text-align:left}\n  td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top}\n  tr:nth-child(even){background:#fafafa}\n  .header{display:flex;justify-content:space-between;align-items:start;margin-bottom:24px}\n  .pet-info{font-size:13px;line-height:1.8}\n  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold}\n  .badge-red{background:#fee2e2;color:#dc2626}\n  .badge-yellow{background:#fef9c3;color:#ca8a04}\n  .badge-green{background:#dcfce7;color:#16a34a}\n  .footer{margin-top:40px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px;text-align:center}\n  @media print{body{padding:0} @page{margin:1.5cm}}\n</style></head><body>\n<div class=\"header\">\n  <div>\n    <h1>\uD83D\uDC3E \u0399\u03B1\u03C4\u03C1\u03B9\u03BA\u03CC\u03C2 \u03A6\u03AC\u03BA\u03B5\u03BB\u03BF\u03C2</h1>\n    <div class=\"pet-info\">\n      <strong>").concat(pet.name, "</strong> &nbsp;|&nbsp; ").concat(pet.species || '', " ").concat(pet.breed || '', "<br>\n      \u0393\u03AD\u03BD\u03BD\u03B7\u03C3\u03B7: ").concat(pet.birthday || 'Άγνωστη', " &nbsp;|&nbsp; \u03A6\u03CD\u03BB\u03BF: ").concat(pet.gender || '-', "<br>\n      \u0391\u03C1. \u039C\u03B9\u03BA\u03C1\u03BF\u03C4\u03C3\u03AF\u03C0: ").concat(pet.microchip || '-', "<br>\n      \u0399\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7\u03C2: ").concat(email, "\n    </div>\n  </div>\n  <div style=\"text-align:right;font-size:10px;color:#999\">\n    \u0395\u03BA\u03C4\u03C5\u03C0\u03CE\u03B8\u03B7\u03BA\u03B5: ").concat(new Date().toLocaleDateString('el-GR'), "<br>\n    GlobiPet \u00B7 globipet.com\n  </div>\n</div>\n\n").concat(allergies.length ? "<div style=\"background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:10px;margin-bottom:16px\">\n  <strong>\u26A0\uFE0F \u0391\u039B\u039B\u0395\u03A1\u0393\u0399\u0395\u03A3:</strong> ".concat(allergies.map(function (a) { return "".concat(a.allergen, " (").concat(a.severity, ")"); }).join(', '), "\n</div>") : '', "\n\n").concat(chronicConditions.length ? "<div style=\"background:#fef9c3;border:2px solid #ca8a04;border-radius:8px;padding:10px;margin-bottom:16px\">\n  <strong>\uD83D\uDCCB \u03A7\u03A1\u039F\u039D\u0399\u0395\u03A3 \u03A0\u0391\u0398\u0397\u03A3\u0395\u0399\u03A3:</strong> ".concat(chronicConditions.filter(function (c) { return c.status === 'active'; }).map(function (c) { return c.condition; }).join(', '), "\n</div>") : '', "\n\n").concat(section('Εμβόλια', vaccinations.map(function (v) { return "<tr>\n  <td>".concat(v.date_administered, "</td><td>").concat(v.vaccine_name, "</td><td>").concat(v.vaccine_type, "</td>\n  <td>").concat(v.vet_name || '-', "</td><td>").concat(v.next_due_date || '-', "</td>\n</tr>"); }).join('')), "\n\n").concat(section('Φάρμακα', medications.map(function (m) { return "<tr>\n  <td>".concat(m.name, " ").concat(m.dosage, "</td><td>").concat(m.frequency, "</td><td>").concat(m.start_date, "\u2192").concat(m.end_date || 'τώρα', "</td>\n  <td>").concat(m.prescribed_by || '-', "</td><td>").concat(m.is_active ? '✅ Ενεργό' : '⬛ Ολοκλήρωσε', "</td>\n</tr>"); }).join('')), "\n\n").concat(section('Εξετάσεις', healthRecords.map(function (h) {
                            var _a;
                            return "<tr>\n  <td>".concat(h.date, "</td><td>").concat(h.title, "</td><td>").concat(h.vet_name || '-', "</td>\n  <td>").concat(h.clinic_name || '-', "</td><td>").concat(((_a = h.description) === null || _a === void 0 ? void 0 : _a.slice(0, 100)) || '-', "</td>\n</tr>");
                        }).join('')), "\n\n").concat(section('Εργαστηριακές Εξετάσεις', labResults.map(function (l) { return "<tr>\n  <td>".concat(l.date, "</td><td>").concat(l.title, "</td><td>").concat(l.result_type, "</td>\n  <td>").concat(l.vet_name || '-', "</td><td>").concat(l.is_abnormal ? '⚠️ Παθολογικά' : '✅ Φυσιολογικά', "</td>\n</tr>"); }).join('')), "\n\n").concat(section('Απεικονιστικές Εξετάσεις', imaging.map(function (i) {
                            var _a;
                            return "<tr>\n  <td>".concat(i.date, "</td><td>").concat(i.imaging_type.toUpperCase(), "</td><td>").concat(i.body_region || '-', "</td>\n  <td>").concat(i.vet_name || '-', "</td><td>").concat(((_a = i.findings) === null || _a === void 0 ? void 0 : _a.slice(0, 100)) || '-', "</td>\n</tr>");
                        }).join('')), "\n\n").concat(section('Χειρουργεία', surgeries.map(function (s) { return "<tr>\n  <td>".concat(s.date, "</td><td>").concat(s.procedure, "</td><td>").concat(s.surgeon_name || '-', "</td>\n  <td>").concat(s.clinic_name || '-', "</td><td>").concat(s.outcome || '-', "</td>\n</tr>"); }).join('')), "\n\n").concat(section('Οδοντιατρικά', dentalRecords.map(function (d) { return "<tr>\n  <td>".concat(d.date, "</td><td>").concat(d.procedure, "</td><td>").concat(d.vet_name || '-', "</td>\n  <td>").concat(d.findings || '-', "</td><td>").concat(d.next_due || '-', "</td>\n</tr>"); }).join('')), "\n\n").concat(section('Ιστορικό Βάρους', weightRecords.map(function (w) { return "<tr>\n  <td>".concat(w.date, "</td><td>").concat(w.weight_kg, " kg</td><td>BCS: ").concat(w.bcs || '-', "/9</td><td>").concat(w.notes || '-', "</td>\n</tr>"); }).join('')), "\n\n<div class=\"footer\">\n  \u0391\u03C5\u03C4\u03CC \u03C4\u03BF \u03AD\u03B3\u03B3\u03C1\u03B1\u03C6\u03BF \u03B4\u03B7\u03BC\u03B9\u03BF\u03C5\u03C1\u03B3\u03AE\u03B8\u03B7\u03BA\u03B5 \u03B1\u03C5\u03C4\u03CC\u03BC\u03B1\u03C4\u03B1 \u03B1\u03C0\u03CC \u03C4\u03BF GlobiPet (globipet.com).<br>\n  \u0393\u03B9\u03B1 \u03B5\u03C0\u03B1\u03BB\u03AE\u03B8\u03B5\u03C5\u03C3\u03B7 \u03B5\u03C0\u03B9\u03BA\u03BF\u03B9\u03BD\u03C9\u03BD\u03AE\u03C3\u03C4\u03B5 \u03BC\u03B5 \u03C4\u03BF\u03BD \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7 \u03C4\u03BF\u03C5 \u03B6\u03CE\u03BF\u03C5.\n</div>\n</body></html>");
                        reply.header('Content-Type', 'text/html; charset=utf-8');
                        return [2 /*return*/, reply.send(html)];
                }
            });
        }); });
        // ─── VACCINATIONS ────────────────────────────────────────────────
        app.post('/vaccination/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, vaccine_name, vaccine_type, date_administered, next_due_date, vet_name, clinic_name, batch_number, notes, vac;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _b.sent();
                        _a = req.body, vaccine_name = _a.vaccine_name, vaccine_type = _a.vaccine_type, date_administered = _a.date_administered, next_due_date = _a.next_due_date, vet_name = _a.vet_name, clinic_name = _a.clinic_name, batch_number = _a.batch_number, notes = _a.notes;
                        if (!vaccine_name || !date_administered)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.vaccination.create({
                                data: { pet_id: req.params.petId, owner_email: email, vaccine_name: vaccine_name, vaccine_type: vaccine_type || 'other', date_administered: date_administered, next_due_date: next_due_date, vet_name: vet_name, notes: notes }
                            })];
                    case 2:
                        vac = _b.sent();
                        return [2 /*return*/, reply.code(201).send(vac)];
                }
            });
        }); });
        app.patch('/vaccination/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
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
                        return [2 /*return*/, prisma_js_1.default.vaccination.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/vaccination/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
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
        // ─── HEALTH RECORDS ──────────────────────────────────────────────
        app.post('/health/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, record_type, title, description, date, vet_name, clinic_name, cost, next_appointment, record;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _b.sent();
                        _a = req.body, record_type = _a.record_type, title = _a.title, description = _a.description, date = _a.date, vet_name = _a.vet_name, clinic_name = _a.clinic_name, cost = _a.cost, next_appointment = _a.next_appointment;
                        if (!title || !date)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.healthRecord.create({
                                data: { pet_id: req.params.petId, owner_email: email, record_type: record_type || 'examination', title: title, description: description || '', date: date, vet_name: vet_name, clinic_name: clinic_name, cost: cost, next_appointment: next_appointment, attachments: [] }
                            })];
                    case 2:
                        record = _b.sent();
                        return [2 /*return*/, reply.code(201).send(record)];
                }
            });
        }); });
        app.patch('/health/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
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
                        return [2 /*return*/, prisma_js_1.default.healthRecord.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/health/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
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
        // ─── PEDIGREE ────────────────────────────────────────────────────
        app.put('/pedigree/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _a.sent();
                        data = req.body;
                        return [2 /*return*/, prisma_js_1.default.petPedigree.upsert({
                                where: { pet_id: req.params.petId },
                                create: __assign(__assign({ pet_id: req.params.petId, owner_email: email }, data), { certifications: data.certifications || [] }),
                                update: __assign(__assign({}, data), { certifications: data.certifications || [] }),
                            })];
                }
            });
        }); });
        // ─── TRAVEL ──────────────────────────────────────────────────────
        app.post('/travel/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, travel_type, origin_city, destination_city, destination_country, departure_date, return_date, carrier, booking_ref, notes, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _d.sent();
                        _a = req.body, travel_type = _a.travel_type, origin_city = _a.origin_city, destination_city = _a.destination_city, destination_country = _a.destination_country, departure_date = _a.departure_date, return_date = _a.return_date, carrier = _a.carrier, booking_ref = _a.booking_ref, notes = _a.notes;
                        if (!travel_type || !destination_city || !departure_date)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        _c = (_b = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petTravelDocument.create({
                                data: { pet_id: req.params.petId, owner_email: email, travel_type: travel_type, origin_city: origin_city, destination_city: destination_city, destination_country: destination_country, departure_date: departure_date, return_date: return_date, carrier: carrier, booking_ref: booking_ref, notes: notes }
                            })];
                    case 2: return [2 /*return*/, _c.apply(_b, [_d.sent()])];
                }
            });
        }); });
        app.delete('/travel/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petTravelDocument.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        doc = _a.sent();
                        if (!doc || doc.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petTravelDocument.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── MEDICATIONS ─────────────────────────────────────────────────
        app.post('/medication/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petMedication.create({ data: __assign({ pet_id: req.params.petId, owner_email: email }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.patch('/medication/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petMedication.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, prisma_js_1.default.petMedication.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/medication/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petMedication.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petMedication.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── LAB RESULTS ─────────────────────────────────────────────────
        app.post('/lab/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petLabResult.create({ data: __assign({ pet_id: req.params.petId, owner_email: email, file_urls: [] }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.patch('/lab/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petLabResult.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, prisma_js_1.default.petLabResult.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/lab/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petLabResult.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petLabResult.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── IMAGING ─────────────────────────────────────────────────────
        app.post('/imaging/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petImaging.create({ data: __assign({ pet_id: req.params.petId, owner_email: email, file_urls: [] }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.patch('/imaging/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petImaging.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, prisma_js_1.default.petImaging.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/imaging/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petImaging.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petImaging.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── SURGERIES ───────────────────────────────────────────────────
        app.post('/surgery/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petSurgery.create({ data: __assign({ pet_id: req.params.petId, owner_email: email, file_urls: [] }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.patch('/surgery/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petSurgery.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, prisma_js_1.default.petSurgery.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/surgery/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petSurgery.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petSurgery.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── ALLERGIES ───────────────────────────────────────────────────
        app.post('/allergy/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petAllergy.create({ data: __assign({ pet_id: req.params.petId, owner_email: email }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.delete('/allergy/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petAllergy.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petAllergy.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── CHRONIC CONDITIONS ──────────────────────────────────────────
        app.post('/chronic/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petChronicCondition.create({ data: __assign({ pet_id: req.params.petId, owner_email: email }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.patch('/chronic/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petChronicCondition.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, prisma_js_1.default.petChronicCondition.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/chronic/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petChronicCondition.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petChronicCondition.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── DENTAL ──────────────────────────────────────────────────────
        app.post('/dental/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petDentalRecord.create({ data: __assign({ pet_id: req.params.petId, owner_email: email, file_urls: [] }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.delete('/dental/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petDentalRecord.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petDentalRecord.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── WEIGHT ──────────────────────────────────────────────────────
        app.post('/weight/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petWeightRecord.create({ data: __assign({ pet_id: req.params.petId, owner_email: email }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.delete('/weight/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petWeightRecord.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petWeightRecord.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── GENETIC TESTS ───────────────────────────────────────────────
        app.post('/genetic/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petGeneticTest.create({ data: __assign({ pet_id: req.params.petId, owner_email: email, breeds_detected: [], conditions_found: [], file_urls: [] }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.delete('/genetic/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petGeneticTest.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petGeneticTest.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── VITAL SIGNS ─────────────────────────────────────────────────
        app.post('/vitals/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _c.sent();
                        _b = (_a = reply.code(201)).send;
                        return [4 /*yield*/, prisma_js_1.default.petVitalSigns.create({ data: __assign({ pet_id: req.params.petId, owner_email: email }, req.body) })];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        }); });
        app.delete('/vitals/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petVitalSigns.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petVitalSigns.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // ─── ACCESS MANAGEMENT ───────────────────────────────────────────
        app.get('/access/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, prisma_js_1.default.petPassportAccess.findMany({ where: { pet_id: req.params.petId }, orderBy: { created_at: 'desc' } })];
                    case 2:
                        list = _a.sent();
                        return [2 /*return*/, reply.send({ data: list })];
                }
            });
        }); });
        app.post('/access/:petId', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, provider_email, provider_name, reason, expires_at, access;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, assertPetOwner(req.params.petId, email).catch(function (e) { throw { statusCode: e.statusCode, message: e.message }; })];
                    case 1:
                        _b.sent();
                        _a = req.body, provider_email = _a.provider_email, provider_name = _a.provider_name, reason = _a.reason, expires_at = _a.expires_at;
                        if (!provider_email)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπει το email παρόχου' })];
                        return [4 /*yield*/, prisma_js_1.default.petPassportAccess.upsert({
                                where: { pet_id_provider_email: { pet_id: req.params.petId, provider_email: provider_email } },
                                create: { pet_id: req.params.petId, owner_email: email, provider_email: provider_email, provider_name: provider_name || provider_email, reason: reason, status: 'approved', granted_at: new Date(), expires_at: expires_at ? new Date(expires_at) : null },
                                update: { status: 'approved', granted_at: new Date(), reason: reason, expires_at: expires_at ? new Date(expires_at) : null },
                            })];
                    case 2:
                        access = _b.sent();
                        return [2 /*return*/, reply.code(201).send(access)];
                }
            });
        }); });
        app.delete('/access/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petPassportAccess.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        r = _a.sent();
                        if (!r || r.owner_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.petPassportAccess.update({ where: { id: req.params.id }, data: { status: 'revoked' } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // Provider: see which pets I have approved access to
        app.get('/my-patients', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, accesses, petIds, pets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.petPassportAccess.findMany({
                                where: { provider_email: email, status: 'approved' },
                                orderBy: { granted_at: 'desc' },
                            })];
                    case 1:
                        accesses = _a.sent();
                        if (!accesses.length)
                            return [2 /*return*/, reply.send({ data: [] })];
                        petIds = accesses.map(function (a) { return a.pet_id; });
                        return [4 /*yield*/, prisma_js_1.default.pet.findMany({ where: { id: { in: petIds } } })];
                    case 2:
                        pets = _a.sent();
                        return [2 /*return*/, reply.send({ data: pets.map(function (p) { return (__assign(__assign({}, p), { access: accesses.find(function (a) { return a.pet_id === p.id; }) })); }) })];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = routes;
