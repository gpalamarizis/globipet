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
exports.default = ForgotPassword;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_i18next_1 = require("react-i18next");
var api_1 = require("@/lib/api");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var react_hot_toast_1 = require("react-hot-toast");
var LanguageSwitcher_1 = require("@/components/LanguageSwitcher");
function ForgotPassword() {
    var _this = this;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, react_1.useState)(''), email = _a[0], setEmail = _a[1];
    var _b = (0, react_1.useState)(false), sent = _b[0], setSent = _b[1];
    var _c = (0, react_1.useState)(false), isLoading = _c[0], setIsLoading = _c[1];
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    e.preventDefault();
                    setIsLoading(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, api_1.api.post('/auth/forgot-password', { email: email })];
                case 2:
                    _c.sent();
                    setSent(true);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _c.sent();
                    react_hot_toast_1.default.error(((_b = (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || err_1.message || t('common.error'));
                    return [3 /*break*/, 5];
                case 4:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher_1.default variant="full"/>
      </div>

      <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <react_router_dom_1.Link to="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🐾</span>
            <span className="font-display font-bold text-2xl text-gradient">GlobiPet</span>
          </react_router_dom_1.Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('authExtraLogin.forgotTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('authExtraLogin.forgotSubtitle')}</p>
        </div>

        <div className="card p-6">
          {sent ? (<div className="text-center py-4">
              <lucide_react_1.CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-2">{t('authExtraLogin.resetSent')}</h2>
              <p className="text-sm text-gray-500">{t('authExtraLogin.forgotSubtitle')}</p>
            </div>) : (<form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('authExtraLogin.email')}</label>
                <input type="email" className="input" placeholder="you@example.com" value={email} onChange={function (e) { return setEmail(e.target.value); }} required/>
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? t('common.loading') : t('authExtraLogin.sendReset')}
              </button>
            </form>)}
        </div>

        <react_router_dom_1.Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mt-4 hover:text-brand-900">
          <lucide_react_1.ArrowLeft size={14}/> {t('authExtraLogin.backToLogin')}
        </react_router_dom_1.Link>
      </framer_motion_1.motion.div>
    </div>);
}
