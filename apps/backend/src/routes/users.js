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
var bcryptjs_1 = require("bcryptjs");
var prisma_js_1 = require("../lib/prisma.js");
var usersRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        app.get('/me', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, user, _a, _, safe;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _b.sent();
                        _a = user, _ = _a.password_hash, safe = __rest(_a, ["password_hash"]);
                        return [2 /*return*/, safe];
                }
            });
        }); });
        app.put('/me', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, full_name, bio, phone, city, country, website, user, _b, _, safe;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.body, full_name = _a.full_name, bio = _a.bio, phone = _a.phone, city = _a.city, country = _a.country, website = _a.website;
                        return [4 /*yield*/, prisma_js_1.default.user.update({ where: { email: email }, data: { full_name: full_name, bio: bio, phone: phone, city: city, country: country, website: website } })];
                    case 1:
                        user = _c.sent();
                        _b = user, _ = _b.password_hash, safe = __rest(_b, ["password_hash"]);
                        return [2 /*return*/, safe];
                }
            });
        }); });
        // PATCH /users/me - update profile fields including preferred_language
        app.patch('/me', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, allowedFields, updateData, _i, allowedFields_1, key, user, _a, _, safe;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        allowedFields = ['full_name', 'bio', 'phone', 'city', 'country', 'website', 'profile_photo', 'preferred_language'];
                        updateData = {};
                        for (_i = 0, allowedFields_1 = allowedFields; _i < allowedFields_1.length; _i++) {
                            key = allowedFields_1[_i];
                            if (req.body[key] !== undefined)
                                updateData[key] = req.body[key];
                        }
                        if (Object.keys(updateData).length === 0) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Δεν υπάρχουν πεδία για ενημέρωση' })];
                        }
                        return [4 /*yield*/, prisma_js_1.default.user.update({ where: { email: email }, data: updateData })];
                    case 1:
                        user = _b.sent();
                        _a = user, _ = _a.password_hash, safe = __rest(_a, ["password_hash"]);
                        return [2 /*return*/, safe];
                }
            });
        }); });
        // POST /users/me/password - user changes their own password
        app.post('/me/password', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, current_password, new_password, user, valid, same, password_hash;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.body, current_password = _a.current_password, new_password = _a.new_password;
                        if (!current_password || !new_password) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Τρέχων και νέος κωδικός είναι υποχρεωτικοί' })];
                        }
                        if (new_password.length < 6) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' })];
                        }
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _b.sent();
                        if (!user || !user.password_hash) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Δεν είναι δυνατή η αλλαγή κωδικού για αυτόν τον χρήστη (πιθανώς συνδέθηκε με Google/Facebook)' })];
                        }
                        return [4 /*yield*/, bcryptjs_1.default.compare(current_password, user.password_hash)];
                    case 2:
                        valid = _b.sent();
                        if (!valid) {
                            return [2 /*return*/, reply.code(401).send({ message: 'Λανθασμένος τρέχων κωδικός' })];
                        }
                        return [4 /*yield*/, bcryptjs_1.default.compare(new_password, user.password_hash)];
                    case 3:
                        same = _b.sent();
                        if (same) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Ο νέος κωδικός είναι ίδιος με τον τρέχοντα' })];
                        }
                        return [4 /*yield*/, bcryptjs_1.default.hash(new_password, 12)];
                    case 4:
                        password_hash = _b.sent();
                        return [4 /*yield*/, prisma_js_1.default.user.update({ where: { email: email }, data: { password_hash: password_hash } })];
                    case 5:
                        _b.sent();
                        return [2 /*return*/, { message: 'Ο κωδικός άλλαξε επιτυχώς' }];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = usersRoutes;
