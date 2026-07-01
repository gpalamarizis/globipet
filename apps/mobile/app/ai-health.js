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
exports.default = AiHealthScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var ImagePicker = require("expo-image-picker");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_native_1 = require("lucide-react-native");
var api_1 = require("../src/lib/api");
var auth_1 = require("../src/store/auth");
function AiHealthScreen() {
    var _this = this;
    var _a, _b, _c;
    var router = (0, expo_router_1.useRouter)();
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _d = (0, react_1.useState)(null), imageUri = _d[0], setImageUri = _d[1];
    var _e = (0, react_1.useState)('skin'), analysisType = _e[0], setAnalysisType = _e[1];
    var _f = (0, react_1.useState)(null), result = _f[0], setResult = _f[1];
    var status = (0, react_query_1.useQuery)({
        queryKey: ['ai-subscription-status'],
        queryFn: function () { return api_1.api.get('/ai-subscriptions/my-status').then(function (r) { var _a; return (_a = r.data) === null || _a === void 0 ? void 0 : _a.data; }); },
        enabled: isAuthenticated,
    }).data;
    var startTrial = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/ai-subscriptions/start-trial'); },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['ai-subscription-status'] }); },
    });
    var canUseAi = (status === null || status === void 0 ? void 0 : status.ai_subscription_status) === 'trial' || (status === null || status === void 0 ? void 0 : status.ai_subscription_status) === 'active';
    var pickImage = function (fromCamera) { return __awaiter(_this, void 0, void 0, function () {
        var permission, _a, result, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!fromCamera) return [3 /*break*/, 2];
                    return [4 /*yield*/, ImagePicker.requestCameraPermissionsAsync()];
                case 1:
                    _a = _d.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, ImagePicker.requestMediaLibraryPermissionsAsync()];
                case 3:
                    _a = _d.sent();
                    _d.label = 4;
                case 4:
                    permission = _a;
                    if (!permission.granted) {
                        react_native_1.Alert.alert('Άδεια απαιτείται', 'Χρειαζόμαστε πρόσβαση για να συνεχίσουμε.');
                        return [2 /*return*/];
                    }
                    if (!fromCamera) return [3 /*break*/, 6];
                    return [4 /*yield*/, ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })];
                case 5:
                    _b = _d.sent();
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })];
                case 7:
                    _b = _d.sent();
                    _d.label = 8;
                case 8:
                    result = _b;
                    if (!result.canceled && ((_c = result.assets) === null || _c === void 0 ? void 0 : _c[0])) {
                        setImageUri(result.assets[0].uri);
                        setResult(null);
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var analyze = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var formData, filename, uploadRes, imageUrl, analysisRes;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!imageUri)
                            throw new Error('Δεν επιλέχθηκε εικόνα');
                        formData = new FormData();
                        filename = imageUri.split('/').pop() || 'photo.jpg';
                        formData.append('file', { uri: imageUri, name: filename, type: 'image/jpeg' });
                        formData.append('folder', 'ai-health');
                        return [4 /*yield*/, api_1.api.post('/upload?folder=ai-health', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                            })];
                    case 1:
                        uploadRes = _b.sent();
                        imageUrl = (_a = uploadRes.data) === null || _a === void 0 ? void 0 : _a.url;
                        return [4 /*yield*/, api_1.api.post('/ai/pet-health', {
                                image_url: imageUrl,
                                analysis_type: analysisType,
                            })];
                    case 2:
                        analysisRes = _b.sent();
                        return [2 /*return*/, analysisRes.data];
                }
            });
        }); },
        onSuccess: function (data) { return setResult(data); },
        onError: function (err) { var _a, _b; return react_native_1.Alert.alert('Σφάλμα', ((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Η ανάλυση απέτυχε. Δοκίμασε ξανά.'); },
    });
    var severityColor = function (sev) {
        return sev === 'high' ? '#DC2626' : sev === 'medium' ? '#D97706' : '#16A34A';
    };
    // Gate: not authenticated
    if (!isAuthenticated) {
        return (<react_native_1.View style={s.center}>
        <lucide_react_native_1.Brain size={40} color="#E65100"/>
        <react_native_1.Text style={s.gateTitle}>Σύνδεση απαιτείται</react_native_1.Text>
        <react_native_1.TouchableOpacity style={s.cta} onPress={function () { return router.push('/auth/login'); }}>
          <react_native_1.Text style={s.ctaText}>Σύνδεση</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>);
    }
    // Gate: no active trial/subscription
    if (!canUseAi) {
        return (<react_native_1.View style={s.center}>
        <lucide_react_native_1.Brain size={40} color="#E65100"/>
        <react_native_1.Text style={s.gateTitle}>
          {(status === null || status === void 0 ? void 0 : status.ai_subscription_status) === 'expired' ? 'Το trial σου έληξε' : 'Ξεκίνα το δωρεάν trial'}
        </react_native_1.Text>
        <react_native_1.Text style={s.gateSub}>
          {(status === null || status === void 0 ? void 0 : status.ai_subscription_status) === 'expired'
                ? 'Συνδρομήσε για να συνεχίσεις να χρησιμοποιείς το AI Health Check.'
                : '15 μέρες δωρεάν πρόσβαση σε όλα τα εργαλεία AI υγείας.'}
        </react_native_1.Text>
        {(status === null || status === void 0 ? void 0 : status.ai_subscription_status) === 'expired' ? (<react_native_1.TouchableOpacity style={s.cta} onPress={function () { return router.push('/medical-center'); }}>
            <react_native_1.Text style={s.ctaText}>Δες πλάνα συνδρομής</react_native_1.Text>
          </react_native_1.TouchableOpacity>) : (<react_native_1.TouchableOpacity style={s.cta} onPress={function () { return startTrial.mutate(); }} disabled={startTrial.isPending}>
            {startTrial.isPending ? <react_native_1.ActivityIndicator color="#fff"/> : <react_native_1.Text style={s.ctaText}>Δοκίμασε δωρεάν</react_native_1.Text>}
          </react_native_1.TouchableOpacity>)}
      </react_native_1.View>);
    }
    return (<react_native_1.ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <react_native_1.TouchableOpacity onPress={function () { return router.back(); }} style={{ marginBottom: 16 }}>
        <react_native_1.Text style={s.backText}>← Πίσω</react_native_1.Text>
      </react_native_1.TouchableOpacity>

      <react_native_1.Text style={s.title}>AI Health Check</react_native_1.Text>
      <react_native_1.Text style={s.sub}>Ανέβασε φωτογραφία δέρματος ή ματιού για άμεση ανάλυση</react_native_1.Text>

      {/* Analysis type selector */}
      <react_native_1.View style={s.typeRow}>
        <react_native_1.TouchableOpacity style={[s.typeBtn, analysisType === 'skin' && s.typeBtnActive]} onPress={function () { return setAnalysisType('skin'); }}>
          <react_native_1.Text style={[s.typeBtnText, analysisType === 'skin' && s.typeBtnTextActive]}>🩹 Δέρμα</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={[s.typeBtn, analysisType === 'eye' && s.typeBtnActive]} onPress={function () { return setAnalysisType('eye'); }}>
          <react_native_1.Text style={[s.typeBtnText, analysisType === 'eye' && s.typeBtnTextActive]}>👁️ Μάτι</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Image preview / picker */}
      {imageUri ? (<react_native_1.Image source={{ uri: imageUri }} style={s.preview}/>) : (<react_native_1.View style={s.placeholder}>
          <lucide_react_native_1.Image size={32} color="#D1D5DB"/>
          <react_native_1.Text style={s.placeholderText}>Δεν έχει επιλεγεί φωτογραφία</react_native_1.Text>
        </react_native_1.View>)}

      <react_native_1.View style={s.pickRow}>
        <react_native_1.TouchableOpacity style={s.pickBtn} onPress={function () { return pickImage(true); }}>
          <lucide_react_native_1.Camera size={16} color="#E65100"/>
          <react_native_1.Text style={s.pickBtnText}>Κάμερα</react_native_1.Text>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity style={s.pickBtn} onPress={function () { return pickImage(false); }}>
          <lucide_react_native_1.Image size={16} color="#E65100"/>
          <react_native_1.Text style={s.pickBtnText}>Βιβλιοθήκη</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      <react_native_1.TouchableOpacity style={[s.analyzeBtn, (!imageUri || analyze.isPending) && { opacity: 0.5 }]} onPress={function () { return analyze.mutate(); }} disabled={!imageUri || analyze.isPending}>
        {analyze.isPending ? <react_native_1.ActivityIndicator color="#fff"/> : <react_native_1.Text style={s.analyzeBtnText}>Ανάλυση με AI</react_native_1.Text>}
      </react_native_1.TouchableOpacity>

      {/* Results */}
      {result && (<react_native_1.View style={s.resultCard}>
          <react_native_1.View style={s.resultHeader}>
            <react_native_1.View style={[s.severityDot, { backgroundColor: severityColor(result.severity) }]}/>
            <react_native_1.Text style={s.resultSeverity}>Σοβαρότητα: {result.severity === 'high' ? 'Υψηλή' : result.severity === 'medium' ? 'Μέτρια' : 'Χαμηλή'}</react_native_1.Text>
          </react_native_1.View>

          {((_a = result.findings) === null || _a === void 0 ? void 0 : _a.length) > 0 && (<react_native_1.View style={s.resultSection}>
              <react_native_1.Text style={s.resultLabel}>Ευρήματα</react_native_1.Text>
              {result.findings.map(function (f, i) { return <react_native_1.Text key={i} style={s.resultItem}>• {f}</react_native_1.Text>; })}
            </react_native_1.View>)}

          {((_b = result.conditions) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<react_native_1.View style={s.resultSection}>
              <react_native_1.Text style={s.resultLabel}>Πιθανές καταστάσεις</react_native_1.Text>
              {result.conditions.map(function (c, i) { return <react_native_1.Text key={i} style={s.resultItem}>• {c}</react_native_1.Text>; })}
            </react_native_1.View>)}

          {((_c = result.comparison_sources) === null || _c === void 0 ? void 0 : _c.length) > 0 && (<react_native_1.View style={s.resultSection}>
              <react_native_1.Text style={s.resultLabel}>Πηγές σύγκρισης</react_native_1.Text>
              {result.comparison_sources.map(function (src, i) { return <react_native_1.Text key={i} style={s.resultItemMuted}>{src}</react_native_1.Text>; })}
            </react_native_1.View>)}

          <react_native_1.View style={s.resultSection}>
            <react_native_1.Text style={s.resultLabel}>Σύσταση</react_native_1.Text>
            <react_native_1.Text style={s.resultText}>{result.recommendation}</react_native_1.Text>
          </react_native_1.View>

          {result.urgency && (<react_native_1.View style={s.urgencyBox}>
              <lucide_react_native_1.AlertTriangle size={14} color="#D97706"/>
              <react_native_1.Text style={s.urgencyText}>{result.urgency}</react_native_1.Text>
            </react_native_1.View>)}

          <react_native_1.Text style={s.disclaimer}>{result.disclaimer}</react_native_1.Text>
        </react_native_1.View>)}
    </react_native_1.ScrollView>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F9FAFB' },
    backText: { color: '#E65100', fontSize: 14, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
    sub: { fontSize: 13, color: '#6B7280', marginBottom: 18 },
    gateTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 14, marginBottom: 6, textAlign: 'center' },
    gateSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 18, lineHeight: 19 },
    cta: { backgroundColor: '#E65100', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24 },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    typeBtnActive: { backgroundColor: '#E65100', borderColor: '#E65100' },
    typeBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
    typeBtnTextActive: { color: '#fff' },
    preview: { width: '100%', height: 220, borderRadius: 16, marginBottom: 14 },
    placeholder: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 14, gap: 8 },
    placeholderText: { fontSize: 12, color: '#9CA3AF' },
    pickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: '#FFF3E0' },
    pickBtnText: { fontSize: 13, fontWeight: '600', color: '#E65100' },
    analyzeBtn: { backgroundColor: '#111827', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
    analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    resultCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginTop: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    severityDot: { width: 10, height: 10, borderRadius: 5 },
    resultSeverity: { fontSize: 14, fontWeight: '700', color: '#111827' },
    resultSection: { marginBottom: 14 },
    resultLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    resultItem: { fontSize: 13, color: '#374151', marginBottom: 3, lineHeight: 18 },
    resultItemMuted: { fontSize: 11, color: '#9CA3AF', marginBottom: 3, lineHeight: 16 },
    resultText: { fontSize: 13, color: '#374151', lineHeight: 19 },
    urgencyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 12 },
    urgencyText: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17 },
    disclaimer: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', lineHeight: 15 },
});
