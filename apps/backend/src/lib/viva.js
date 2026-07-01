"use strict";
/**
 * Viva.com (Viva Wallet) Smart Checkout integration helper.
 *
 * Flow:
 * 1. Get OAuth2 access token (client credentials)
 * 2. Create a payment order -> returns orderCode
 * 3. Redirect customer to Smart Checkout with orderCode
 * 4. Verify payment via webhook or transaction API
 *
 * Environment variables needed:
 *   VIVA_CLIENT_ID         - Smart Checkout OAuth client id
 *   VIVA_CLIENT_SECRET     - Smart Checkout OAuth client secret
 *   VIVA_SOURCE_CODE       - Payment source code (from Viva dashboard)
 *   VIVA_ENV               - 'demo' or 'production' (default: 'demo')
 *   VIVA_MERCHANT_ID       - Merchant ID (for webhook verification)
 *   VIVA_API_KEY           - API Key (for webhook verification)
 *   FRONTEND_URL           - Frontend URL (e.g. https://globipet.com)
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
exports.getVivaAccessToken = getVivaAccessToken;
exports.createVivaPaymentOrder = createVivaPaymentOrder;
exports.getVivaTransaction = getVivaTransaction;
function getEnv() {
    return process.env.VIVA_ENV || 'demo';
}
function getBaseUrls() {
    var env = getEnv();
    if (env === 'production') {
        return {
            accounts: 'https://accounts.vivapayments.com',
            api: 'https://api.vivapayments.com',
            checkout: 'https://www.vivapayments.com/web/checkout',
            legacy: 'https://www.vivapayments.com',
        };
    }
    // Demo / sandbox
    return {
        accounts: 'https://demo-accounts.vivapayments.com',
        api: 'https://demo-api.vivapayments.com',
        checkout: 'https://demo.vivapayments.com/web/checkout',
        legacy: 'https://demo.vivapayments.com',
    };
}
// Cache the token in memory (valid ~1 hour)
var cachedToken = null;
/**
 * Get an OAuth2 access token using client credentials.
 */
function getVivaAccessToken() {
    return __awaiter(this, void 0, void 0, function () {
        var clientId, clientSecret, accounts, basicAuth, res, text, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Return cached token if still valid (with 60s buffer)
                    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
                        return [2 /*return*/, cachedToken.token];
                    }
                    clientId = process.env.VIVA_CLIENT_ID;
                    clientSecret = process.env.VIVA_CLIENT_SECRET;
                    if (!clientId || !clientSecret) {
                        throw new Error('Viva credentials not configured (VIVA_CLIENT_ID / VIVA_CLIENT_SECRET)');
                    }
                    accounts = getBaseUrls().accounts;
                    basicAuth = Buffer.from("".concat(clientId, ":").concat(clientSecret)).toString('base64');
                    return [4 /*yield*/, fetch("".concat(accounts, "/connect/token"), {
                            method: 'POST',
                            headers: {
                                'Authorization': "Basic ".concat(basicAuth),
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
                        })];
                case 1:
                    res = _a.sent();
                    if (!!res.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, res.text()];
                case 2:
                    text = _a.sent();
                    throw new Error("Viva token error: ".concat(res.status, " ").concat(text));
                case 3: return [4 /*yield*/, res.json()];
                case 4:
                    data = _a.sent();
                    cachedToken = {
                        token: data.access_token,
                        expiresAt: Date.now() + (data.expires_in * 1000),
                    };
                    return [2 /*return*/, data.access_token];
            }
        });
    });
}
/**
 * Create a Viva payment order. Returns the orderCode used for checkout redirect.
 */
function createVivaPaymentOrder(params) {
    return __awaiter(this, void 0, void 0, function () {
        var token, _a, api, checkout, sourceCode, frontendUrl, amountInCents, body, res, text, data, orderCode;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getVivaAccessToken()];
                case 1:
                    token = _b.sent();
                    _a = getBaseUrls(), api = _a.api, checkout = _a.checkout;
                    sourceCode = process.env.VIVA_SOURCE_CODE;
                    frontendUrl = process.env.FRONTEND_URL || 'https://globipet.com';
                    amountInCents = Math.round(params.amount * 100);
                    body = {
                        amount: amountInCents,
                        customerTrns: params.description || "GlobiPet \u03C0\u03B1\u03C1\u03B1\u03B3\u03B3\u03B5\u03BB\u03AF\u03B1 ".concat(params.orderId),
                        customer: {
                            email: params.customerEmail,
                            fullName: params.customerName || '',
                            phone: params.customerPhone || '',
                            countryCode: 'GR',
                            requestLang: 'el-GR',
                        },
                        paymentTimeout: 1800, // 30 minutes
                        preauth: false,
                        allowRecurring: false,
                        maxInstallments: 12, // allow installments
                        merchantTrns: params.orderId, // our order id - comes back in webhook
                        sourceCode: sourceCode,
                        tags: ['globipet'],
                        successUrl: params.successUrl || "".concat(frontendUrl, "/orders/").concat(params.orderId, "/confirmation"),
                        failureUrl: params.failureUrl || "".concat(frontendUrl, "/orders/").concat(params.orderId, "/confirmation"),
                    };
                    return [4 /*yield*/, fetch("".concat(api, "/checkout/v2/orders"), {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(token),
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(body),
                        })];
                case 2:
                    res = _b.sent();
                    if (!!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.text()];
                case 3:
                    text = _b.sent();
                    throw new Error("Viva create order error: ".concat(res.status, " ").concat(text));
                case 4: return [4 /*yield*/, res.json()];
                case 5:
                    data = _b.sent();
                    orderCode = String(data.orderCode);
                    return [2 /*return*/, {
                            orderCode: orderCode,
                            checkoutUrl: "".concat(checkout, "?ref=").concat(orderCode),
                        }];
            }
        });
    });
}
/**
 * Retrieve a transaction by its ID to verify payment.
 */
function getVivaTransaction(transactionId) {
    return __awaiter(this, void 0, void 0, function () {
        var token, api, res, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getVivaAccessToken()];
                case 1:
                    token = _a.sent();
                    api = getBaseUrls().api;
                    return [4 /*yield*/, fetch("".concat(api, "/checkout/v2/transactions/").concat(transactionId), {
                            headers: { 'Authorization': "Bearer ".concat(token) },
                        })];
                case 2:
                    res = _a.sent();
                    if (!!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.text()];
                case 3:
                    text = _a.sent();
                    throw new Error("Viva transaction error: ".concat(res.status, " ").concat(text));
                case 4: return [2 /*return*/, res.json()];
            }
        });
    });
}
