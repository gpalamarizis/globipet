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
        // GET cart items
        app.get('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, items, total;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.cartItem.findMany({
                                where: { user_email: email },
                                orderBy: { created_at: 'desc' },
                            })];
                    case 1:
                        items = _a.sent();
                        total = items.reduce(function (sum, item) { return sum + (item.product_price * item.quantity); }, 0);
                        return [2 /*return*/, { data: items, total: total }];
                }
            });
        }); });
        // POST add item to cart
        app.post('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, product_id, product_name, product_price, product_image, _b, quantity, existing, updated, item;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.body, product_id = _a.product_id, product_name = _a.product_name, product_price = _a.product_price, product_image = _a.product_image, _b = _a.quantity, quantity = _b === void 0 ? 1 : _b;
                        return [4 /*yield*/, prisma_js_1.default.cartItem.findUnique({
                                where: { user_email_product_id: { user_email: email, product_id: product_id } },
                            })];
                    case 1:
                        existing = _c.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma_js_1.default.cartItem.update({
                                where: { user_email_product_id: { user_email: email, product_id: product_id } },
                                data: { quantity: existing.quantity + quantity },
                            })];
                    case 2:
                        updated = _c.sent();
                        return [2 /*return*/, { data: updated, success: true }];
                    case 3: return [4 /*yield*/, prisma_js_1.default.cartItem.create({
                            data: {
                                user_email: email,
                                product_id: product_id,
                                product_name: product_name,
                                product_price: parseFloat(product_price),
                                product_image: product_image || null,
                                quantity: quantity,
                            },
                        })];
                    case 4:
                        item = _c.sent();
                        return [2 /*return*/, { data: item, success: true }];
                }
            });
        }); });
        // PATCH update quantity
        app.patch('/:id', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, quantity, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        quantity = req.body.quantity;
                        if (!(quantity <= 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, prisma_js_1.default.cartItem.deleteMany({ where: { id: req.params.id, user_email: email } })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true, deleted: true }];
                    case 2: return [4 /*yield*/, prisma_js_1.default.cartItem.updateMany({
                            where: { id: req.params.id, user_email: email },
                            data: { quantity: quantity },
                        })];
                    case 3:
                        updated = _a.sent();
                        return [2 /*return*/, { data: updated, success: true }];
                }
            });
        }); });
        // DELETE remove item
        app.delete('/:id', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.cartItem.deleteMany({
                                where: { id: req.params.id, user_email: email },
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = routes;
