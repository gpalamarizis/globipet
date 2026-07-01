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
var fastify_1 = require("fastify");
var cors_1 = require("@fastify/cors");
var helmet_1 = require("@fastify/helmet");
var jwt_1 = require("@fastify/jwt");
var rate_limit_1 = require("@fastify/rate-limit");
var multipart_1 = require("@fastify/multipart");
var admin_catalog_js_1 = require("./routes/admin-catalog.js");
var insurance_js_1 = require("./routes/insurance.js");
// Routes
var auth_js_1 = require("./routes/auth.js");
var users_js_1 = require("./routes/users.js");
var pets_js_1 = require("./routes/pets.js");
var products_js_1 = require("./routes/products.js");
var services_js_1 = require("./routes/services.js");
var bookings_js_1 = require("./routes/bookings.js");
var posts_js_1 = require("./routes/posts.js");
var orders_js_1 = require("./routes/orders.js");
var cart_js_1 = require("./routes/cart.js");
var upload_js_1 = require("./routes/upload.js");
var events_js_1 = require("./routes/events.js");
var breeds_js_1 = require("./routes/breeds.js");
var health_js_1 = require("./routes/health.js");
var telehealth_js_1 = require("./routes/telehealth.js");
var loyalty_js_1 = require("./routes/loyalty.js");
var notifications_js_1 = require("./routes/notifications.js");
var forum_js_1 = require("./routes/forum.js");
var community_js_1 = require("./routes/community.js");
var tracker_js_1 = require("./routes/tracker.js");
var reviews_js_1 = require("./routes/reviews.js");
var wishlist_js_1 = require("./routes/wishlist.js");
var admin_js_1 = require("./routes/admin.js");
var provider_js_1 = require("./routes/provider.js");
var ai_js_1 = require("./routes/ai.js");
var passport_js_1 = require("./routes/passport.js");
var playdates_js_1 = require("./routes/playdates.js");
var communities_js_1 = require("./routes/communities.js");
var bulk_import_js_1 = require("./routes/bulk-import.js");
var packages_js_1 = require("./routes/packages.js");
var catalog_js_1 = require("./routes/catalog.js");
var ai_subscriptions_js_1 = require("./routes/ai-subscriptions.js");
var cron_js_1 = require("./lib/cron.js");
var settings_js_1 = require("./routes/settings.js");
var subscriptions_js_1 = require("./routes/subscriptions.js");
var webhooks_js_1 = require("./routes/webhooks.js");
var admin_subscriptions_js_1 = require("./routes/admin-subscriptions.js");
var app = (0, fastify_1.default)({ logger: process.env.NODE_ENV === 'development' });
// Plugins
await app.register(helmet_1.default, { contentSecurityPolicy: false });
await app.register(cors_1.default, {
    origin: ['https://globipet.com', 'https://www.globipet.com', 'https://globipet.pages.dev', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true
});
await app.register(jwt_1.default, { secret: process.env.JWT_SECRET || 'dev-secret-min-32-chars-here!!' });
await app.register(rate_limit_1.default, { max: 100, timeWindow: '1 minute' });
await app.register(multipart_1.default, { limits: { fileSize: 10 * 1024 * 1024 } });
// Auth decorator
app.decorate('authenticate', function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, req.jwtVerify()];
            case 1:
                _b.sent();
                return [3 /*break*/, 3];
            case 2:
                _a = _b.sent();
                reply.code(401).send({ message: 'Μη εξουσιοδοτημένη πρόσβαση' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Register all routes
var routes = [
    { prefix: '/api/auth', handler: auth_js_1.default },
    { prefix: '/api/users', handler: users_js_1.default },
    { prefix: '/api/pets', handler: pets_js_1.default },
    { prefix: '/api/products', handler: products_js_1.default },
    { prefix: '/api/services', handler: services_js_1.default },
    { prefix: '/api/bookings', handler: bookings_js_1.default },
    { prefix: '/api/posts', handler: posts_js_1.default },
    { prefix: '/api/orders', handler: orders_js_1.default },
    { prefix: '/api/cart', handler: cart_js_1.default },
    { prefix: '/api/upload', handler: upload_js_1.default },
    { prefix: '/api/events', handler: events_js_1.default },
    { prefix: '/api/breeds', handler: breeds_js_1.default },
    { prefix: '/api/health-records', handler: health_js_1.default },
    { prefix: '/api/telehealth', handler: telehealth_js_1.default },
    { prefix: '/api/loyalty', handler: loyalty_js_1.default },
    { prefix: '/api/notifications', handler: notifications_js_1.default },
    { prefix: '/api/forum', handler: forum_js_1.default },
    { prefix: '/api/community', handler: community_js_1.default },
    { prefix: '/api/tracker', handler: tracker_js_1.default },
    { prefix: '/api/reviews', handler: reviews_js_1.default },
    { prefix: '/api/wishlist', handler: wishlist_js_1.default },
    { prefix: '/api/admin', handler: admin_js_1.default },
    { prefix: '/api/admin/bulk-import', handler: bulk_import_js_1.default },
    { prefix: '/api/provider', handler: provider_js_1.default },
    { prefix: '/api/ai', handler: ai_js_1.default },
    { prefix: '/api/passport', handler: passport_js_1.default },
    { prefix: '/api/playdates', handler: playdates_js_1.default },
    { prefix: '/api/communities', handler: communities_js_1.default },
    { prefix: '/api/packages', handler: packages_js_1.default },
    { prefix: '/api/catalog', handler: catalog_js_1.default },
    { prefix: '/api/admin/catalog', handler: admin_catalog_js_1.default },
    { prefix: '/api/ai-subscriptions', handler: ai_subscriptions_js_1.default },
    { prefix: '/api/settings', handler: settings_js_1.default },
    { prefix: '/api/subscriptions', handler: subscriptions_js_1.default },
    { prefix: '/api/webhooks', handler: webhooks_js_1.default },
    { prefix: '/api/admin/subscriptions', handler: admin_subscriptions_js_1.default },
    { prefix: '/api', handler: insurance_js_1.default },
];
for (var _i = 0, routes_1 = routes; _i < routes_1.length; _i++) {
    var _a = routes_1[_i], prefix = _a.prefix, handler = _a.handler;
    await app.register(handler, { prefix: prefix });
}
(0, cron_js_1.startAiTrialExpiryCron)();
// Health check
app.get('/health', function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    return [2 /*return*/, ({ status: 'ok', timestamp: new Date().toISOString() })];
}); }); });
var port = parseInt(process.env.PORT || '4000');
await app.listen({ port: port, host: '0.0.0.0' });
console.log("\uD83D\uDC3E GlobiPet API running on port ".concat(port));
