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
exports.default = Login;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_i18next_1 = require("react-i18next");
var auth_1 = require("@/store/auth");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var react_hot_toast_1 = require("react-hot-toast");
var LanguageSwitcher_1 = require("@/components/LanguageSwitcher");
function Login() {
    var _this = this;
    var t = (0, react_i18next_1.useTranslation)().t;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, auth_1.useAuthStore)(), login = _a.login, isLoading = _a.isLoading;
    var _b = (0, react_1.useState)(''), email = _b[0], setEmail = _b[1];
    var _c = (0, react_1.useState)(''), password = _c[0], setPassword = _c[1];
    var _d = (0, react_1.useState)(false), showPass = _d[0], setShowPass = _d[1];
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    e.preventDefault();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, login(email, password)];
                case 2:
                    _c.sent();
                    navigate('/');
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _c.sent();
                    react_hot_toast_1.default.error(((_b = (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || err_1.message || t('authExtraLogin.invalidCredentials'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 relative">
      {/* Language switcher - top right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher_1.default variant="full"/>
      </div>

      <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <react_router_dom_1.Link to="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🐾</span>
            <span className="font-display font-bold text-2xl text-gradient">GlobiPet</span>
          </react_router_dom_1.Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('authExtraLogin.welcomeTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('authExtraLogin.welcomeSubtitle')}</p>
        </div>

        <div className="card p-6">
          <div className="space-y-2 mb-5">
            <button onClick={function () { return window.location.href = "".concat(API, "/auth/google"); }} className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {t('authExtraLogin.loginGoogle')}
            </button>
            <button onClick={function () { return window.location.href = "".concat(API, "/auth/facebook"); }} className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              {t('authExtraLogin.loginFacebook')}
            </button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"/></div>
            <div className="relative text-center text-xs text-gray-400">
              <span className="bg-white dark:bg-gray-900 px-3">{t('authExtraLogin.orWithEmail')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.email')}</label>
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={function (e) { return setEmail(e.target.value); }} required/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.password')}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={password} onChange={function (e) { return setPassword(e.target.value); }} required/>
                <button type="button" onClick={function () { return setShowPass(!showPass); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <lucide_react_1.EyeOff size={16}/> : <lucide_react_1.Eye size={16}/>}</button>
              </div>
            </div>
            <div className="flex justify-end">
              <react_router_dom_1.Link to="/forgot-password" className="text-xs text-brand-900 hover:underline">{t('authExtraLogin.forgotPassword')}</react_router_dom_1.Link>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? t('authExtraLogin.loggingIn') : t('auth.login')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('authExtraLogin.noAccount')} <react_router_dom_1.Link to="/register" className="text-brand-900 font-medium hover:underline">{t('auth.register')}</react_router_dom_1.Link>
        </p>
      </framer_motion_1.motion.div>
    </div>);
}
