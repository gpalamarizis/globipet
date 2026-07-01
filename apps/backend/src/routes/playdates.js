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
var routes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // GET nearby events + owners by city
        app.get('/', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, _a, city, event_type, user, searchCity, _b, events, nearbyOwners;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        _a = req.query, city = _a.city, event_type = _a.event_type;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _c.sent();
                        searchCity = city || (user === null || user === void 0 ? void 0 : user.city) || '';
                        return [4 /*yield*/, Promise.all([
                                prisma_js_1.default.playdateEvent.findMany({
                                    where: __assign(__assign({ status: 'active' }, (searchCity ? { city: { contains: searchCity, mode: 'insensitive' } } : {})), (event_type ? { event_type: event_type } : {})),
                                    include: {
                                        invitations: { where: { status: 'accepted' }, select: { invitee_name: true, invitee_photo: true, pet_name: true } }
                                    },
                                    orderBy: { date: 'asc' },
                                }),
                                prisma_js_1.default.user.findMany({
                                    where: {
                                        city: searchCity ? { contains: searchCity, mode: 'insensitive' } : undefined,
                                        email: { not: email },
                                    },
                                    select: { id: true, full_name: true, city: true, profile_photo: true, email: true },
                                    take: 20,
                                })
                            ])];
                    case 2:
                        _b = _c.sent(), events = _b[0], nearbyOwners = _b[1];
                        return [2 /*return*/, { events: events, nearbyOwners: nearbyOwners, userCity: user === null || user === void 0 ? void 0 : user.city }];
                }
            });
        }); });
        // GET my events
        app.get('/my', { preHandler: [app.authenticate] }, function (req) { return __awaiter(void 0, void 0, void 0, function () {
            var email, events, invitations;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.playdateEvent.findMany({
                                where: { creator_email: email },
                                include: { invitations: true },
                                orderBy: { created_at: 'desc' },
                            })];
                    case 1:
                        events = _a.sent();
                        return [4 /*yield*/, prisma_js_1.default.playdateInvitation.findMany({
                                where: { invitee_email: email },
                                include: { event: true },
                                orderBy: { created_at: 'desc' },
                            })];
                    case 2:
                        invitations = _a.sent();
                        return [2 /*return*/, { events: events, invitations: invitations }];
                }
            });
        }); });
        // POST create event
        app.post('/', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, user, _a, title, description, event_type, date, time, duration_minutes, location, city, latitude, longitude, max_participants, pet_types, is_public, event;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: email } })];
                    case 1:
                        user = _b.sent();
                        if (!user)
                            return [2 /*return*/, reply.code(404).send({ message: 'User not found' })];
                        _a = req.body, title = _a.title, description = _a.description, event_type = _a.event_type, date = _a.date, time = _a.time, duration_minutes = _a.duration_minutes, location = _a.location, city = _a.city, latitude = _a.latitude, longitude = _a.longitude, max_participants = _a.max_participants, pet_types = _a.pet_types, is_public = _a.is_public;
                        if (!title || !date || !time || !location || !city)
                            return [2 /*return*/, reply.code(400).send({ message: 'Λείπουν υποχρεωτικά πεδία' })];
                        return [4 /*yield*/, prisma_js_1.default.playdateEvent.create({
                                data: {
                                    creator_email: email,
                                    creator_name: user.full_name,
                                    creator_photo: user.profile_photo,
                                    title: title,
                                    description: description,
                                    event_type: event_type || 'meetup',
                                    date: date,
                                    time: time,
                                    duration_minutes: duration_minutes || 60,
                                    location: location,
                                    city: city,
                                    latitude: latitude || null,
                                    longitude: longitude || null,
                                    max_participants: max_participants || 10,
                                    pet_types: pet_types || [],
                                    is_public: is_public !== false,
                                }
                            })];
                    case 2:
                        event = _b.sent();
                        return [2 /*return*/, reply.code(201).send(event)];
                }
            });
        }); });
        // POST invite user to event
        app.post('/:eventId/invite', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, eventId, _a, invitee_email, message, event, invitee, pets, inv;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        email = req.user.email;
                        eventId = req.params.eventId;
                        _a = req.body, invitee_email = _a.invitee_email, message = _a.message;
                        return [4 /*yield*/, prisma_js_1.default.playdateEvent.findUnique({ where: { id: eventId } })];
                    case 1:
                        event = _c.sent();
                        if (!event)
                            return [2 /*return*/, reply.code(404).send({ message: 'Event not found' })];
                        if (event.creator_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.user.findUnique({ where: { email: invitee_email } })];
                    case 2:
                        invitee = _c.sent();
                        if (!invitee)
                            return [2 /*return*/, reply.code(404).send({ message: 'Χρήστης δεν βρέθηκε' })];
                        return [4 /*yield*/, prisma_js_1.default.pet.findMany({ where: { owner_email: invitee_email }, take: 1 })];
                    case 3:
                        pets = _c.sent();
                        return [4 /*yield*/, prisma_js_1.default.playdateInvitation.upsert({
                                where: { event_id_invitee_email: { event_id: eventId, invitee_email: invitee_email } },
                                create: {
                                    event_id: eventId,
                                    invitee_email: invitee_email,
                                    invitee_name: invitee.full_name,
                                    invitee_photo: invitee.profile_photo,
                                    pet_name: ((_b = pets[0]) === null || _b === void 0 ? void 0 : _b.name) || null,
                                    message: message,
                                },
                                update: { status: 'pending', message: message },
                            })];
                    case 4:
                        inv = _c.sent();
                        return [2 /*return*/, inv];
                }
            });
        }); });
        // PATCH respond to invitation
        app.patch('/invitation/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, id, status, inv, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        id = req.params.id;
                        status = req.body.status;
                        return [4 /*yield*/, prisma_js_1.default.playdateInvitation.findUnique({ where: { id: id } })];
                    case 1:
                        inv = _a.sent();
                        if (!inv)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (inv.invitee_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        if (!['accepted', 'declined'].includes(status))
                            return [2 /*return*/, reply.code(400).send({ message: 'Μη έγκυρο status' })];
                        return [4 /*yield*/, prisma_js_1.default.playdateInvitation.update({ where: { id: id }, data: { status: status } })];
                    case 2:
                        updated = _a.sent();
                        return [2 /*return*/, updated];
                }
            });
        }); });
        // DELETE event
        app.delete('/:id', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var email, event;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = req.user.email;
                        return [4 /*yield*/, prisma_js_1.default.playdateEvent.findUnique({ where: { id: req.params.id } })];
                    case 1:
                        event = _a.sent();
                        if (!event)
                            return [2 /*return*/, reply.code(404).send({ message: 'Δεν βρέθηκε' })];
                        if (event.creator_email !== email)
                            return [2 /*return*/, reply.code(403).send({ message: 'Δεν έχετε δικαίωμα' })];
                        return [4 /*yield*/, prisma_js_1.default.playdateEvent.delete({ where: { id: req.params.id } })];
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
