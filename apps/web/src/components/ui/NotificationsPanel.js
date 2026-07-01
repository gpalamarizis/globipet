"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotificationsPanel;
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var framer_motion_1 = require("framer-motion");
function NotificationsPanel(_a) {
    var open = _a.open, onClose = _a.onClose;
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['notifications'],
        queryFn: function () { return api_1.api.get('/notifications?limit=20').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: open,
    }).data, notifications = _b === void 0 ? [] : _b;
    return (<framer_motion_1.AnimatePresence>
      {open && (<>
          <div className="fixed inset-0 z-40" onClick={onClose}/>
          <framer_motion_1.motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }} className="fixed top-16 right-4 z-50 w-80 card shadow-modal overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-sm flex items-center gap-2"><lucide_react_1.Bell size={16}/>Ειδοποιήσεις</h3>
              <button onClick={onClose} className="btn-ghost p-1"><lucide_react_1.X size={16}/></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (<div className="text-center py-8 text-sm text-gray-400">Δεν υπάρχουν ειδοποιήσεις</div>) : notifications.map(function (n) { return (<div key={n.id} className={(0, utils_1.cn)('px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors', !n.is_read && 'bg-brand-50/50 dark:bg-brand-900/10')}>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(0, utils_1.formatRelativeTime)(n.created_at)}</p>
                </div>); })}
            </div>
          </framer_motion_1.motion.div>
        </>)}
    </framer_motion_1.AnimatePresence>);
}
