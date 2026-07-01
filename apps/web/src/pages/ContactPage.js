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
exports.default = ContactPage;
var react_1 = require("react");
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
function ContactPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, react_1.useState)(''), name = _a[0], setName = _a[1];
    var _b = (0, react_1.useState)(''), email = _b[0], setEmail = _b[1];
    var _c = (0, react_1.useState)(''), subject = _c[0], setSubject = _c[1];
    var _d = (0, react_1.useState)(''), message = _d[0], setMessage = _d[1];
    var _e = (0, react_1.useState)(false), submitting = _e[0], setSubmitting = _e[1];
    function handleSubmit(e) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        e.preventDefault();
                        setSubmitting(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, api_1.api.post('/contact', { name: name, email: email, subject: subject, message: message })];
                    case 2:
                        _b.sent();
                        react_hot_toast_1.default.success(t('contact.success'));
                        setName('');
                        setEmail('');
                        setSubject('');
                        setMessage('');
                        return [3 /*break*/, 5];
                    case 3:
                        _a = _b.sent();
                        react_hot_toast_1.default.error(t('contact.error'));
                        return [3 /*break*/, 5];
                    case 4:
                        setSubmitting(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-[#0F2A3F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <lucide_react_1.MessageSquare size={48} className="mx-auto mb-4 text-yellow-400"/>
            <h1 className="text-4xl lg:text-5xl font-display font-black mb-4">{t('contact.title')}</h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">{t('contact.subtitle')}</p>
          </framer_motion_1.motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-3">
                <lucide_react_1.Mail size={20} className="text-brand-900 dark:text-yellow-400"/>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('contact.email')}</h3>
              <a href="mailto:info@globipet.com" className="text-sm text-brand-900 dark:text-yellow-400 hover:underline">info@globipet.com</a>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3">
                <lucide_react_1.Phone size={20} className="text-blue-600 dark:text-blue-400"/>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('contact.phone')}</h3>
              <a href="tel:+302100000000" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+30 210 000 0000</a>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-3">
                <lucide_react_1.MapPin size={20} className="text-orange-600 dark:text-orange-400"/>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('contact.address')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Αθήνα, Ελλάδα</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4">{t('contact.formTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.name')}</label>
                  <input type="text" required value={name} onChange={function (e) { return setName(e.target.value); }} className="input" placeholder={t('contact.namePlaceholder')}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.emailLabel')}</label>
                  <input type="email" required value={email} onChange={function (e) { return setEmail(e.target.value); }} className="input" placeholder="you@example.com"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.subject')}</label>
                <input type="text" required value={subject} onChange={function (e) { return setSubject(e.target.value); }} className="input" placeholder={t('contact.subjectPlaceholder')}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contact.message')}</label>
                <textarea required rows={6} value={message} onChange={function (e) { return setMessage(e.target.value); }} className="input resize-none" placeholder={t('contact.messagePlaceholder')}/>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                {submitting ? t('contact.sending') : (<><lucide_react_1.Send size={16}/> {t('contact.send')}</>)}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>);
}
