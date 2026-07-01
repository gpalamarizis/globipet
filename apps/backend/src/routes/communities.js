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
var prisma_js_1 = require("../lib/prisma.js");
// Haversine formula για απόσταση σε km
function getDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// Geocoding με Nominatim
function geocode(address) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    url = "https://nominatim.openstreetmap.org/search?q=".concat(encodeURIComponent(address), "&format=json&limit=1&countrycodes=gr");
                    return [4 /*yield*/, fetch(url, { headers: { 'User-Agent': 'GlobiPet/1.0 (gpal@oban.gr)' } })];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _b.sent();
                    if (data.length === 0)
                        return [2 /*return*/, null];
                    return [2 /*return*/, { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var routes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // GET nearby communities by lat/lng or user's location
        app.get('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, lat, lng, radius, user, userLat, userLng, searchRadius, all, nearby;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.query, lat = _a.lat, lng = _a.lng, radius = _a.radius;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _b.sent();
                        userLat = lat ? parseFloat(lat) : user === null || user === void 0 ? void 0 : user.latitude;
                        userLng = lng ? parseFloat(lng) : user === null || user === void 0 ? void 0 : user.longitude;
                        searchRadius = radius ? parseFloat(radius) : 5;
                        return [4 /*yield*/, prisma_js_1.default.community.findMany({
                                include: {
                                    members: { select: { user_email: true, user_name: true, user_photo: true, role: true } },
                                    _count: { select: { messages: true } }
                                },
                                orderBy: { created_at: 'desc' },
                            })];
                    case 2:
                        all = _b.sent();
                        if (userLat && userLng) {
                            nearby = all
                                .map(function (c) { return (__assign(__assign({}, c), { distance: getDistance(userLat, userLng, c.latitude, c.longitude) })); })
                                .filter(function (c) { return c.distance <= searchRadius; })
                                .sort(function (a, b) { return a.distance - b.distance; });
                            return [2 /*return*/, { communities: nearby, userLat: userLat, userLng: userLng }];
                        }
                        return [2 /*return*/, { communities: all, userLat: null, userLng: null }];
                }
            });
        }); });
        // GET single community with messages
        app.get('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, community, isMember;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.community.findUnique({
                                where: { id: req.params.id },
                                include: {
                                    members: { select: { user_email: true, user_name: true, user_photo: true, role: true } },
                                    messages: { orderBy: { created_at: 'asc' }, take: 100 }
                                }
                            })];
                    case 1:
                        community = _a.sent();
                        if (!community)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        isMember = community.members.some(function (m) { return m.user_email === email; });
                        return [2 /*return*/, __assign(__assign({}, community), { isMember: isMember })];
                }
            });
        }); });
        // POST create community
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, user, _a, name, description, address, city, latitude, longitude, radius_km, image_url, lat, lng, geo, community, nearbyUsers, toInvite;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _b.sent();
                        if (!user)
                            return [2 /*return*/, reply.code(404).send({ message: 'User not found' })];
                        _a = req.body, name = _a.name, description = _a.description, address = _a.address, city = _a.city, latitude = _a.latitude, longitude = _a.longitude, radius_km = _a.radius_km, image_url = _a.image_url;
                        if (!name || !city)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        lat = latitude;
                        lng = longitude;
                        if (!(!lat || !lng)) return [3 /*break*/, 3];
                        return [4 /*yield*/, geocode(address || city)];
                    case 2:
                        geo = _b.sent();
                        if (geo) {
                            lat = geo.lat;
                            lng = geo.lon;
                        }
                        else
                            return [2 /*return*/, reply.code(400).send({ message: 'Δεν βρέθηκαν συντεταγμένες για αυτή τη διεύθυνση' })];
                        _b.label = 3;
                    case 3: return [4 /*yield*/, prisma_js_1.default.community.create({
                            data: {
                                creator_email: email,
                                creator_name: user.full_name,
                                name: name,
                                description: description,
                                address: address,
                                city: city,
                                latitude: lat, longitude: lng,
                                radius_km: radius_km || 1.0,
                                image_url: image_url,
                                member_count: 1,
                                members: {
                                    create: { user_email: email, user_name: user.full_name, user_photo: user.profile_photo, role: 'admin' }
                                }
                            },
                            include: { members: true }
                        })
                        // Auto-invite nearby users
                    ];
                    case 4:
                        community = _b.sent();
                        return [4 /*yield*/, prisma_js_1.default.user.findMany({
                                where: { email: { not: email } },
                            })];
                    case 5:
                        nearbyUsers = _b.sent();
                        toInvite = nearbyUsers.filter(function (u) {
                            return u.latitude && u.longitude &&
                                getDistance(lat, lng, u.latitude, u.longitude) <= (radius_km || 1.0);
                        });
                        if (!(toInvite.length > 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, prisma_js_1.default.notification.createMany({
                                data: toInvite.map(function (u) { return ({
                                    user_email: u.email,
                                    title: 'Νέα κοινότητα κοντά σου!',
                                    message: "\u0397 \u03BA\u03BF\u03B9\u03BD\u03CC\u03C4\u03B7\u03C4\u03B1 \"".concat(name, "\" \u03B4\u03B7\u03BC\u03B9\u03BF\u03C5\u03C1\u03B3\u03AE\u03B8\u03B7\u03BA\u03B5 \u03BA\u03BF\u03BD\u03C4\u03AC \u03C3\u03BF\u03C5. \u0393\u03AF\u03BD\u03B5 \u03BC\u03AD\u03BB\u03BF\u03C2!"),
                                    type: 'community',
                                    link: "/communities/".concat(community.id),
                                }); })
                            })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [2 /*return*/, reply.code(201).send(__assign(__assign({}, community), { nearbyInvited: toInvite.length }))];
                }
            });
        }); });
        // POST join community
        app.post('/:id/join', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, user, community;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, reply.code(404).send({ message: 'User not found' })];
                        return [4 /*yield*/, prisma_js_1.default.community.findUnique({ where: { id: req.params.id } })];
                    case 2:
                        community = _a.sent();
                        if (!community)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        return [4 /*yield*/, prisma_js_1.default.communityMember.upsert({
                                where: { community_id_user_email: { community_id: req.params.id, user_email: email } },
                                create: { community_id: req.params.id, user_email: email, user_name: user.full_name, user_photo: user.profile_photo },
                                update: {},
                            })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, prisma_js_1.default.community.update({
                                where: { id: req.params.id },
                                data: { member_count: { increment: 1 } }
                            })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        }); });
        // POST leave community
        app.delete('/:id/leave', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.communityMember.deleteMany({
                                where: { community_id: req.params.id, user_email: email }
                            })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, prisma_js_1.default.community.update({
                                where: { id: req.params.id },
                                data: { member_count: { decrement: 1 } }
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, reply.code(204).send()];
                }
            });
        }); });
        // POST send message
        app.post('/:id/messages', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, user, member, _a, content, image_url, message;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _b.sent();
                        if (!user)
                            return [2 /*return*/, reply.code(404).send({ message: 'User not found' })];
                        return [4 /*yield*/, prisma_js_1.default.communityMember.findUnique({
                                where: { community_id_user_email: { community_id: req.params.id, user_email: email } }
                            })];
                    case 2:
                        member = _b.sent();
                        if (!member)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν είστε μέλος' })];
                        _a = req.body, content = _a.content, image_url = _a.image_url;
                        if (!content && !image_url)
                            return [2 /*return*/, reply.code(400).send({ message: 'Κενό μήνυμα' })];
                        return [4 /*yield*/, prisma_js_1.default.communityMessage.create({
                                data: {
                                    community_id: req.params.id,
                                    author_email: email,
                                    author_name: user.full_name,
                                    author_photo: user.profile_photo,
                                    content: content,
                                    image_url: image_url,
                                }
                            })];
                    case 3:
                        message = _b.sent();
                        return [2 /*return*/, reply.code(201).send(message)];
                }
            });
        }); });
        // GET messages
        app.get('/:id/messages', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, before, limit, member, messages;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.query, before = _a.before, limit = _a.limit;
                        return [4 /*yield*/, prisma_js_1.default.communityMember.findUnique({
                                where: { community_id_user_email: { community_id: req.params.id, user_email: email } }
                            })];
                    case 1:
                        member = _b.sent();
                        if (!member)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν είστε μέλος' })];
                        return [4 /*yield*/, prisma_js_1.default.communityMessage.findMany({
                                where: __assign({ community_id: req.params.id }, (before ? { created_at: { lt: new Date(before) } } : {})),
                                orderBy: { created_at: 'desc' },
                                take: limit ? parseInt(limit) : 50,
                            })];
                    case 2:
                        messages = _b.sent();
                        return [2 /*return*/, { messages: messages.reverse() }];
                }
            });
        }); });
        // Geocode endpoint
        app.get('/geocode', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var address, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        address = req.query.address;
                        return [4 /*yield*/, geocode(address)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result || { error: 'Δεν βρέθηκε' }];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = routes;
