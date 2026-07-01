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
exports.default = AiEmotion;
var react_1 = require("react");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var react_hot_toast_1 = require("react-hot-toast");
var emotionColors = {
    happy: 'green', calm: 'blue', anxious: 'yellow', fearful: 'red',
    excited: 'orange', playful: 'pink', tired: 'gray', stressed: 'red', neutral: 'gray'
};
var emotionEmoji = {
    happy: '😊', calm: '😌', anxious: '😰', fearful: '😨',
    excited: '🤩', playful: '😄', tired: '😴', stressed: '😫', neutral: '😐'
};
var speciesOptions = [
    { value: 'dog', label: '🐶 Σκύλος' },
    { value: 'cat', label: '🐱 Γάτα' },
    { value: 'rabbit', label: '🐰 Κουνέλι' },
    { value: 'bird', label: '🐦 Πτηνό' },
    { value: 'other', label: '🐾 Άλλο' },
];
function AiEmotion() {
    var _this = this;
    var _a;
    var user = (0, auth_1.useAuthStore)().user;
    var _b = (0, react_1.useState)('select'), mode = _b[0], setMode = _b[1];
    var _c = (0, react_1.useState)('dog'), species = _c[0], setSpecies = _c[1];
    var _d = (0, react_1.useState)(null), result = _d[0], setResult = _d[1];
    var _e = (0, react_1.useState)(null), liveResult = _e[0], setLiveResult = _e[1];
    var _f = (0, react_1.useState)(false), isAnalyzing = _f[0], setIsAnalyzing = _f[1];
    var _g = (0, react_1.useState)(false), isRecording = _g[0], setIsRecording = _g[1];
    var _h = (0, react_1.useState)(null), uploadedImage = _h[0], setUploadedImage = _h[1];
    var _j = (0, react_1.useState)(null), uploadedVideo = _j[0], setUploadedVideo = _j[1];
    var _k = (0, react_1.useState)(null), videoPreview = _k[0], setVideoPreview = _k[1];
    var _l = (0, react_1.useState)(null), liveInterval = _l[0], setLiveInterval = _l[1];
    var _m = (0, react_1.useState)(0), frameCount = _m[0], setFrameCount = _m[1];
    var videoRef = (0, react_1.useRef)(null);
    var canvasRef = (0, react_1.useRef)(null);
    var streamRef = (0, react_1.useRef)(null);
    var imageInputRef = (0, react_1.useRef)(null);
    var videoInputRef = (0, react_1.useRef)(null);
    // Cleanup on unmount
    (0, react_1.useEffect)(function () {
        return function () {
            stopLive();
        };
    }, []);
    var startLive = function () { return __awaiter(_this, void 0, void 0, function () {
        var stream, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })];
                case 1:
                    stream = _b.sent();
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                    }
                    setMode('live');
                    setIsRecording(true);
                    react_hot_toast_1.default.success('Κάμερα ενεργοποιήθηκε!');
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('Δεν επιτράπηκε πρόσβαση στην κάμερα');
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var stopLive = (0, react_1.useCallback)(function () {
        if (liveInterval)
            clearInterval(liveInterval);
        if (streamRef.current)
            streamRef.current.getTracks().forEach(function (t) { return t.stop(); });
        setIsRecording(false);
        setLiveInterval(null);
    }, [liveInterval]);
    var captureFrame = (0, react_1.useCallback)(function () {
        if (!videoRef.current || !canvasRef.current)
            return null;
        var canvas = canvasRef.current;
        var video = videoRef.current;
        canvas.width = 640;
        canvas.height = 480;
        var ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        ctx.drawImage(video, 0, 0, 640, 480);
        return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
    }, []);
    var analyzeFrame = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var frame, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    frame = captureFrame();
                    if (!frame)
                        return [2 /*return*/];
                    setFrameCount(function (c) { return c + 1; });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, api_1.api.post('/ai/emotion', {
                            image_base64: frame,
                            media_type: 'image/jpeg',
                            species: species,
                            context: 'Real-time camera analysis'
                        })];
                case 2:
                    data = (_b.sent()).data;
                    setLiveResult(data);
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [captureFrame, species]);
    var startAnalysis = function () {
        var interval = setInterval(analyzeFrame, 4000); // κάθε 4 δευτερόλεπτα
        setLiveInterval(interval);
        analyzeFrame(); // αμέσως
        setMode('result_live');
    };
    var handleImageUpload = function (e) {
        var _a;
        var file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        var reader = new FileReader();
        reader.onload = function () { return setUploadedImage(reader.result); };
        reader.readAsDataURL(file);
        setMode('upload_image');
    };
    var handleVideoUpload = function (e) {
        var _a;
        var file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        setUploadedVideo(file);
        setVideoPreview(URL.createObjectURL(file));
        setMode('upload_video');
    };
    var analyzeUploadedImage = function () { return __awaiter(_this, void 0, void 0, function () {
        var base64, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!uploadedImage)
                        return [2 /*return*/];
                    setMode('analyzing');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    base64 = uploadedImage.split(',')[1];
                    return [4 /*yield*/, api_1.api.post('/ai/emotion', {
                            image_base64: base64,
                            media_type: 'image/jpeg',
                            species: species,
                        })];
                case 2:
                    data = (_b.sent()).data;
                    setResult(data);
                    setMode('result_upload');
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('Σφάλμα ανάλυσης');
                    setMode('upload_image');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var analyzeUploadedVideo = function () { return __awaiter(_this, void 0, void 0, function () {
        var frames_1, video_1, duration, frameCount_1, canvas, ctx, i, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!uploadedVideo || !videoRef.current)
                        return [2 /*return*/];
                    setMode('analyzing');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    frames_1 = [];
                    video_1 = document.createElement('video');
                    video_1.src = videoPreview;
                    video_1.muted = true;
                    return [4 /*yield*/, new Promise(function (res) { video_1.onloadedmetadata = res; })];
                case 2:
                    _a.sent();
                    duration = Math.min(video_1.duration, 30) // max 30 sec
                    ;
                    frameCount_1 = Math.min(5, Math.floor(duration));
                    canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    ctx = canvas.getContext('2d');
                    i = 0;
                    _a.label = 3;
                case 3:
                    if (!(i < frameCount_1)) return [3 /*break*/, 6];
                    video_1.currentTime = (duration / frameCount_1) * i;
                    return [4 /*yield*/, new Promise(function (res) { video_1.onseeked = res; })];
                case 4:
                    _a.sent();
                    ctx.drawImage(video_1, 0, 0, 640, 480);
                    frames_1.push(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                    _a.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, api_1.api.post('/ai/emotion/video', {
                        frames: frames_1,
                        species: species,
                        duration_seconds: Math.round(duration),
                    })];
                case 7:
                    data = (_a.sent()).data;
                    setResult(data);
                    setMode('result_upload');
                    return [3 /*break*/, 9];
                case 8:
                    err_1 = _a.sent();
                    react_hot_toast_1.default.error('Σφάλμα ανάλυσης βίντεο');
                    setMode('upload_video');
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var reset = function () {
        stopLive();
        setMode('select');
        setResult(null);
        setLiveResult(null);
        setUploadedImage(null);
        setUploadedVideo(null);
        setVideoPreview(null);
        setFrameCount(0);
    };
    var getEmotionColor = function (emotion) { return emotionColors[emotion] || 'gray'; };
    var WelfareBar = function (_a) {
        var score = _a.score;
        return (<div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
      <div className={"h-3 rounded-full transition-all ".concat(score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: "".concat(score * 10, "%") }}/>
    </div>);
    };
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <lucide_react_1.Brain size={32} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">AI Emotional Intelligence</h1>
          <p className="text-gray-500 text-sm">Ανάλυση συναισθημάτων κατοικίδιου μέσω κάμερας ή βίντεο</p>
          <span className="inline-block mt-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
            🧪 Emerging Technology — Beta
          </span>
        </div>

        <framer_motion_1.AnimatePresence mode="wait">

          {/* Select mode */}
          {mode === 'select' && (<framer_motion_1.motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Species selector */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Είδος κατοικίδιου</p>
                <div className="flex flex-wrap gap-2">
                  {speciesOptions.map(function (s) { return (<button key={s.value} onClick={function () { return setSpecies(s.value); }} className={"px-3 py-2 rounded-xl text-sm font-medium border transition-all ".concat(species === s.value ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                      {s.label}
                    </button>); })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={startLive} className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-purple-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <lucide_react_1.Camera size={28} className="text-purple-500"/>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ζωντανή Κάμερα</h3>
                  <p className="text-xs text-gray-400">Real-time ανάλυση κάθε 4 δευτερόλεπτα</p>
                </button>

                <button onClick={function () { var _a; return (_a = imageInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-pink-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <lucide_react_1.Upload size={28} className="text-pink-500"/>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Φωτογραφία</h3>
                  <p className="text-xs text-gray-400">Ανάλυση μιας εικόνας</p>
                </button>

                <button onClick={function () { var _a; return (_a = videoInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-indigo-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <lucide_react_1.Play size={28} className="text-indigo-500"/>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Βίντεο</h3>
                  <p className="text-xs text-gray-400">Ανάλυση από πολλαπλά frames</p>
                </button>
              </div>

              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload}/>

              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
                <strong>⚠️ Beta:</strong> Η ανάλυση συναισθημάτων βασίζεται σε γλώσσα σώματος και είναι ενδεικτική. Δεν υποκαθιστά κτηνιατρική αξιολόγηση.
              </div>
            </framer_motion_1.motion.div>)}

          {/* Live camera */}
          {(mode === 'live' || mode === 'result_live') && (<framer_motion_1.motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm mb-4">
                <div className="relative">
                  <video ref={videoRef} className="w-full max-h-80 object-cover bg-black" autoPlay muted playsInline/>
                  <canvas ref={canvasRef} className="hidden"/>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"/>
                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg">LIVE</span>
                  </div>
                  {mode === 'result_live' && (<div className="absolute top-3 right-3 bg-black/50 px-2 py-1 rounded-lg text-white text-xs">
                      {frameCount} frames αναλύθηκαν
                    </div>)}
                </div>
                <div className="p-4 flex gap-2">
                  {mode === 'live' && (<button onClick={startAnalysis} className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                      <lucide_react_1.Brain size={16}/> Έναρξη Ανάλυσης
                    </button>)}
                  {mode === 'result_live' && (<button onClick={function () { if (liveInterval)
                clearInterval(liveInterval); setLiveInterval(null); }} className="flex-1 py-2.5 bg-gray-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                      <lucide_react_1.Square size={16}/> Παύση
                    </button>)}
                  <button onClick={reset} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400">
                    <lucide_react_1.X size={16}/>
                  </button>
                </div>
              </div>

              {/* Live result */}
              {liveResult && (<framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl">{emotionEmoji[liveResult.emotion] || '🐾'}</span>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{liveResult.emotion_el}</p>
                      <p className="text-sm text-gray-400">Βεβαιότητα: {Math.round(liveResult.confidence * 100)}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Επίπεδο Ενέργειας</p>
                      <WelfareBar score={liveResult.energy_level}/>
                      <p className="text-xs text-gray-500 mt-1">{liveResult.energy_level}/10</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Welfare Score</p>
                      <WelfareBar score={liveResult.welfare_score}/>
                      <p className="text-xs text-gray-500 mt-1">{liveResult.welfare_score}/10</p>
                    </div>
                  </div>
                  {liveResult.advice && (<div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-sm text-purple-800 dark:text-purple-300">
                      💡 {liveResult.advice}
                    </div>)}
                </framer_motion_1.motion.div>)}
            </framer_motion_1.motion.div>)}

          {/* Image upload */}
          {mode === 'upload_image' && uploadedImage && (<framer_motion_1.motion.div key="img" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm mb-4">
                <img src={uploadedImage} alt="upload" className="w-full max-h-80 object-contain bg-gray-100 dark:bg-gray-800"/>
                <div className="p-4 flex gap-2">
                  <button onClick={analyzeUploadedImage} className="flex-1 py-2.5 bg-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                    <lucide_react_1.Brain size={16}/> Ανάλυση Εικόνας
                  </button>
                  <button onClick={reset} className="px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500"><lucide_react_1.X size={16}/></button>
                </div>
              </div>
            </framer_motion_1.motion.div>)}

          {/* Video upload */}
          {mode === 'upload_video' && videoPreview && (<framer_motion_1.motion.div key="vid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm mb-4">
                <video src={videoPreview} controls className="w-full max-h-80 bg-black"/>
                <div className="p-4 flex gap-2">
                  <button onClick={analyzeUploadedVideo} className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                    <lucide_react_1.Brain size={16}/> Ανάλυση Βίντεο
                  </button>
                  <button onClick={reset} className="px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500"><lucide_react_1.X size={16}/></button>
                </div>
              </div>
            </framer_motion_1.motion.div>)}

          {/* Analyzing */}
          {mode === 'analyzing' && (<framer_motion_1.motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-900 rounded-2xl p-12 shadow-sm text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <lucide_react_1.Brain size={36} className="text-white"/>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ανάλυση συναισθημάτων...</h2>
              <p className="text-gray-400 text-sm mb-4">Το AI διαβάζει τη γλώσσα σώματος</p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(function (i) { return <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "".concat(i * 0.15, "s") }}/>; })}
              </div>
            </framer_motion_1.motion.div>)}

          {/* Upload Result */}
          {mode === 'result_upload' && result && (<framer_motion_1.motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Main emotion */}
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-6xl">{emotionEmoji[result.overall_emotion || result.emotion] || '🐾'}</span>
                  <div>
                    <p className="text-3xl font-bold">{result.overall_emotion_el || result.emotion_el}</p>
                    <p className="text-purple-200 text-sm">Βεβαιότητα: {Math.round((result.confidence || 0) * 100)}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-purple-200 text-xs mb-1">Επίπεδο Ενέργειας</p>
                    <div className="bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full" style={{ width: "".concat((result.energy_level || 5) * 10, "%") }}/></div>
                    <p className="text-white/80 text-xs mt-1">{result.energy_level}/10</p>
                  </div>
                  <div>
                    <p className="text-purple-200 text-xs mb-1">Welfare Score</p>
                    <div className="bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full" style={{ width: "".concat((result.welfare_score || 5) * 10, "%") }}/></div>
                    <p className="text-white/80 text-xs mt-1">{result.welfare_score}/10</p>
                  </div>
                </div>
              </div>

              {/* Body language */}
              {(result.body_language || result.body_language_summary) && (<div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🐾 Γλώσσα Σώματος</h3>
                  {result.body_language_summary && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{result.body_language_summary}</p>}
                  {result.body_language && (<div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.body_language).map(function (_a) {
                        var key = _a[0], val = _a[1];
                        return (<div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                          <p className="text-xs font-medium text-gray-500 capitalize mb-0.5">{key}</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300">{val}</p>
                        </div>);
                    })}
                    </div>)}
                </div>)}

              {/* Observations */}
              {((_a = (result.observations || result.key_observations)) === null || _a === void 0 ? void 0 : _a.length) > 0 && (<div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🔍 Παρατηρήσεις</h3>
                  <ul className="space-y-2">
                    {(result.observations || result.key_observations).map(function (o, i) { return (<li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0"/>
                        {o}
                      </li>); })}
                  </ul>
                </div>)}

              {/* Needs attention */}
              {result.needs_attention && (<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
                  <lucide_react_1.AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5"/>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">Χρειάζεται προσοχή</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{result.attention_reason}</p>
                  </div>
                </div>)}

              {/* Advice */}
              {result.advice && (<div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">💡 Συμβουλή</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">{result.advice}</p>
                </div>)}

              <button onClick={reset} className="w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                Νέα Ανάλυση
              </button>
            </framer_motion_1.motion.div>)}
        </framer_motion_1.AnimatePresence>
      </div>
    </div>);
}
