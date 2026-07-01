"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
var axios_1 = require("axios");
var API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://globipetbackend-production.up.railway.app/api';
exports.api = axios_1.default.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});
exports.api.interceptors.response.use(function (res) { return res; }, function (err) {
    var _a, _b;
    console.error('API Error:', (_a = err.response) === null || _a === void 0 ? void 0 : _a.status, (_b = err.response) === null || _b === void 0 ? void 0 : _b.data);
    return Promise.reject(err);
});
