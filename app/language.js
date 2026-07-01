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
exports.default = LanguageScreen;
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_i18next_1 = require("react-i18next");
var i18n_1 = require("../lib/i18n");
function LanguageScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_i18next_1.useTranslation)(), t = _a.t, i18n = _a.i18n;
    var currentLang = i18n.language;
    var handleSelect = function (code) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, i18n_1.changeLanguage)(code)];
                case 1:
                    _a.sent();
                    router.back();
                    return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.Pressable onPress={function () { return router.back(); }}>
          <react_native_1.Text style={s.back}>← {t('common.back')}</react_native_1.Text>
        </react_native_1.Pressable>
        <react_native_1.Text style={s.title}>{t('language.title')}</react_native_1.Text>
        <react_native_1.View style={{ width: 60 }}/>
      </react_native_1.View>
      <react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
        <react_native_1.Text style={s.subtitle}>{t('language.subtitle')}</react_native_1.Text>
        {i18n_1.SUPPORTED_LANGUAGES.map(function (lang) { return (<react_native_1.Pressable key={lang.code} onPress={function () { return handleSelect(lang.code); }} style={[s.langCard, currentLang === lang.code && s.langCardActive]}>
            <react_native_1.Text style={s.flag}>{lang.flag}</react_native_1.Text>
            <react_native_1.Text style={[s.langName, currentLang === lang.code && s.langNameActive]}>{lang.name}</react_native_1.Text>
            {currentLang === lang.code && <react_native_1.Text style={s.check}>✓</react_native_1.Text>}
          </react_native_1.Pressable>); })}
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    back: { color: '#E65100', fontSize: 15, fontWeight: '600' },
    title: { fontSize: 18, fontWeight: '800', color: '#111827' },
    subtitle: { color: '#6B7280', fontSize: 14, marginBottom: 16 },
    langCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
    langCardActive: { borderColor: '#E65100', backgroundColor: '#FFF7ED' },
    flag: { fontSize: 28, marginRight: 12 },
    langName: { flex: 1, fontSize: 16, fontWeight: '500', color: '#111827' },
    langNameActive: { color: '#E65100', fontWeight: '700' },
    check: { fontSize: 22, color: '#E65100', fontWeight: '700' },
});
