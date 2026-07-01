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
        app.get('/', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, _b, page, _c, limit, category, q, skip, where, _d, data, total;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, category = _a.category, q = _a.q;
                        skip = (Number(page) - 1) * Number(limit);
                        where = {};
                        if (category)
                            where.category = category;
                        if (q)
                            where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }];
                        return [4 /*yield*/, Promise.all([
                                prisma_js_1.default.forumTopic.findMany({ where: where, skip: skip, take: Number(limit), orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }] }),
                                prisma_js_1.default.forumTopic.count({ where: where })
                            ])];
                    case 1:
                        _d = _e.sent(), data = _d[0], total = _d[1];
                        return [2 /*return*/, { data: data, total: total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }];
                }
            });
        }); });
        app.get('/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var topic;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.forumTopic.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        topic = _a.sent();
                        if (!topic)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        return [4 /*yield*/, prisma_js_1.default.forumTopic.update({ where: { id: req.params.id }, data: { views_count: { increment: 1 } } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, topic];
                }
            });
        }); });
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, email, full_name, _b, title, content, category, tags, topic;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.user, email = _a.email, full_name = _a.full_name;
                        _b = req.body, title = _b.title, content = _b.content, category = _b.category, tags = _b.tags;
                        if (!title || !content || !category)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.forumTopic.create({
                                data: { author_email: email, author_name: full_name || email.split('@')[0], title: title, content: content, category: category, tags: tags || [] }
                            })];
                    case 1:
                        topic = _c.sent();
                        return [2 /*return*/, reply.code(201).send(topic)];
                }
            });
        }); });
        app.patch('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, topic;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.forumTopic.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        topic = _a.sent();
                        if (!topic || topic.author_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [2 /*return*/, prisma_js_1.default.forumTopic.update({ where: { id: req.params.id }, data: req.body })];
                }
            });
        }); });
        app.delete('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, topic;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.forumTopic.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        topic = _a.sent();
                        if (!topic || topic.author_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.forumTopic.delete({ where: { id: req.params.id } })];
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
