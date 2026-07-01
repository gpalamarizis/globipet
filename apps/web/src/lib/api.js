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
exports.api = void 0;
exports.uploadFile = uploadFile;
var axios_1 = require("axios");
var react_hot_toast_1 = require("react-hot-toast");
exports.api = axios_1.default.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});
// Request interceptor — attach token
exports.api.interceptors.request.use(function (config) {
    var stored = localStorage.getItem('globipet-auth');
    if (stored) {
        var state = JSON.parse(stored).state;
        if (state === null || state === void 0 ? void 0 : state.token) {
            config.headers.Authorization = "Bearer ".concat(state.token);
        }
    }
    return config;
});
// Response interceptor — handle errors
exports.api.interceptors.response.use(function (response) { return response; }, function (error) { return __awaiter(void 0, void 0, void 0, function () {
    var status, message;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
        message = ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Κάτι πήγε στραβά';
        if (status === 401) {
            localStorage.removeItem('globipet-auth');
            window.location.href = '/login';
        }
        else if (status === 429) {
            react_hot_toast_1.default.error('Πάρα πολλά αιτήματα. Δοκιμάστε σε λίγο.');
        }
        // Don't show global toast for 500 errors - let components handle them
        return [2 /*return*/, Promise.reject({ message: message, statusCode: status, errors: (_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.errors })];
    });
}); });
// Upload helper for files → Cloudflare R2
function uploadFile(file_1) {
    return __awaiter(this, arguments, void 0, function (file, folder) {
        var formData, data;
        if (folder === void 0) { folder = 'general'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    formData = new FormData();
                    formData.append('file', file);
                    return [4 /*yield*/, exports.api.post("/upload?folder=".concat(encodeURIComponent(folder)), formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        })];
                case 1:
                    data = (_a.sent()).data;
                    return [2 /*return*/, data.url];
            }
        });
    });
}
