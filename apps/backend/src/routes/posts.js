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
var postsRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // GET posts
        app.get('/', function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, _b, limit, _c, page, skip, posts;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = req.query, _b = _a.limit, limit = _b === void 0 ? 20 : _b, _c = _a.page, page = _c === void 0 ? 1 : _c;
                        skip = (Number(page) - 1) * Number(limit);
                        return [4 /*yield*/, prisma_js_1.default.post.findMany({
                                orderBy: { created_at: 'desc' },
                                take: Number(limit),
                                skip: skip,
                            })];
                    case 1:
                        posts = _d.sent();
                        return [2 /*return*/, { data: posts, total: posts.length }];
                }
            });
        }); });
        // GET single post
        app.get('/:id', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var post;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.post.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        post = _a.sent();
                        if (!post)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        return [2 /*return*/, post];
                }
            });
        }); });
        // POST create post
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, email, full_name, profile_photo, _b, content, image_url, tags, pet_name, pet_id, post;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = req.user, email = _a.email, full_name = _a.full_name, profile_photo = _a.profile_photo;
                        _b = req.body, content = _b.content, image_url = _b.image_url, tags = _b.tags, pet_name = _b.pet_name, pet_id = _b.pet_id;
                        if (!(content === null || content === void 0 ? void 0 : content.trim()))
                            return [2 /*return*/, reply.code(400).send({ message: 'Το περιεχόμενο είναι υποχρεωτικό' })];
                        return [4 /*yield*/, prisma_js_1.default.post.create({
                                data: {
                                    author_email: email,
                                    author_name: full_name || email.split('@')[0],
                                    author_photo: profile_photo || null,
                                    content: content.trim(),
                                    image_url: image_url || null,
                                    tags: tags || [],
                                    pet_name: pet_name || null,
                                    pet_id: pet_id || null,
                                }
                            })];
                    case 1:
                        post = _c.sent();
                        return [2 /*return*/, reply.code(201).send(post)];
                }
            });
        }); });
        // POST like
        app.post('/:id/like', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var post;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma_js_1.default.post.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        post = _a.sent();
                        if (!post)
                            return [2 /*return*/, { liked: false }];
                        return [4 /*yield*/, prisma_js_1.default.post.update({
                                where: { id: req.params.id },
                                data: { likes_count: { increment: 1 } }
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { liked: true }];
                }
            });
        }); });
        // PATCH update post
        app.patch('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, post, _a, content, image_url, tags;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.post.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        post = _b.sent();
                        if (!post)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (post.author_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        _a = req.body, content = _a.content, image_url = _a.image_url, tags = _a.tags;
                        return [2 /*return*/, prisma_js_1.default.post.update({
                                where: { id: req.params.id },
                                data: { content: content, image_url: image_url, tags: tags }
                            })];
                }
            });
        }); });
        // DELETE post
        app.delete('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, post;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.post.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        post = _a.sent();
                        if (!post)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (post.author_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.post.delete({ where: { id: req.params.id } })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = postsRoutes;
