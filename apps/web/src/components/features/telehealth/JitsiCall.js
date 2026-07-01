"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JitsiCall;
var react_1 = require("react");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
function JitsiCall(_a) {
    var roomName = _a.roomName, vetName = _a.vetName, onEnd = _a.onEnd;
    var user = (0, auth_1.useAuthStore)().user;
    var _b = (0, react_1.useState)(false), muted = _b[0], setMuted = _b[1];
    var _c = (0, react_1.useState)(false), videoOff = _c[0], setVideoOff = _c[1];
    var _d = (0, react_1.useState)(false), chatOpen = _d[0], setChatOpen = _d[1];
    var jitsiUrl = "https://meet.jit.si/".concat(roomName, "#userInfo.displayName=\"").concat(encodeURIComponent((user === null || user === void 0 ? void 0 : user.full_name) || 'Guest'), "\"&config.startWithAudioMuted=").concat(muted, "&config.startWithVideoMuted=").concat(videoOff, "&config.toolbarButtons=[]&config.disableDeepLinking=true&config.prejoinPageEnabled=false");
    return (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
          <span className="text-white font-medium text-sm">{vetName}</span>
          <span className="text-gray-400 text-xs">Τηλεϊατρική Συνεδρία</span>
        </div>
        <button onClick={onEnd} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          <lucide_react_1.X size={18}/>
        </button>
      </div>

      <div className="flex-1 relative">
        <iframe src={jitsiUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" className="w-full h-full border-0" title="Jitsi Meet"/>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900 border-t border-gray-800">
        <button onClick={function () { return setMuted(!muted); }} className={(0, utils_1.cn)('w-12 h-12 rounded-full flex items-center justify-center transition-all', muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {muted ? <lucide_react_1.MicOff size={20}/> : <lucide_react_1.Mic size={20}/>}
        </button>
        <button onClick={function () { return setVideoOff(!videoOff); }} className={(0, utils_1.cn)('w-12 h-12 rounded-full flex items-center justify-center transition-all', videoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {videoOff ? <lucide_react_1.VideoOff size={20}/> : <lucide_react_1.Video size={20}/>}
        </button>
        <button onClick={function () { return setChatOpen(!chatOpen); }} className="w-12 h-12 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center transition-all">
          <lucide_react_1.MessageSquare size={20}/>
        </button>
        <button onClick={onEnd} className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-all shadow-lg">
          <lucide_react_1.PhoneOff size={24}/>
        </button>
      </div>
    </framer_motion_1.motion.div>);
}
