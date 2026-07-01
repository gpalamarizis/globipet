"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChangePasswordModal;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
function ChangePasswordModal(_a) {
    var user = _a.user, onClose = _a.onClose;
    var _b = (0, react_1.useState)(''), password = _b[0], setPassword = _b[1];
    var _c = (0, react_1.useState)(''), confirm = _c[0], setConfirm = _c[1];
    var _d = (0, react_1.useState)(false), showPass = _d[0], setShowPass = _d[1];
    var changePassword = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.patch("/admin/users/".concat(user.id), { password: password }); },
        onSuccess: function () {
            react_hot_toast_1.default.success('Ο κωδικός άλλαξε επιτυχώς');
            setPassword('');
            setConfirm('');
            onClose();
        },
        onError: function (err) {
            var _a, _b;
            react_hot_toast_1.default.error(((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα κατά την αλλαγή κωδικού');
        }
    });
    var handleSubmit = function (e) {
        e.preventDefault();
        if (password.length < 6) {
            react_hot_toast_1.default.error('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
            return;
        }
        if (password !== confirm) {
            react_hot_toast_1.default.error('Οι κωδικοί δεν ταιριάζουν');
            return;
        }
        changePassword.mutate();
    };
    return (<framer_motion_1.AnimatePresence>
      {user && (<>
          <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={onClose}/>
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <lucide_react_1.Key size={20} className="text-brand-900"/>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Αλλαγή κωδικού</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <lucide_react_1.X size={18}/>
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Χρήστης</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Νέος κωδικός</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={password} onChange={function (e) { return setPassword(e.target.value); }} required minLength={6} autoFocus/>
                  <button type="button" onClick={function () { return setShowPass(!showPass); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <lucide_react_1.EyeOff size={16}/> : <lucide_react_1.Eye size={16}/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Επιβεβαίωση</label>
                <input type={showPass ? 'text' : 'password'} className="input" placeholder="••••••••" value={confirm} onChange={function (e) { return setConfirm(e.target.value); }} required/>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-xs text-yellow-800 dark:text-yellow-300">
                ⚠️ Ο χρήστης θα πρέπει να συνδεθεί ξανά με τον νέο κωδικό.
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Ακύρωση
                </button>
                <button type="submit" disabled={changePassword.isPending || password.length < 6 || password !== confirm} className="btn-primary flex-1">
                  {changePassword.isPending ? 'Αλλαγή...' : 'Αλλαγή κωδικού'}
                </button>
              </div>
            </form>
          </framer_motion_1.motion.div>
        </>)}
    </framer_motion_1.AnimatePresence>);
}
