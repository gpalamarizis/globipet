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
exports.useAuthStore = void 0;
var zustand_1 = require("zustand");
var middleware_1 = require("zustand/middleware");
var api_1 = require("@/lib/api");
var i18n_1 = require("@/lib/i18n");
// Sync user's preferred language with i18n
function applyUserLanguage(user) {
    if (user === null || user === void 0 ? void 0 : user.preferred_language) {
        var supported = ['el', 'en', 'es', 'fr', 'zh'];
        if (supported.includes(user.preferred_language) && i18n_1.default.language !== user.preferred_language) {
            i18n_1.default.changeLanguage(user.preferred_language);
            localStorage.setItem('globipet_language', user.preferred_language);
        }
    }
}
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)(function (set, get) { return ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    setAuth: function (user, token) {
        set({ user: user, token: token, isAuthenticated: true });
        api_1.api.defaults.headers.common['Authorization'] = "Bearer ".concat(token);
        applyUserLanguage(user);
    },
    login: function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, api_1.api.post('/auth/login', { email: email, password: password })];
                case 2:
                    data = (_a.sent()).data;
                    set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
                    api_1.api.defaults.headers.common['Authorization'] = "Bearer ".concat(data.token);
                    applyUserLanguage(data.user);
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    set({ isLoading: false });
                    throw err_1;
                case 4: return [2 /*return*/];
            }
        });
    }); },
    register: function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var currentLang, res, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    set({ isLoading: true });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    currentLang = i18n_1.default.language || localStorage.getItem('globipet_language') || 'el';
                    return [4 /*yield*/, api_1.api.post('/auth/register', __assign(__assign({}, data), { preferred_language: data.preferred_language || currentLang }))];
                case 2:
                    res = (_a.sent()).data;
                    set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
                    api_1.api.defaults.headers.common['Authorization'] = "Bearer ".concat(res.token);
                    applyUserLanguage(res.user);
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    set({ isLoading: false });
                    throw err_2;
                case 4: return [2 /*return*/];
            }
        });
    }); },
    logout: function () {
        set({ user: null, token: null, isAuthenticated: false });
        delete api_1.api.defaults.headers.common['Authorization'];
        window.location.href = '/';
    },
    updateUser: function (data) {
        var current = get().user;
        if (current)
            set({ user: __assign(__assign({}, current), data) });
    },
    updateLanguage: function (lang) { return __awaiter(void 0, void 0, void 0, function () {
        var current, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    current = get().user;
                    if (!current)
                        return [2 /*return*/];
                    // Optimistic update locally
                    set({ user: __assign(__assign({}, current), { preferred_language: lang }) });
                    i18n_1.default.changeLanguage(lang);
                    localStorage.setItem('globipet_language', lang);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, api_1.api.patch('/auth/me', { preferred_language: lang })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.error('Failed to save language preference:', err_3);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    refreshToken: function () { return __awaiter(void 0, void 0, void 0, function () {
        var data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, api_1.api.post('/auth/refresh')];
                case 1:
                    data = (_b.sent()).data;
                    set({ token: data.token });
                    api_1.api.defaults.headers.common['Authorization'] = "Bearer ".concat(data.token);
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    get().logout();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); },
}); }, {
    name: 'globipet-auth',
    partialize: function (state) { return ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }); },
    onRehydrateStorage: function () { return function (state) {
        if (state === null || state === void 0 ? void 0 : state.token) {
            api_1.api.defaults.headers.common['Authorization'] = "Bearer ".concat(state.token);
        }
        if (state === null || state === void 0 ? void 0 : state.user) {
            applyUserLanguage(state.user);
        }
    }; },
}));
