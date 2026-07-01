"use strict";
/**
 * Transactional email via Resend (https://resend.com), called through raw fetch
 * (no SDK dependency, matches the existing viva.ts pattern).
 *
 * Required env vars:
 *   RESEND_API_KEY    - from Resend dashboard
 *   RESEND_FROM_EMAIL  - e.g. "GlobiPet <orders@globipet.com>" (domain must be verified in Resend)
 *
 * IMPORTANT: every call here is wrapped so a failure NEVER throws — email is best-effort
 * and must never break the order/booking/payment flow that triggered it.
 */
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
exports.sendOrderConfirmedEmail = sendOrderConfirmedEmail;
exports.sendProviderNewOrderEmail = sendProviderNewOrderEmail;
exports.sendBookingConfirmedEmail = sendBookingConfirmedEmail;
exports.sendProviderNewBookingEmail = sendProviderNewBookingEmail;
exports.sendTelehealthConfirmedEmail = sendTelehealthConfirmedEmail;
exports.sendProviderNewTelehealthEmail = sendProviderNewTelehealthEmail;
exports.sendSubscriptionStartedEmail = sendSubscriptionStartedEmail;
exports.sendSubscriptionRenewedEmail = sendSubscriptionRenewedEmail;
exports.sendSubscriptionFailedEmail = sendSubscriptionFailedEmail;
exports.sendAiTrialStartedEmail = sendAiTrialStartedEmail;
var BRAND_ORANGE = '#E65100';
function wrapper(title, bodyHtml) {
    return "<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\">\n  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding:32px 16px;\">\n    <tr><td align=\"center\">\n      <table width=\"100%\" style=\"max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #F0F0F0;\">\n        <tr><td style=\"background:".concat(BRAND_ORANGE, ";padding:24px 32px;\">\n          <span style=\"color:#fff;font-size:20px;font-weight:800;\">\uD83D\uDC3E globipet</span>\n        </td></tr>\n        <tr><td style=\"padding:32px;\">\n          <h1 style=\"margin:0 0 16px;font-size:20px;color:#111827;\">").concat(title, "</h1>\n          ").concat(bodyHtml, "\n        </td></tr>\n        <tr><td style=\"padding:20px 32px;background:#F9FAFB;border-top:1px solid #F0F0F0;\">\n          <p style=\"margin:0;font-size:12px;color:#9CA3AF;\">GlobiPet \u00B7 Best care for the best human's friends</p>\n        </td></tr>\n      </table>\n    </td></tr>\n  </table>\n  </body></html>");
}
function sendEmail(opts) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, from, res, text, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiKey = process.env.RESEND_API_KEY;
                    from = process.env.RESEND_FROM_EMAIL || 'GlobiPet <onboarding@resend.dev>';
                    if (!apiKey) {
                        console.warn('[email] RESEND_API_KEY not set, skipping email to', opts.to);
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(apiKey),
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ from: from, to: opts.to, subject: opts.subject, html: opts.html }),
                        })];
                case 2:
                    res = _a.sent();
                    if (!!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.text()];
                case 3:
                    text = _a.sent();
                    console.error('[email] Resend error:', res.status, text);
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    console.error('[email] send failed:', err_1.message);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
var money = function (n) { return "\u20AC".concat(n.toFixed(2)); };
// ─── Orders (marketplace products) ─────────────────────────────────
function sendOrderConfirmedEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    rows = opts.items.map(function (i) { return "<tr><td style=\"padding:6px 0;color:#374151;font-size:14px;\">".concat(i.name, " \u00D7").concat(i.quantity, "</td><td style=\"padding:6px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;\">").concat(money(i.price * i.quantity), "</td></tr>"); }).join('');
                    return [4 /*yield*/, sendEmail({
                            to: to,
                            subject: "\u0395\u03C0\u03B9\u03B2\u03B5\u03B2\u03B1\u03AF\u03C9\u03C3\u03B7 \u03C0\u03B1\u03C1\u03B1\u03B3\u03B3\u03B5\u03BB\u03AF\u03B1\u03C2 #".concat(opts.orderId.slice(0, 8)),
                            html: wrapper('Η παραγγελία σου επιβεβαιώθηκε! 🎉', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.customerName, ", \u03B5\u03C5\u03C7\u03B1\u03C1\u03B9\u03C3\u03C4\u03BF\u03CD\u03BC\u03B5 \u03B3\u03B9\u03B1 \u03C4\u03B7\u03BD \u03C0\u03B1\u03C1\u03B1\u03B3\u03B3\u03B5\u03BB\u03AF\u03B1 \u03C3\u03BF\u03C5.</p>\n      <table width=\"100%\" style=\"margin:16px 0;border-top:1px solid #F0F0F0;padding-top:12px;\">").concat(rows, "</table>\n      <table width=\"100%\" style=\"border-top:2px solid #111827;padding-top:8px;\"><tr><td style=\"font-weight:800;color:#111827;\">\u03A3\u03CD\u03BD\u03BF\u03BB\u03BF</td><td style=\"text-align:right;font-weight:800;color:").concat(BRAND_ORANGE, ";font-size:16px;\">").concat(money(opts.total), "</td></tr></table>\n    "))
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sendProviderNewOrderEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u039D\u03AD\u03B1 \u03C0\u03B1\u03C1\u03B1\u03B3\u03B3\u03B5\u03BB\u03AF\u03B1: ".concat(opts.productName),
                        html: wrapper('Έχεις νέα παραγγελία 📦', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.providerName, ", \u03AD\u03BD\u03B1\u03C2 \u03C0\u03B5\u03BB\u03AC\u03C4\u03B7\u03C2 \u03BC\u03CC\u03BB\u03B9\u03C2 \u03C0\u03B1\u03C1\u03AE\u03B3\u03B3\u03B5\u03B9\u03BB\u03B5:</p>\n      <p style=\"font-size:15px;color:#111827;font-weight:600;margin:12px 0;\">").concat(opts.productName, " \u00D7").concat(opts.quantity, "</p>\n      <p style=\"font-size:14px;color:#6B7280;\">\u0397 \u03B1\u03BC\u03BF\u03B9\u03B2\u03AE \u03C3\u03BF\u03C5: <strong style=\"color:#16A34A;\">").concat(money(opts.payoutAmount), "</strong> (\u03BC\u03B5\u03C4\u03AC \u03C4\u03B7\u03BD \u03C0\u03C1\u03BF\u03BC\u03AE\u03B8\u03B5\u03B9\u03B1 \u03C0\u03BB\u03B1\u03C4\u03C6\u03CC\u03C1\u03BC\u03B1\u03C2)</p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ─── Bookings (services) ────────────────────────────────────────────
function sendBookingConfirmedEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u0395\u03C0\u03B9\u03B2\u03B5\u03B2\u03B1\u03AF\u03C9\u03C3\u03B7 \u03BA\u03C1\u03AC\u03C4\u03B7\u03C3\u03B7\u03C2 \u03BC\u03B5 ".concat(opts.providerName),
                        html: wrapper('Η κράτησή σου επιβεβαιώθηκε ✅', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.customerName, ", \u03B7 \u03BA\u03C1\u03AC\u03C4\u03B7\u03C3\u03AE \u03C3\u03BF\u03C5 \u03BC\u03B5 <strong>").concat(opts.providerName, "</strong> \u03BA\u03B1\u03C4\u03B1\u03C7\u03C9\u03C1\u03AE\u03B8\u03B7\u03BA\u03B5.</p>\n      <p style=\"font-size:14px;color:#111827;margin:12px 0;\">\uD83D\uDCC5 ").concat(opts.date, " \u03C3\u03C4\u03B9\u03C2 ").concat(opts.time, "</p>\n      <p style=\"font-size:14px;color:#6B7280;\">\u039A\u03CC\u03C3\u03C4\u03BF\u03C2: <strong>").concat(money(opts.price), "</strong></p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sendProviderNewBookingEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u039D\u03AD\u03B1 \u03BA\u03C1\u03AC\u03C4\u03B7\u03C3\u03B7 \u03B1\u03C0\u03CC ".concat(opts.customerName),
                        html: wrapper('Έχεις νέα κράτηση 📅', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.providerName, ", \u03BF/\u03B7 <strong>").concat(opts.customerName, "</strong> \u03AD\u03BA\u03BB\u03B5\u03B9\u03C3\u03B5 \u03C1\u03B1\u03BD\u03C4\u03B5\u03B2\u03BF\u03CD \u03BC\u03B1\u03B6\u03AF \u03C3\u03BF\u03C5.</p>\n      <p style=\"font-size:14px;color:#111827;margin:12px 0;\">\uD83D\uDCC5 ").concat(opts.date, " \u03C3\u03C4\u03B9\u03C2 ").concat(opts.time, "</p>\n      <p style=\"font-size:14px;color:#6B7280;\">\u0397 \u03B1\u03BC\u03BF\u03B9\u03B2\u03AE \u03C3\u03BF\u03C5: <strong style=\"color:#16A34A;\">").concat(money(opts.payoutAmount), "</strong> (\u03BC\u03B5\u03C4\u03AC \u03C4\u03B7\u03BD \u03C0\u03C1\u03BF\u03BC\u03AE\u03B8\u03B5\u03B9\u03B1 \u03C0\u03BB\u03B1\u03C4\u03C6\u03CC\u03C1\u03BC\u03B1\u03C2)</p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ─── Telehealth ──────────────────────────────────────────────────────
function sendTelehealthConfirmedEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u0397 \u03C4\u03B7\u03BB\u03B5\u03CA\u03B1\u03C4\u03C1\u03B9\u03BA\u03AE \u03C3\u03C5\u03BD\u03B5\u03B4\u03C1\u03AF\u03B1 \u03C3\u03BF\u03C5 \u03B5\u03C0\u03B9\u03B2\u03B5\u03B2\u03B1\u03B9\u03CE\u03B8\u03B7\u03BA\u03B5",
                        html: wrapper('Η πληρωμή έγινε δεκτή ✅', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.customerName, ", \u03B7 \u03C3\u03C5\u03BD\u03B5\u03B4\u03C1\u03AF\u03B1 \u03C4\u03B7\u03BB\u03B5\u03CA\u03B1\u03C4\u03C1\u03B9\u03BA\u03AE\u03C2 \u03BC\u03B5 <strong>").concat(opts.providerName, "</strong> \u03B5\u03AF\u03BD\u03B1\u03B9 \u03AD\u03C4\u03BF\u03B9\u03BC\u03B7.</p>\n      <p style=\"font-size:14px;color:#111827;margin:12px 0;\">\uD83D\uDCC5 ").concat(opts.date, " \u03C3\u03C4\u03B9\u03C2 ").concat(opts.time, "</p>\n      <p style=\"font-size:14px;color:#6B7280;\">\u039C\u03C0\u03B5\u03C2 \u03C3\u03C4\u03B7\u03BD \u03B5\u03C6\u03B1\u03C1\u03BC\u03BF\u03B3\u03AE \u03C3\u03C4\u03B7\u03BD \u03CE\u03C1\u03B1 \u03C4\u03BF\u03C5 \u03C1\u03B1\u03BD\u03C4\u03B5\u03B2\u03BF\u03CD \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03BE\u03B5\u03BA\u03B9\u03BD\u03AE\u03C3\u03B5\u03B9\u03C2 \u03C4\u03B7\u03BD \u03B2\u03B9\u03BD\u03C4\u03B5\u03BF\u03BA\u03BB\u03AE\u03C3\u03B7.</p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sendProviderNewTelehealthEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u039D\u03AD\u03B1 \u03C3\u03C5\u03BD\u03B5\u03B4\u03C1\u03AF\u03B1 \u03C4\u03B7\u03BB\u03B5\u03CA\u03B1\u03C4\u03C1\u03B9\u03BA\u03AE\u03C2 \u03B1\u03C0\u03CC ".concat(opts.customerName),
                        html: wrapper('Έχεις νέα συνεδρία τηλεϊατρικής 🩺', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.providerName, ", \u03BF/\u03B7 <strong>").concat(opts.customerName, "</strong> \u03C0\u03BB\u03AE\u03C1\u03C9\u03C3\u03B5 \u03BA\u03B1\u03B9 \u03AD\u03BA\u03BB\u03B5\u03B9\u03C3\u03B5 \u03C3\u03C5\u03BD\u03B5\u03B4\u03C1\u03AF\u03B1.</p>\n      <p style=\"font-size:14px;color:#111827;margin:12px 0;\">\uD83D\uDCC5 ").concat(opts.date, " \u03C3\u03C4\u03B9\u03C2 ").concat(opts.time, "</p>\n      <p style=\"font-size:14px;color:#6B7280;\">\u0397 \u03B1\u03BC\u03BF\u03B9\u03B2\u03AE \u03C3\u03BF\u03C5: <strong style=\"color:#16A34A;\">").concat(money(opts.payoutAmount), "</strong> (\u03BC\u03B5\u03C4\u03AC \u03C4\u03B7\u03BD \u03C0\u03C1\u03BF\u03BC\u03AE\u03B8\u03B5\u03B9\u03B1 \u03C0\u03BB\u03B1\u03C4\u03C6\u03CC\u03C1\u03BC\u03B1\u03C2)</p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ─── Subscriptions ───────────────────────────────────────────────────
function sendSubscriptionStartedEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u0397 \u03C3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE \u03C3\u03BF\u03C5 \u03BE\u03B5\u03BA\u03AF\u03BD\u03B7\u03C3\u03B5 \uD83C\uDF89",
                        html: wrapper('Καλώς ήρθες στη συνδρομή!', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.customerName, ", \u03B7 \u03BC\u03B7\u03BD\u03B9\u03B1\u03AF\u03B1 \u03C3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE \u03C3\u03BF\u03C5 \u03B3\u03B9\u03B1 <strong>").concat(opts.productName, "</strong> \u03B5\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03B9\u03AE\u03B8\u03B7\u03BA\u03B5.</p>\n      <p style=\"font-size:14px;color:#6B7280;\">\u039C\u03B7\u03BD\u03B9\u03B1\u03AF\u03B1 \u03C7\u03C1\u03AD\u03C9\u03C3\u03B7: <strong>").concat(money(opts.monthlyPrice), "</strong></p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sendSubscriptionRenewedEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u0397 \u03BC\u03B7\u03BD\u03B9\u03B1\u03AF\u03B1 \u03C0\u03B1\u03C1\u03AC\u03B4\u03BF\u03C3\u03B7 \u03C0\u03C1\u03BF\u03B3\u03C1\u03B1\u03BC\u03BC\u03B1\u03C4\u03AF\u03C3\u03C4\u03B7\u03BA\u03B5",
                        html: wrapper('Νέα παράδοση ετοιμάζεται 📦', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.customerName, ", \u03B7 \u03C0\u03BB\u03B7\u03C1\u03C9\u03BC\u03AE \u03B3\u03B9\u03B1 <strong>").concat(opts.productName, "</strong> (\u03C0\u03B1\u03C1\u03AC\u03B4\u03BF\u03C3\u03B7 #").concat(opts.deliveryNumber, ") \u03BF\u03BB\u03BF\u03BA\u03BB\u03B7\u03C1\u03CE\u03B8\u03B7\u03BA\u03B5 \u03B5\u03C0\u03B9\u03C4\u03C5\u03C7\u03CE\u03C2.</p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sendSubscriptionFailedEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u03A0\u03C1\u03CC\u03B2\u03BB\u03B7\u03BC\u03B1 \u03BC\u03B5 \u03C4\u03B7\u03BD \u03C0\u03BB\u03B7\u03C1\u03C9\u03BC\u03AE \u03C4\u03B7\u03C2 \u03C3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE\u03C2 \u03C3\u03BF\u03C5",
                        html: wrapper('Χρειάζεται ενημέρωση στοιχείων πληρωμής ⚠️', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.customerName, ", \u03B7 \u03C7\u03C1\u03AD\u03C9\u03C3\u03B7 \u03B3\u03B9\u03B1 \u03C4\u03B7 \u03C3\u03C5\u03BD\u03B4\u03C1\u03BF\u03BC\u03AE <strong>").concat(opts.productName, "</strong> \u03B1\u03C0\u03AD\u03C4\u03C5\u03C7\u03B5.</p>\n      <p style=\"font-size:14px;color:#6B7280;\">\u039C\u03C0\u03B5\u03C2 \u03C3\u03C4\u03BF \u03C0\u03C1\u03BF\u03C6\u03AF\u03BB \u03C3\u03BF\u03C5 \u03C3\u03C4\u03BF GlobiPet \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03B5\u03BD\u03B7\u03BC\u03B5\u03C1\u03CE\u03C3\u03B5\u03B9\u03C2 \u03C4\u03B1 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1 \u03C4\u03B7\u03C2 \u03BA\u03AC\u03C1\u03C4\u03B1\u03C2 \u03C3\u03BF\u03C5.</p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sendAiTrialStartedEmail(to, opts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendEmail({
                        to: to,
                        subject: "\u03A4\u03BF \u03B4\u03C9\u03C1\u03B5\u03AC\u03BD trial AI \u03BE\u03B5\u03BA\u03AF\u03BD\u03B7\u03C3\u03B5 \uD83D\uDE80",
                        html: wrapper('15 μέρες δωρεάν AI λειτουργίες', "\n      <p style=\"color:#6B7280;font-size:14px;\">\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5 ".concat(opts.customerName, ", \u03C4\u03BF \u03B4\u03C9\u03C1\u03B5\u03AC\u03BD 15\u03AE\u03BC\u03B5\u03C1\u03BF trial \u03C4\u03C9\u03BD AI \u03BB\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03B9\u03CE\u03BD (\u03A5\u03B3\u03B5\u03AF\u03B1, Emotion, \u039F\u03CD\u03C1\u03B1/\u03A0\u03B5\u03C1\u03B9\u03C4\u03C4\u03CE\u03BC\u03B1\u03C4\u03B1) \u03B5\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03B9\u03AE\u03B8\u03B7\u03BA\u03B5.</p>\n    "))
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
