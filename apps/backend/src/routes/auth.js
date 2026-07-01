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
var authRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Register
        app.post('/register', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, full_name, email, password, role, preferred_language, existing, password_hash, user, token, _b, _, userSafe;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.body, full_name = _a.full_name, email = _a.email, password = _a.password, role = _a.role, preferred_language = _a.preferred_language;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        existing = _c.sent();
                        if (existing)
                            return [2 /*return*/, reply.code(409).send({ message: 'Email ήδη χρησιμοποιείται' })];
                        return [4 /*yield*/, bcryptjs_1.default.hash(password, 12)];
                    case 2:
                        password_hash = _c.sent();
                        return [4 /*yield*/, prisma_js_1.default.user.create({
                                data: {
                                    full_name: full_name,
                                    email: email,
                                    password_hash: password_hash,
                                    role: role || 'user',
                                    preferred_language: preferred_language || 'el',
                                }
                            })];
                    case 3:
                        user = _c.sent();
                        token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });
                        _b = user, _ = _b.password_hash, userSafe = __rest(_b, ["password_hash"]);
                        return [2 /*return*/, { user: userSafe, token: token }];
                }
            });
        }); });
        // Login
        app.post('/login', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, email, password, user, valid, token, _b, _, userSafe;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.body, email = _a.email, password = _a.password;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _c.sent();
                        if (!user || !user.password_hash)
                            return [2 /*return*/, reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })];
                        return [4 /*yield*/, bcryptjs_1.default.compare(password, user.password_hash)];
                    case 2:
                        valid = _c.sent();
                        if (!valid)
                            return [2 /*return*/, reply.code(401).send({ message: 'Λανθασμένα στοιχεία' })];
                        token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });
                        _b = user, _ = _b.password_hash, userSafe = __rest(_b, ["password_hash"]);
                        return [2 /*return*/, { user: userSafe, token: token }];
                }
            });
        }); });
        // Me
        app.get('/me', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, user, _a, _, userSafe;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _b.sent();
                        if (!user)
                            return [2 /*return*/, null];
                        _a = user, _ = _a.password_hash, userSafe = __rest(_a, ["password_hash"]);
                        return [2 /*return*/, userSafe];
                }
            });
        }); });
        // Update me (PATCH /auth/me or PATCH /users/me - whichever your frontend uses)
        // The web store calls PATCH /users/me, but we'll also add PATCH /auth/me for safety
        app.patch('/me', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var id, allowedFields, updateData, _i, allowedFields_1, key, user, _a, _, userSafe;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = req.user.id;
                        allowedFields = ['full_name', 'bio', 'phone', 'city', 'country', 'website', 'profile_photo', 'preferred_language'];
                        updateData = {};
                        for (_i = 0, allowedFields_1 = allowedFields; _i < allowedFields_1.length; _i++) {
                            key = allowedFields_1[_i];
                            if (req.body[key] !== undefined)
                                updateData[key] = req.body[key];
                        }
                        if (Object.keys(updateData).length === 0) {
                            return [2 /*return*/, reply.code(400).send({ message: 'No fields to update' })];
                        }
                        return [4 /*yield*/, prisma_js_1.default.user.update({ where: { id: id }, data: updateData })];
                    case 1:
                        user = _b.sent();
                        _a = user, _ = _a.password_hash, userSafe = __rest(_a, ["password_hash"]);
                        return [2 /*return*/, userSafe];
                }
            });
        }); });
        // Refresh
        app.post('/refresh', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, id, email, role, token;
            return __generator(this, function (_b) {
                _a = req.user, id = _a.id, email = _a.email, role = _a.role;
                token = app.jwt.sign({ id: id, email: email, role: role }, { expiresIn: '7d' });
                return [2 /*return*/, { token: token }];
            });
        }); });
        // ─── GOOGLE OAUTH FOR MOBILE APPS ────────────────────────────────
        // Mobile app sends Google's access_token + user info from native OAuth flow
        // Backend verifies the token and creates/updates user, returns JWT
        app.post('/google/mobile', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, access_token, googleUserData, verifyRes, verifiedUser, googleLocale, supportedLangs, preferredLang, user, _b, _1, userSafe, token, err_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 8, , 9]);
                        _a = req.body, access_token = _a.access_token, googleUserData = _a.user;
                        if (!access_token || !(googleUserData === null || googleUserData === void 0 ? void 0 : googleUserData.email)) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν δεδομένα' })];
                        }
                        return [4 /*yield*/, fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                                headers: { Authorization: "Bearer ".concat(access_token) },
                            })];
                    case 1:
                        verifyRes = _c.sent();
                        if (!verifyRes.ok) {
                            return [2 /*return*/, reply.code(401).send({ message: 'Μη έγκυρο Google token' })];
                        }
                        return [4 /*yield*/, verifyRes.json()];
                    case 2:
                        verifiedUser = _c.sent();
                        // Make sure the email matches what client sent (prevent token swapping)
                        if (verifiedUser.email !== googleUserData.email) {
                            return [2 /*return*/, reply.code(401).send({ message: 'Email mismatch' })];
                        }
                        googleLocale = (verifiedUser.locale || googleUserData.locale || '').toLowerCase().split('-')[0];
                        supportedLangs = ['el', 'en', 'es', 'fr', 'zh'];
                        preferredLang = supportedLangs.includes(googleLocale) ? googleLocale : 'el';
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: verifiedUser.email } })];
                    case 3:
                        user = _c.sent();
                        if (!!user) return [3 /*break*/, 5];
                        return [4 /*yield*/, prisma_js_1.default.user.create({
                                data: {
                                    email: verifiedUser.email,
                                    full_name: verifiedUser.name || googleUserData.full_name,
                                    profile_photo: verifiedUser.picture || googleUserData.profile_photo,
                                    role: 'user',
                                    preferred_language: preferredLang,
                                }
                            })];
                    case 4:
                        user = _c.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        if (!(!user.profile_photo && (verifiedUser.picture || googleUserData.profile_photo))) return [3 /*break*/, 7];
                        return [4 /*yield*/, prisma_js_1.default.user.update({
                                where: { id: user.id },
                                data: { profile_photo: verifiedUser.picture || googleUserData.profile_photo }
                            })];
                    case 6:
                        user = _c.sent();
                        _c.label = 7;
                    case 7:
                        _b = user, _1 = _b.password_hash, userSafe = __rest(_b, ["password_hash"]);
                        token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });
                        return [2 /*return*/, { user: userSafe, token: token }];
                    case 8:
                        err_1 = _c.sent();
                        console.error('Google mobile OAuth error:', err_1);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα διακομιστή' })];
                    case 9: return [2 /*return*/];
                }
            });
        }); });
        // ─── GOOGLE OAUTH ───────────────────────────────────────────────
        app.get('/google', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var params;
            return __generator(this, function (_a) {
                params = new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID || '',
                    redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
                    response_type: 'code',
                    scope: 'openid email profile',
                    access_type: 'offline',
                    prompt: 'select_account',
                });
                reply.redirect("https://accounts.google.com/o/oauth2/v2/auth?".concat(params));
                return [2 /*return*/];
            });
        }); });
        app.get('/google/callback', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var APP_URL, _a, code, state, tokenRes, tokens, userRes, googleUser, googleLocale, supportedLangs, preferredLang, user, _b, _2, userSafe, token, err_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        APP_URL = process.env.APP_URL || 'https://globipet.com';
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 11, , 12]);
                        _a = req.query, code = _a.code, state = _a.state;
                        if (!code)
                            return [2 /*return*/, reply.redirect("".concat(APP_URL, "/login?error=no_code"))];
                        return [4 /*yield*/, fetch('https://oauth2.googleapis.com/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams({
                                    code: code,
                                    client_id: process.env.GOOGLE_CLIENT_ID || '',
                                    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                                    redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
                                    grant_type: 'authorization_code',
                                }),
                            })];
                    case 2:
                        tokenRes = _c.sent();
                        return [4 /*yield*/, tokenRes.json()];
                    case 3:
                        tokens = _c.sent();
                        if (!tokens.access_token)
                            return [2 /*return*/, reply.redirect("".concat(APP_URL, "/login?error=token_failed"))];
                        return [4 /*yield*/, fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                                headers: { Authorization: "Bearer ".concat(tokens.access_token) },
                            })];
                    case 4:
                        userRes = _c.sent();
                        return [4 /*yield*/, userRes.json()];
                    case 5:
                        googleUser = _c.sent();
                        googleLocale = (googleUser.locale || '').toLowerCase().split('-')[0];
                        supportedLangs = ['el', 'en', 'es', 'fr', 'zh'];
                        preferredLang = supportedLangs.includes(googleLocale) ? googleLocale : 'el';
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: googleUser.email } })];
                    case 6:
                        user = _c.sent();
                        if (!!user) return [3 /*break*/, 8];
                        return [4 /*yield*/, prisma_js_1.default.user.create({
                                data: {
                                    email: googleUser.email,
                                    full_name: googleUser.name,
                                    profile_photo: googleUser.picture,
                                    role: 'user',
                                    preferred_language: preferredLang,
                                }
                            })];
                    case 7:
                        user = _c.sent();
                        return [3 /*break*/, 10];
                    case 8:
                        if (!(!user.profile_photo && googleUser.picture)) return [3 /*break*/, 10];
                        return [4 /*yield*/, prisma_js_1.default.user.update({ where: { id: user.id }, data: { profile_photo: googleUser.picture } })];
                    case 9:
                        user = _c.sent();
                        _c.label = 10;
                    case 10:
                        _b = user, _2 = _b.password_hash, userSafe = __rest(_b, ["password_hash"]);
                        token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });
                        reply.redirect("".concat(APP_URL, "?token=").concat(token, "&user=").concat(encodeURIComponent(JSON.stringify(userSafe))));
                        return [3 /*break*/, 12];
                    case 11:
                        err_2 = _c.sent();
                        console.error('Google OAuth error:', err_2);
                        reply.redirect("".concat(APP_URL, "/login?error=google_failed"));
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        }); });
        // ─── FACEBOOK OAUTH ─────────────────────────────────────────────
        app.get('/facebook', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var params;
            return __generator(this, function (_a) {
                params = new URLSearchParams({
                    client_id: process.env.FACEBOOK_APP_ID || '',
                    redirect_uri: process.env.FACEBOOK_CALLBACK_URL || '',
                    scope: 'email,public_profile',
                    response_type: 'code',
                });
                reply.redirect("https://www.facebook.com/v18.0/dialog/oauth?".concat(params));
                return [2 /*return*/];
            });
        }); });
        app.get('/facebook/callback', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var APP_URL, code, tokenRes, tokens, userRes, fbUser, fbLocale, supportedLangs, preferredLang, user, _a, _3, userSafe, token, err_3;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        APP_URL = process.env.APP_URL || 'https://globipet.com';
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 9, , 10]);
                        code = req.query.code;
                        if (!code)
                            return [2 /*return*/, reply.redirect("".concat(APP_URL, "/login?error=no_code"))];
                        return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/oauth/access_token?client_id=".concat(process.env.FACEBOOK_APP_ID, "&redirect_uri=").concat(encodeURIComponent(process.env.FACEBOOK_CALLBACK_URL || ''), "&client_secret=").concat(process.env.FACEBOOK_APP_SECRET, "&code=").concat(code))];
                    case 2:
                        tokenRes = _d.sent();
                        return [4 /*yield*/, tokenRes.json()];
                    case 3:
                        tokens = _d.sent();
                        if (!tokens.access_token)
                            return [2 /*return*/, reply.redirect("".concat(APP_URL, "/login?error=fb_token_failed"))];
                        return [4 /*yield*/, fetch("https://graph.facebook.com/me?fields=id,name,email,picture,locale&access_token=".concat(tokens.access_token))];
                    case 4:
                        userRes = _d.sent();
                        return [4 /*yield*/, userRes.json()];
                    case 5:
                        fbUser = _d.sent();
                        if (!fbUser.email)
                            return [2 /*return*/, reply.redirect("".concat(APP_URL, "/login?error=fb_no_email"))
                                // Try to read preferred language from Facebook profile (locale field, e.g. "el_GR")
                            ];
                        fbLocale = (fbUser.locale || '').toLowerCase().split('_')[0];
                        supportedLangs = ['el', 'en', 'es', 'fr', 'zh'];
                        preferredLang = supportedLangs.includes(fbLocale) ? fbLocale : 'el';
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: fbUser.email } })];
                    case 6:
                        user = _d.sent();
                        if (!!user) return [3 /*break*/, 8];
                        return [4 /*yield*/, prisma_js_1.default.user.create({
                                data: {
                                    email: fbUser.email,
                                    full_name: fbUser.name,
                                    profile_photo: (_c = (_b = fbUser.picture) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.url,
                                    role: 'user',
                                    preferred_language: preferredLang,
                                }
                            })];
                    case 7:
                        user = _d.sent();
                        _d.label = 8;
                    case 8:
                        _a = user, _3 = _a.password_hash, userSafe = __rest(_a, ["password_hash"]);
                        token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });
                        reply.redirect("".concat(APP_URL, "?token=").concat(token, "&user=").concat(encodeURIComponent(JSON.stringify(userSafe))));
                        return [3 /*break*/, 10];
                    case 9:
                        err_3 = _d.sent();
                        console.error('Facebook OAuth error:', err_3);
                        reply.redirect("".concat(APP_URL, "/login?error=facebook_failed"));
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        }); });
        // Forgot password
        app.post('/forgot-password', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, user, token, expires, RESEND_KEY, APP_URL, resetUrl, lang, emailContent, c;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.body.email;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, { message: 'Αν το email υπάρχει, θα λάβετε οδηγίες.' }];
                        token = Math.random().toString(36).slice(2) + Date.now().toString(36);
                        expires = new Date(Date.now() + 3600000) // 1 hour
                        ;
                        return [4 /*yield*/, prisma_js_1.default.user.update({
                                where: { id: user.id },
                                data: { reset_token: token, reset_token_expires: expires }
                            })];
                    case 2:
                        _a.sent();
                        RESEND_KEY = process.env.RESEND_API_KEY;
                        APP_URL = process.env.APP_URL || 'https://globipet.com';
                        resetUrl = "".concat(APP_URL, "/reset-password?token=").concat(token);
                        lang = user.preferred_language || 'el';
                        emailContent = {
                            el: {
                                subject: 'Επαναφορά κωδικού GlobiPet',
                                title: 'Επαναφορά κωδικού',
                                body: 'Κάντε κλικ στον παρακάτω σύνδεσμο για να αλλάξετε τον κωδικό σας:',
                                cta: 'Αλλαγή κωδικού',
                                expiry: 'Ο σύνδεσμος λήγει σε 1 ώρα. Αν δεν ζητήσατε αλλαγή κωδικού, αγνοήστε αυτό το email.',
                            },
                            en: {
                                subject: 'GlobiPet Password Reset',
                                title: 'Password Reset',
                                body: 'Click the link below to reset your password:',
                                cta: 'Reset Password',
                                expiry: 'This link expires in 1 hour. If you did not request a password reset, please ignore this email.',
                            },
                            es: {
                                subject: 'Restablecer contraseña GlobiPet',
                                title: 'Restablecer contraseña',
                                body: 'Haz clic en el siguiente enlace para restablecer tu contraseña:',
                                cta: 'Restablecer contraseña',
                                expiry: 'Este enlace expira en 1 hora. Si no solicitaste el cambio, ignora este email.',
                            },
                            fr: {
                                subject: 'Réinitialisation du mot de passe GlobiPet',
                                title: 'Réinitialiser le mot de passe',
                                body: 'Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:',
                                cta: 'Réinitialiser',
                                expiry: 'Ce lien expire dans 1 heure. Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.',
                            },
                            zh: {
                                subject: 'GlobiPet 密码重置',
                                title: '重置密码',
                                body: '点击下方链接重置您的密码:',
                                cta: '重置密码',
                                expiry: '此链接1小时后过期。如果您未请求重置密码,请忽略此邮件。',
                            },
                        };
                        c = emailContent[lang] || emailContent.el;
                        if (!RESEND_KEY) return [3 /*break*/, 4];
                        return [4 /*yield*/, fetch('https://api.resend.com/emails', {
                                method: 'POST',
                                headers: { 'Authorization': "Bearer ".concat(RESEND_KEY), 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    from: 'GlobiPet <noreply@globipet.com>',
                                    to: email,
                                    subject: c.subject,
                                    html: "\n            <div style=\"font-family:sans-serif;max-width:600px;margin:0 auto\">\n              <img src=\"".concat(APP_URL, "/logo.png\" alt=\"GlobiPet\" style=\"height:50px;margin-bottom:20px\"/>\n              <h2>").concat(c.title, "</h2>\n              <p>").concat(c.body, "</p>\n              <a href=\"").concat(resetUrl, "\" style=\"display:inline-block;background:#E65100;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0\">").concat(c.cta, "</a>\n              <p style=\"color:#666;font-size:14px\">").concat(c.expiry, "</p>\n            </div>\n          ")
                                })
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, { message: 'Αν το email υπάρχει, θα λάβετε οδηγίες.' }];
                }
            });
        }); });
        // Reset password
        app.post('/reset-password', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, token, password, user, bcrypt, password_hash;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, token = _a.token, password = _a.password;
                        return [4 /*yield*/, prisma_js_1.default.user.findFirst({
                                where: { reset_token: token, reset_token_expires: { gt: new Date() } }
                            })];
                    case 1:
                        user = _b.sent();
                        if (!user)
                            return [2 /*return*/, reply.code(400).send({ message: 'Μη έγκυρος ή ληγμένος σύνδεσμος' })];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('bcryptjs'); })];
                    case 2:
                        bcrypt = _b.sent();
                        return [4 /*yield*/, bcrypt.hash(password, 12)];
                    case 3:
                        password_hash = _b.sent();
                        return [4 /*yield*/, prisma_js_1.default.user.update({
                                where: { id: user.id },
                                data: { password_hash: password_hash, reset_token: null, reset_token_expires: null }
                            })];
                    case 4:
                        _b.sent();
                        return [2 /*return*/, { message: 'Ο κωδικός άλλαξε επιτυχώς' }];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = authRoutes;
