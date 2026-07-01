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
exports.broadcastToUser = broadcastToUser;
var prisma_js_1 = require("../lib/prisma.js");
// WebSocket clients map
var clients = new Map();
var notificationsRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // WebSocket endpoint for real-time
        app.get('/ws', { websocket: true }, function (socket, req) {
            var _a;
            var userId = (_a = req.query) === null || _a === void 0 ? void 0 : _a.userId;
            if (userId)
                clients.set(userId, socket);
            socket.on('message', function (raw) {
                try {
                    var msg = JSON.parse(raw.toString());
                    if (msg.type === 'ping')
                        socket.send(JSON.stringify({ type: 'pong' }));
                    if (msg.type === 'location_update') {
                        // Broadcast GPS update to relevant clients
                        broadcastToUser(msg.userId, __assign({ type: 'location_update' }, msg));
                    }
                }
                catch (_a) { }
            });
            socket.on('close', function () { if (userId)
                clients.delete(userId); });
            socket.send(JSON.stringify({ type: 'connected', userId: userId }));
        });
        // Get notifications
        app.get('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var notifications;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.notification.findMany({
                            where: { user_email: req.user.email },
                            orderBy: { created_at: 'desc' },
                            take: 20,
                        })];
                    case 1:
                        notifications = _a.sent();
                        return [2 /*return*/, { data: notifications }];
                }
            });
        }); });
        // Mark as read
        app.patch('/:id/read', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.notification.update({ where: { id: req.params.id }, data: { is_read: true } })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        }); });
        // Mark all as read
        app.patch('/read-all', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.notification.updateMany({
                            where: { user_email: req.user.email, is_read: false },
                            data: { is_read: true }
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        }); });
        // Send notification (internal)
        app.post('/send', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, user_email, title, message, type, notification;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, user_email = _a.user_email, title = _a.title, message = _a.message, type = _a.type;
                        return [4 /*yield*/, prisma_js_1.default.notification.create({
                                data: { user_email: user_email, title: title, message: message, type: type || 'info' }
                            })
                            // Push to WebSocket if connected
                        ];
                    case 1:
                        notification = _b.sent();
                        // Push to WebSocket if connected
                        broadcastToUser(user_email, { type: 'notification', notification: notification });
                        return [2 /*return*/, notification];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
function broadcastToUser(userId, data) {
    var socket = clients.get(userId);
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(data));
    }
}
exports.default = notificationsRoutes;
