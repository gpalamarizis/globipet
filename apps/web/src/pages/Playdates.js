"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Playdates;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var react_hot_toast_1 = require("react-hot-toast");
var eventTypes = [
    { value: 'walk', label: '🚶 Βόλτα' },
    { value: 'play', label: '🎾 Παιχνίδι' },
    { value: 'meetup', label: '🐾 Meetup' },
    { value: 'training', label: '🎓 Εκπαίδευση' },
    { value: 'other', label: '✨ Άλλο' },
];
var petTypeOptions = ['dog', 'cat', 'rabbit', 'bird', 'other'];
var petTypeEmoji = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾' };
function Playdates() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var user = (0, auth_1.useAuthStore)().user;
    var qc = (0, react_query_1.useQueryClient)();
    var _j = (0, react_1.useState)('discover'), tab = _j[0], setTab = _j[1];
    var _k = (0, react_1.useState)(false), showCreateModal = _k[0], setShowCreateModal = _k[1];
    var _l = (0, react_1.useState)(null), showInviteModal = _l[0], setShowInviteModal = _l[1];
    var _m = (0, react_1.useState)('all'), filterType = _m[0], setFilterType = _m[1];
    var _o = (0, react_1.useState)(''), cityFilter = _o[0], setCityFilter = _o[1];
    var _p = (0, react_1.useState)({
        title: '', description: '', event_type: 'meetup',
        date: '', time: '', duration_minutes: 60,
        location: '', city: (user === null || user === void 0 ? void 0 : user.city) || '',
        max_participants: 10, pet_types: [], is_public: true,
    }), form = _p[0], setForm = _p[1];
    var _q = (0, react_1.useState)(''), inviteEmail = _q[0], setInviteEmail = _q[1];
    var _r = (0, react_1.useState)(''), inviteMsg = _r[0], setInviteMsg = _r[1];
    var _s = (0, react_query_1.useQuery)({
        queryKey: ['playdates', cityFilter, filterType],
        queryFn: function () { return api_1.api.get('/playdates', { params: { city: cityFilter || undefined, event_type: filterType !== 'all' ? filterType : undefined } }).then(function (r) { return r.data; }); },
        enabled: !!user,
    }), data = _s.data, isLoading = _s.isLoading;
    var myData = (0, react_query_1.useQuery)({
        queryKey: ['playdates-my'],
        queryFn: function () { return api_1.api.get('/playdates/my').then(function (r) { return r.data; }); },
        enabled: !!user && tab === 'my',
    }).data;
    var createEvent = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/playdates', form); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['playdates'] }); qc.invalidateQueries({ queryKey: ['playdates-my'] }); setShowCreateModal(false); setForm({ title: '', description: '', event_type: 'meetup', date: '', time: '', duration_minutes: 60, location: '', city: (user === null || user === void 0 ? void 0 : user.city) || '', max_participants: 10, pet_types: [], is_public: true }); react_hot_toast_1.default.success('Το event δημιουργήθηκε!'); },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα δημιουργίας'); },
    });
    var sendInvite = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post("/playdates/".concat(showInviteModal, "/invite"), { invitee_email: inviteEmail, message: inviteMsg }); },
        onSuccess: function () { setShowInviteModal(null); setInviteEmail(''); setInviteMsg(''); react_hot_toast_1.default.success('Πρόσκληση στάλθηκε!'); },
        onError: function (e) { return react_hot_toast_1.default.error((e === null || e === void 0 ? void 0 : e.message) || 'Σφάλμα'); },
    });
    var respondInvite = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, status = _a.status;
            return api_1.api.patch("/playdates/invitation/".concat(id), { status: status });
        },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['playdates-my'] }); react_hot_toast_1.default.success('Απάντηση καταχωρήθηκε!'); },
    });
    var deleteEvent = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/playdates/".concat(id)); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['playdates'] }); qc.invalidateQueries({ queryKey: ['playdates-my'] }); react_hot_toast_1.default.success('Διαγράφηκε'); },
    });
    var togglePetType = function (pt) { return setForm(function (f) { return (__assign(__assign({}, f), { pet_types: f.pet_types.includes(pt) ? f.pet_types.filter(function (p) { return p !== pt; }) : __spreadArray(__spreadArray([], f.pet_types, true), [pt], false) })); }); };
    var inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-800 dark:text-white";
    var labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block";
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <lucide_react_1.Dog size={24} className="text-white"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pet Playdates</h1>
              <p className="text-sm text-gray-500">Βρες παρέα για το κατοικίδιό σου</p>
            </div>
          </div>
          <button onClick={function () { return setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
            <lucide_react_1.Plus size={16}/> Νέο Event
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-2xl p-1.5 mb-4 shadow-sm">
          {[{ id: 'discover', label: '🔍 Ανακάλυψη' }, { id: 'my', label: '⭐ Δικά μου' }].map(function (t) { return (<button key={t.id} onClick={function () { return setTab(t.id); }} className={"flex-1 py-2 rounded-xl text-sm font-medium transition-all ".concat(tab === t.id ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400')}>
              {t.label}
            </button>); })}
        </div>

        {tab === 'discover' && (<>
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <input className="flex-1 min-w-32 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none dark:bg-gray-900" placeholder="🏙️ Πόλη..." value={cityFilter} onChange={function (e) { return setCityFilter(e.target.value); }}/>
              <div className="flex gap-1 overflow-x-auto">
                <button onClick={function () { return setFilterType('all'); }} className={"px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ".concat(filterType === 'all' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600')}>Όλα</button>
                {eventTypes.map(function (et) { return (<button key={et.value} onClick={function () { return setFilterType(et.value); }} className={"px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ".concat(filterType === et.value ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600')}>
                    {et.label}
                  </button>); })}
              </div>
            </div>

            {isLoading ? (<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/></div>) : (<>
                {/* Events */}
                {((_a = data === null || data === void 0 ? void 0 : data.events) === null || _a === void 0 ? void 0 : _a.length) > 0 && (<div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📅 Events κοντά σου</h2>
                    <div className="space-y-3">
                      {data.events.map(function (ev) {
                        var _a, _b, _c;
                        return (<div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{((_a = eventTypes.find(function (t) { return t.value === ev.event_type; })) === null || _a === void 0 ? void 0 : _a.label.split(' ')[0]) || '🐾'}</span>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                              </div>
                              {ev.description && <p className="text-sm text-gray-500 mb-2">{ev.description}</p>}
                              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><lucide_react_1.Calendar size={12}/>{ev.date} {ev.time}</span>
                                <span className="flex items-center gap-1"><lucide_react_1.MapPin size={12}/>{ev.location}, {ev.city}</span>
                                <span className="flex items-center gap-1"><lucide_react_1.Users size={12}/>{((_b = ev.invitations) === null || _b === void 0 ? void 0 : _b.length) || 0}/{ev.max_participants}</span>
                              </div>
                            </div>
                            {ev.creator_email === (user === null || user === void 0 ? void 0 : user.email) && (<div className="flex gap-1">
                                <button onClick={function () { return setShowInviteModal(ev.id); }} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg">Πρόσκληση</button>
                                <button onClick={function () { return deleteEvent.mutate(ev.id); }} className="p-1 text-gray-400 hover:text-red-500"><lucide_react_1.X size={14}/></button>
                              </div>)}
                            {ev.creator_email !== (user === null || user === void 0 ? void 0 : user.email) && (<button onClick={function () { return setShowInviteModal(ev.id); }} className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-xl">Συμμετοχή</button>)}
                          </div>
                          {((_c = ev.invitations) === null || _c === void 0 ? void 0 : _c.length) > 0 && (<div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                              <span className="text-xs text-gray-400">Συμμετέχουν:</span>
                              {ev.invitations.slice(0, 5).map(function (inv, i) { return (<div key={i} className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs overflow-hidden">
                                  {inv.invitee_photo ? <img src={inv.invitee_photo} className="w-full h-full object-cover"/> : inv.invitee_name[0]}
                                </div>); })}
                            </div>)}
                        </div>);
                    })}
                    </div>
                  </div>)}

                {/* Nearby owners */}
                {((_b = data === null || data === void 0 ? void 0 : data.nearbyOwners) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<div>
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">👥 Ιδιοκτήτες κοντά σου</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {data.nearbyOwners.map(function (owner) { return (<div key={owner.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                            {owner.profile_photo ? <img src={owner.profile_photo} className="w-full h-full object-cover"/> : <span className="text-green-700 font-semibold text-sm">{owner.full_name[0]}</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{owner.full_name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><lucide_react_1.MapPin size={10}/>{owner.city}</p>
                          </div>
                        </div>); })}
                    </div>
                  </div>)}

                {((_c = data === null || data === void 0 ? void 0 : data.events) === null || _c === void 0 ? void 0 : _c.length) === 0 && ((_d = data === null || data === void 0 ? void 0 : data.nearbyOwners) === null || _d === void 0 ? void 0 : _d.length) === 0 && (<div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
                    <p className="text-4xl mb-3">🐾</p>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">Δεν βρέθηκαν αποτελέσματα</p>
                    <p className="text-sm text-gray-500">Δοκίμασε άλλη πόλη ή δημιούργησε το πρώτο event!</p>
                  </div>)}
              </>)}
          </>)}

        {tab === 'my' && (<div className="space-y-6">
            {/* My events */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📅 Events που δημιούργησα</h2>
              {((_e = myData === null || myData === void 0 ? void 0 : myData.events) === null || _e === void 0 ? void 0 : _e.length) === 0 && <p className="text-sm text-gray-400 text-center py-4">Δεν έχεις δημιουργήσει events ακόμα</p>}
              <div className="space-y-3">
                {(_f = myData === null || myData === void 0 ? void 0 : myData.events) === null || _f === void 0 ? void 0 : _f.map(function (ev) {
                var _a;
                return (<div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={function () { return setShowInviteModal(ev.id); }} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg">+ Πρόσκληση</button>
                        <button onClick={function () { return deleteEvent.mutate(ev.id); }} className="p-1 text-gray-400 hover:text-red-500"><lucide_react_1.X size={14}/></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{ev.date} {ev.time} · {ev.location}</p>
                    <p className="text-xs text-gray-400">{(_a = ev.invitations) === null || _a === void 0 ? void 0 : _a.filter(function (i) { return i.status === 'accepted'; }).length} αποδέχθηκαν</p>
                  </div>);
            })}
              </div>
            </div>

            {/* My invitations */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📬 Προσκλήσεις που έλαβα</h2>
              {((_g = myData === null || myData === void 0 ? void 0 : myData.invitations) === null || _g === void 0 ? void 0 : _g.length) === 0 && <p className="text-sm text-gray-400 text-center py-4">Δεν έχεις λάβει προσκλήσεις ακόμα</p>}
              <div className="space-y-3">
                {(_h = myData === null || myData === void 0 ? void 0 : myData.invitations) === null || _h === void 0 ? void 0 : _h.map(function (inv) { return (<div key={inv.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{inv.event.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{inv.event.date} {inv.event.time} · {inv.event.location}</p>
                    {inv.message && <p className="text-sm text-gray-500 mt-1 italic">"{inv.message}"</p>}
                    {inv.status === 'pending' ? (<div className="flex gap-2 mt-3">
                        <button onClick={function () { return respondInvite.mutate({ id: inv.id, status: 'accepted' }); }} className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                          <lucide_react_1.Check size={14}/> Αποδοχή
                        </button>
                        <button onClick={function () { return respondInvite.mutate({ id: inv.id, status: 'declined' }); }} className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                          Απόρριψη
                        </button>
                      </div>) : (<span className={"inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ".concat(inv.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {inv.status === 'accepted' ? '✅ Αποδέχθηκες' : '❌ Απέρριψες'}
                      </span>)}
                  </div>); })}
              </div>
            </div>
          </div>)}
      </div>

      {/* Create Event Modal */}
      <framer_motion_1.AnimatePresence>
        {showCreateModal && (<>
            <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={function () { return setShowCreateModal(false); }}/>
            <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-x-4 top-4 bottom-4 z-50 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Νέο Playdate Event</h3>
                <button onClick={function () { return setShowCreateModal(false); }}><lucide_react_1.X size={18} className="text-gray-400"/></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Τίτλος *</label><input className={inputCls} value={form.title} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { title: e.target.value })); }); }} placeholder="π.χ. Βόλτα στο Πεδίον Άρεως"/></div>
                <div><label className={labelCls}>Τύπος</label>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map(function (et) { return (<button key={et.value} type="button" onClick={function () { return setForm(function (f) { return (__assign(__assign({}, f), { event_type: et.value })); }); }} className={"px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ".concat(form.event_type === et.value ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 dark:border-gray-700 text-gray-600')}>
                        {et.label}
                      </button>); })}
                  </div>
                </div>
                <div><label className={labelCls}>Περιγραφή</label><textarea className={inputCls} rows={2} value={form.description} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { description: e.target.value })); }); }}/></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>Ημερομηνία *</label><input type="date" className={inputCls} value={form.date} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { date: e.target.value })); }); }}/></div>
                  <div><label className={labelCls}>Ώρα *</label><input type="time" className={inputCls} value={form.time} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { time: e.target.value })); }); }}/></div>
                </div>
                <div><label className={labelCls}>Τοποθεσία *</label><input className={inputCls} value={form.location} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { location: e.target.value })); }); }} placeholder="π.χ. Πεδίον Άρεως, Αθήνα"/></div>
                <div><label className={labelCls}>Πόλη *</label><input className={inputCls} value={form.city} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { city: e.target.value })); }); }}/></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>Διάρκεια (λεπτά)</label><input type="number" className={inputCls} value={form.duration_minutes} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { duration_minutes: Number(e.target.value) })); }); }}/></div>
                  <div><label className={labelCls}>Μέγιστοι συμμετέχοντες</label><input type="number" className={inputCls} value={form.max_participants} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { max_participants: Number(e.target.value) })); }); }}/></div>
                </div>
                <div><label className={labelCls}>Είδη κατοικίδιων</label>
                  <div className="flex flex-wrap gap-2">
                    {petTypeOptions.map(function (pt) { return (<button key={pt} type="button" onClick={function () { return togglePetType(pt); }} className={"px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ".concat(form.pet_types.includes(pt) ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 dark:border-gray-700 text-gray-600')}>
                        {petTypeEmoji[pt]} {pt}
                      </button>); })}
                  </div>
                </div>
              </div>
              <button onClick={function () { return createEvent.mutate(); }} disabled={!form.title || !form.date || !form.time || !form.location || !form.city || createEvent.isPending} className="w-full mt-4 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50">
                {createEvent.isPending ? 'Δημιουργία...' : 'Δημιουργία Event'}
              </button>
            </framer_motion_1.motion.div>
          </>)}
      </framer_motion_1.AnimatePresence>

      {/* Invite Modal */}
      <framer_motion_1.AnimatePresence>
        {showInviteModal && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={function () { return setShowInviteModal(null); }}>
            <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={function (e) { return e.stopPropagation(); }} className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Αποστολή Πρόσκλησης</h3>
                <button onClick={function () { return setShowInviteModal(null); }}><lucide_react_1.X size={18} className="text-gray-400"/></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelCls}>Email χρήστη *</label><input className={inputCls} type="email" value={inviteEmail} onChange={function (e) { return setInviteEmail(e.target.value); }} placeholder="email@example.com"/></div>
                <div><label className={labelCls}>Μήνυμα (προαιρετικό)</label><textarea className={inputCls} rows={2} value={inviteMsg} onChange={function (e) { return setInviteMsg(e.target.value); }} placeholder="Έλα να βγάλουμε τα σκυλιά μαζί!"/></div>
              </div>
              <button onClick={function () { return sendInvite.mutate(); }} disabled={!inviteEmail || sendInvite.isPending} className="w-full mt-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {sendInvite.isPending ? 'Αποστολή...' : 'Αποστολή Πρόσκλησης'}
              </button>
            </framer_motion_1.motion.div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
