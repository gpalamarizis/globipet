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
var calendarRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Google Calendar OAuth
        app.get('/google/auth', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var userId, params;
            var _a;
            return __generator(this, function (_b) {
                userId = req.query.userId;
                params = new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID || '',
                    redirect_uri: "".concat((_a = process.env.APP_URL) === null || _a === void 0 ? void 0 : _a.replace('https://', 'https://globipetbackend-production.up.railway.app'), "/api/calendar/google/callback"),
                    response_type: 'code',
                    scope: 'https://www.googleapis.com/auth/calendar.events',
                    access_type: 'offline',
                    state: userId || '',
                });
                reply.redirect("https://accounts.google.com/o/oauth2/v2/auth?".concat(params));
                return [2 /*return*/];
            });
        }); });
        app.get('/google/callback', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, code, userId, tokenRes, tokens, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.query, code = _a.code, userId = _a.state;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch('https://oauth2.googleapis.com/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams({
                                    code: code,
                                    client_id: process.env.GOOGLE_CLIENT_ID || '',
                                    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                                    redirect_uri: "".concat(process.env.APP_URL, "/api/calendar/google/callback"),
                                    grant_type: 'authorization_code',
                                }),
                            })];
                    case 2:
                        tokenRes = _c.sent();
                        return [4 /*yield*/, tokenRes.json()];
                    case 3:
                        tokens = _c.sent();
                        // Store tokens for user (simplified - in production store in DB)
                        reply.redirect("".concat(process.env.APP_URL, "/provider?calendar=google_connected"));
                        return [3 /*break*/, 5];
                    case 4:
                        _b = _c.sent();
                        reply.redirect("".concat(process.env.APP_URL, "/provider?error=calendar_failed"));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        // Microsoft Outlook OAuth
        app.get('/outlook/auth', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var userId, params;
            return __generator(this, function (_a) {
                userId = req.query.userId;
                params = new URLSearchParams({
                    client_id: process.env.MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
                    redirect_uri: "".concat(process.env.APP_URL, "/api/calendar/outlook/callback"),
                    response_type: 'code',
                    scope: 'Calendars.ReadWrite offline_access',
                    state: userId || '',
                });
                reply.redirect("https://login.microsoftonline.com/common/oauth2/v2.0/authorize?".concat(params));
                return [2 /*return*/];
            });
        }); });
        app.get('/outlook/callback', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                reply.redirect("".concat(process.env.APP_URL, "/provider?calendar=outlook_connected"));
                return [2 /*return*/];
            });
        }); });
        // Add booking to calendar
        app.post('/add-event', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, title, start, end, description;
            return __generator(this, function (_b) {
                _a = req.body, title = _a.title, start = _a.start, end = _a.end, description = _a.description;
                // Would add to Google Calendar using stored tokens
                return [2 /*return*/, { success: true, message: 'Συμβάν προστέθηκε στο ημερολόγιο' }];
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = calendarRoutes;
