"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChangeMyPasswordCard;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var react_hot_toast_1 = require("react-hot-toast");
function ChangeMyPasswordCard() {
    var _a = (0, react_1.useState)(''), currentPassword = _a[0], setCurrentPassword = _a[1];
    var _b = (0, react_1.useState)(''), newPassword = _b[0], setNewPassword = _b[1];
    var _c = (0, react_1.useState)(''), confirm = _c[0], setConfirm = _c[1];
    var _d = (0, react_1.useState)(false), showCurrent = _d[0], setShowCurrent = _d[1];
    var _e = (0, react_1.useState)(false), showNew = _e[0], setShowNew = _e[1];
    var _f = (0, react_1.useState)(false), success = _f[0], setSuccess = _f[1];
    var changePassword = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/users/me/password', { current_password: currentPassword, new_password: newPassword }); },
        onSuccess: function () {
            react_hot_toast_1.default.success('Ο κωδικός άλλαξε επιτυχώς');
            setCurrentPassword('');
            setNewPassword('');
            setConfirm('');
            setSuccess(true);
            setTimeout(function () { return setSuccess(false); }, 3000);
        },
        onError: function (err) {
            var _a, _b;
            react_hot_toast_1.default.error(((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα κατά την αλλαγή κωδικού');
        }
    });
    var handleSubmit = function (e) {
        e.preventDefault();
        if (newPassword.length < 6) {
            react_hot_toast_1.default.error('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
            return;
        }
        if (newPassword !== confirm) {
            react_hot_toast_1.default.error('Οι κωδικοί δεν ταιριάζουν');
            return;
        }
        if (currentPassword === newPassword) {
            react_hot_toast_1.default.error('Ο νέος κωδικός είναι ίδιος με τον τρέχοντα');
            return;
        }
        changePassword.mutate();
    };
    return (<div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <lucide_react_1.Key size={18} className="text-brand-900"/>
        <h3 className="font-bold text-gray-900 dark:text-white">Αλλαγή κωδικού</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Τρέχων κωδικός</label>
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={currentPassword} onChange={function (e) { return setCurrentPassword(e.target.value); }} required/>
            <button type="button" onClick={function () { return setShowCurrent(!showCurrent); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showCurrent ? <lucide_react_1.EyeOff size={16}/> : <lucide_react_1.Eye size={16}/>}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Νέος κωδικός</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={newPassword} onChange={function (e) { return setNewPassword(e.target.value); }} required minLength={6}/>
            <button type="button" onClick={function () { return setShowNew(!showNew); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showNew ? <lucide_react_1.EyeOff size={16}/> : <lucide_react_1.Eye size={16}/>}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Επιβεβαίωση νέου κωδικού</label>
          <input type={showNew ? 'text' : 'password'} className="input" placeholder="••••••••" value={confirm} onChange={function (e) { return setConfirm(e.target.value); }} required/>
        </div>

        <button type="submit" disabled={changePassword.isPending || !currentPassword || !newPassword || newPassword !== confirm} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
          {success ? (<><lucide_react_1.Check size={16}/> Επιτυχώς</>) : changePassword.isPending ? ('Αλλαγή...') : (<><lucide_react_1.Key size={16}/> Αλλαγή κωδικού</>)}
        </button>
      </form>
    </div>);
}
