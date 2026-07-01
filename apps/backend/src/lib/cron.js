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
exports.startAiTrialExpiryCron = startAiTrialExpiryCron;
var node_cron_1 = require("node-cron");
var prisma_js_1 = require("./prisma.js");
var notifications_js_1 = require("../routes/notifications.js");
function startAiTrialExpiryCron() {
    var _this = this;
    // Runs once a day at 09:00 server time
    node_cron_1.default.schedule('0 9 * * *', function () { return __awaiter(_this, void 0, void 0, function () {
        var fifteenDaysAgo, expiredTrialUsers, _i, expiredTrialUsers_1, user, notification, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, prisma_js_1.default.user.findMany({
                            where: {
                                ai_subscription_status: 'trial',
                                ai_trial_started_at: { lte: fifteenDaysAgo },
                            },
                            select: { id: true, email: true, full_name: true },
                        })];
                case 1:
                    expiredTrialUsers = _a.sent();
                    _i = 0, expiredTrialUsers_1 = expiredTrialUsers;
                    _a.label = 2;
                case 2:
                    if (!(_i < expiredTrialUsers_1.length)) return [3 /*break*/, 6];
                    user = expiredTrialUsers_1[_i];
                    return [4 /*yield*/, prisma_js_1.default.user.update({
                            where: { id: user.id },
                            data: { ai_subscription_status: 'expired' },
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma_js_1.default.notification.create({
                            data: {
                                user_email: user.email,
                                title: 'Η δωρεάν δοκιμή AI Health έληξε',
                                message: 'Οι 15 δωρεάν ημέρες σου στο AI Health ολοκληρώθηκαν. Συνδρομήσε για να συνεχίσεις να έχεις πρόσβαση στις λειτουργίες AI υγείας.',
                                type: 'ai_trial_expired',
                                link: '/medical-center',
                            },
                        })];
                case 4:
                    notification = _a.sent();
                    (0, notifications_js_1.broadcastToUser)(user.id, { type: 'notification', notification: notification });
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    if (expiredTrialUsers.length > 0) {
                        console.log("\uD83D\uDC3E AI trial expiry check: ".concat(expiredTrialUsers.length, " \u03C7\u03C1\u03AE\u03C3\u03C4\u03B5\u03C2 \u03AD\u03BB\u03B7\u03BE\u03B5 \u03C4\u03BF trial \u03C4\u03BF\u03C5\u03C2"));
                    }
                    return [3 /*break*/, 8];
                case 7:
                    err_1 = _a.sent();
                    console.error('AI trial expiry cron error:', err_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); });
}
