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
exports.default = AiEmotionScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var ImagePicker = require("expo-image-picker");
var api_1 = require("../src/lib/api");
var ORANGE = '#E65100';
function AiEmotionScreen() {
    var _this = this;
    var _a;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, react_1.useState)(null), imageUri = _b[0], setImageUri = _b[1];
    var _c = (0, react_1.useState)(false), analyzing = _c[0], setAnalyzing = _c[1];
    var _d = (0, react_1.useState)(null), result = _d[0], setResult = _d[1];
    var pickImage = function () { return __awaiter(_this, void 0, void 0, function () {
        var status, r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ImagePicker.requestMediaLibraryPermissionsAsync()];
                case 1:
                    status = (_a.sent()).status;
                    if (status !== 'granted') {
                        react_native_1.Alert.alert('Απαιτείται πρόσβαση στη φωτογραφική');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })];
                case 2:
                    r = _a.sent();
                    if (!r.canceled && r.assets[0])
                        setImageUri(r.assets[0].uri);
                    return [2 /*return*/];
            }
        });
    }); };
    var takePhoto = function () { return __awaiter(_this, void 0, void 0, function () {
        var status, r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ImagePicker.requestCameraPermissionsAsync()];
                case 1:
                    status = (_a.sent()).status;
                    if (status !== 'granted') {
                        react_native_1.Alert.alert('Απαιτείται πρόσβαση στην κάμερα');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, ImagePicker.launchCameraAsync({ quality: 0.8 })];
                case 2:
                    r = _a.sent();
                    if (!r.canceled && r.assets[0])
                        setImageUri(r.assets[0].uri);
                    return [2 /*return*/];
            }
        });
    }); };
    var analyze = function () { return __awaiter(_this, void 0, void 0, function () {
        var formData, uploadRes, imageUrl, res, err_1;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!imageUri)
                        return [2 /*return*/];
                    setAnalyzing(true);
                    setResult(null);
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 4, 5, 6]);
                    formData = new FormData();
                    formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' });
                    return [4 /*yield*/, api_1.api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })];
                case 2:
                    uploadRes = _e.sent();
                    imageUrl = ((_a = uploadRes.data) === null || _a === void 0 ? void 0 : _a.url) || ((_b = uploadRes.data) === null || _b === void 0 ? void 0 : _b.file_url);
                    return [4 /*yield*/, api_1.api.post('/ai/emotion', { image_url: imageUrl })];
                case 3:
                    res = _e.sent();
                    setResult(res.data);
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _e.sent();
                    react_native_1.Alert.alert('Σφάλμα', ((_d = (_c = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || 'Σφάλμα ανάλυσης');
                    return [3 /*break*/, 6];
                case 5:
                    setAnalyzing(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var emotionEmoji = { happy: '😊', sad: '😢', anxious: '😰', angry: '😠', neutral: '😐', excited: '🎉', tired: '😴', playful: '🎾' };
    return (<react_native_1.View style={s.container}>
      <react_native_1.View style={s.header}>
        <react_native_1.TouchableOpacity onPress={function () { return router.back(); }}><react_native_1.Text style={s.backText}>‹</react_native_1.Text></react_native_1.TouchableOpacity>
        <react_native_1.Text style={s.title}>AI Emotion</react_native_1.Text>
        <react_native_1.View style={{ width: 32 }}/>
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={{ padding: 16 }}>
        <react_native_1.View style={s.heroBanner}>
          <react_native_1.Text style={s.heroEmoji}>💜</react_native_1.Text>
          <react_native_1.Text style={s.heroTitle}>Τι νιώθει το κατοικίδιό σας;</react_native_1.Text>
          <react_native_1.Text style={s.heroSub}>Ανεβάστε φωτογραφία και το AI θα αναλύσει τα συναισθήματα</react_native_1.Text>
        </react_native_1.View>

        {imageUri ? (<react_native_1.View style={s.imageContainer}>
            <react_native_1.Image source={{ uri: imageUri }} style={s.image} resizeMode="cover"/>
            <react_native_1.TouchableOpacity style={s.removeBtn} onPress={function () { setImageUri(null); setResult(null); }}>
              <react_native_1.Text style={s.removeBtnText}>✕</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>) : (<react_native_1.View style={s.uploadArea}>
            <react_native_1.Text style={s.uploadEmoji}>📸</react_native_1.Text>
            <react_native_1.Text style={s.uploadText}>Επιλέξτε ή τραβήξτε φωτογραφία</react_native_1.Text>
            <react_native_1.View style={s.uploadBtns}>
              <react_native_1.TouchableOpacity style={s.uploadBtn} onPress={takePhoto}>
                <react_native_1.Text style={s.uploadBtnText}>📷 Κάμερα</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={s.uploadBtn} onPress={pickImage}>
                <react_native_1.Text style={s.uploadBtnText}>🖼️ Γκαλερί</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>)}

        {imageUri && !analyzing && !result && (<react_native_1.TouchableOpacity style={s.analyzeBtn} onPress={analyze}>
            <react_native_1.Text style={s.analyzeBtnText}>💜 Ανάλυση Συναισθήματος</react_native_1.Text>
          </react_native_1.TouchableOpacity>)}

        {analyzing && (<react_native_1.View style={s.analyzing}>
            <react_native_1.ActivityIndicator color="#8B5CF6" size="large"/>
            <react_native_1.Text style={s.analyzingText}>Ανάλυση σε εξέλιξη...</react_native_1.Text>
          </react_native_1.View>)}

        {result && (<react_native_1.View style={s.resultCard}>
            <react_native_1.Text style={s.resultEmoji}>{emotionEmoji[result.primary_emotion] || '🐾'}</react_native_1.Text>
            <react_native_1.Text style={s.resultEmotion}>{result.primary_emotion_el || result.primary_emotion}</react_native_1.Text>
            {result.confidence && <react_native_1.Text style={s.confidence}>Βεβαιότητα: {Math.round(result.confidence * 100)}%</react_native_1.Text>}
            {result.description && <react_native_1.Text style={s.description}>{result.description}</react_native_1.Text>}
            {((_a = result.recommendations) === null || _a === void 0 ? void 0 : _a.length) > 0 && (<react_native_1.View style={s.recommendations}>
                <react_native_1.Text style={s.recTitle}>💡 Τι μπορείτε να κάνετε</react_native_1.Text>
                {result.recommendations.map(function (r, i) { return (<react_native_1.Text key={i} style={s.recItem}>• {r}</react_native_1.Text>); })}
              </react_native_1.View>)}
          </react_native_1.View>)}
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
var s = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backText: { color: ORANGE, fontSize: 24, width: 32 },
    title: { fontSize: 17, fontWeight: '700', color: '#111827' },
    heroBanner: { backgroundColor: '#F5F3FF', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16 },
    heroEmoji: { fontSize: 48, marginBottom: 8 },
    heroTitle: { fontSize: 17, fontWeight: '800', color: '#4C1D95', textAlign: 'center', marginBottom: 4 },
    heroSub: { fontSize: 13, color: '#7C3AED', textAlign: 'center' },
    imageContainer: { position: 'relative', marginBottom: 16 },
    image: { width: '100%', height: 240, borderRadius: 16 },
    removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    removeBtnText: { color: '#fff', fontWeight: '700' },
    uploadArea: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#E9D5FF', borderStyle: 'dashed', marginBottom: 16 },
    uploadEmoji: { fontSize: 40, marginBottom: 8 },
    uploadText: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
    uploadBtns: { flexDirection: 'row', gap: 12 },
    uploadBtn: { backgroundColor: '#F5F3FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    uploadBtnText: { color: '#7C3AED', fontWeight: '600' },
    analyzeBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
    analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    analyzing: { alignItems: 'center', padding: 24 },
    analyzingText: { color: '#7C3AED', marginTop: 12, fontSize: 14 },
    resultCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
    resultEmoji: { fontSize: 64, marginBottom: 8 },
    resultEmotion: { fontSize: 24, fontWeight: '900', color: '#4C1D95', marginBottom: 4 },
    confidence: { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },
    description: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
    recommendations: { width: '100%', backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14 },
    recTitle: { fontSize: 14, fontWeight: '700', color: '#4C1D95', marginBottom: 8 },
    recItem: { fontSize: 13, color: '#374151', marginBottom: 6, lineHeight: 20 },
});
