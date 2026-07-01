"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MyBookings;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var react_router_dom_1 = require("react-router-dom");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};
function MyBookings() {
    var _a = (0, react_i18next_1.useTranslation)(), t = _a.t, i18n = _a.i18n;
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)('upcoming'), activeTab = _b[0], setActiveTab = _b[1];
    var _c = (0, react_1.useState)(null), reviewBooking = _c[0], setReviewBooking = _c[1];
    var _d = (0, react_1.useState)(5), rating = _d[0], setRating = _d[1];
    var _e = (0, react_1.useState)(''), comment = _e[0], setComment = _e[1];
    var localeMap = { el: 'el-GR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' };
    var locale = localeMap[i18n.language] || 'el-GR';
    var _f = (0, react_query_1.useQuery)({
        queryKey: ['my-bookings'],
        queryFn: function () { return api_1.api.get('/bookings/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }), _g = _f.data, bookings = _g === void 0 ? [] : _g, isLoading = _f.isLoading;
    var cancelBooking = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.patch("/bookings/".concat(id), { status: 'cancelled' }); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); react_hot_toast_1.default.success(t('bookings.cancelled')); },
    });
    var submitReview = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/reviews', { booking_id: reviewBooking.id, service_id: reviewBooking.service_id, rating: rating, comment: comment }); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); setReviewBooking(null); react_hot_toast_1.default.success(t('bookings.reviewSubmitted')); },
    });
    var now = new Date();
    var filtered = bookings.filter(function (b) {
        var date = new Date(b.scheduled_at);
        if (activeTab === 'upcoming')
            return date >= now && b.status !== 'cancelled';
        if (activeTab === 'past')
            return date < now || b.status === 'completed';
        return true;
    });
    if (!isAuthenticated)
        return (<div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <react_router_dom_1.Link to="/login" className="btn-primary">{t('auth.login')}</react_router_dom_1.Link>
    </div>);
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('bookings.title')}</h1>
        <react_router_dom_1.Link to="/services" className="btn-primary text-sm flex items-center gap-2">
          <lucide_react_1.Plus size={16}/> {t('bookingsExtra.newBooking')}
        </react_router_dom_1.Link>
      </div>

      <div className="flex gap-2 mb-6">
        {[
            { id: 'upcoming', label: t('bookings.upcoming') },
            { id: 'past', label: t('bookings.past') },
            { id: 'all', label: t('bookings.all') },
        ].map(function (tab) { return (<button key={tab.id} onClick={function () { return setActiveTab(tab.id); }} className={(0, utils_1.cn)('px-4 py-2 rounded-xl text-sm font-medium transition-all', activeTab === tab.id ? 'bg-brand-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
            {tab.label}
          </button>); })}
      </div>

      {isLoading ? (<div className="space-y-3">{[1, 2, 3].map(function (i) { return <div key={i} className="card p-5"><div className="skeleton h-24 w-full"/></div>; })}</div>) : filtered.length === 0 ? (<div className="text-center py-16">
          <lucide_react_1.Calendar size={48} className="mx-auto text-gray-300 mb-4"/>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('bookings.noBookings')}</h3>
          <p className="text-gray-500 mb-6">{t('bookings.noBookingsDesc')}</p>
          <react_router_dom_1.Link to="/services" className="btn-primary">{t('bookingsExtra.explore')}</react_router_dom_1.Link>
        </div>) : (<div className="space-y-3">
          {filtered.map(function (booking, i) { return (<framer_motion_1.motion.div key={booking.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                    <span className="text-2xl">✂️</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{booking.service_name || t('bookingsExtra.service')}</p>
                    <p className="text-xs text-gray-500">{booking.provider_name}</p>
                  </div>
                </div>
                <span className={(0, utils_1.cn)('text-xs px-2 py-1 rounded-full font-medium', statusColors[booking.status] || 'bg-gray-100 text-gray-600')}>
                  {t("bookings.status.".concat(booking.status)) || booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <lucide_react_1.Calendar size={12}/>
                  {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                </div>
                <div className="flex items-center gap-1.5">
                  <lucide_react_1.Clock size={12}/>
                  {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {booking.duration_minutes && " \u00B7 ".concat(booking.duration_minutes, " ").concat(t('bookings.minutes'))}
                </div>
                {booking.location && <div className="flex items-center gap-1.5 col-span-2"><lucide_react_1.MapPin size={12}/>{booking.location}</div>}
              </div>

              <div className="flex gap-2">
                {booking.status === 'pending' && (<button onClick={function () { if (confirm(t('bookingsExtra.cancelConfirm')))
                    cancelBooking.mutate(booking.id); }} className="flex-1 btn-secondary text-xs py-2 text-red-600 border-red-200 hover:bg-red-50">
                    {t('bookings.cancel')}
                  </button>)}
                {booking.status === 'completed' && !booking.review_id && (<button onClick={function () { return setReviewBooking(booking); }} className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5">
                    <lucide_react_1.Star size={13}/> {t('bookings.rate')}
                  </button>)}
                <react_router_dom_1.Link to={"/services/".concat(booking.service_id)} className="flex items-center gap-1 text-xs text-brand-900 hover:underline ml-auto">
                  {t('bookingsExtra.details')} <lucide_react_1.ChevronRight size={12}/>
                </react_router_dom_1.Link>
              </div>
            </framer_motion_1.motion.div>); })}
        </div>)}

      <framer_motion_1.AnimatePresence>
        {reviewBooking && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={function () { return setReviewBooking(null); }}>
            <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} onClick={function (e) { return e.stopPropagation(); }} className="w-full max-w-sm mx-auto card p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">{t('bookingsExtra.reviewTitle')}</h3>
                <button onClick={function () { return setReviewBooking(null); }} className="btn-ghost p-2"><lucide_react_1.X size={16}/></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{reviewBooking.service_name}</p>
              <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3, 4, 5].map(function (s) { return (<button key={s} onClick={function () { return setRating(s); }}>
                    <lucide_react_1.Star size={28} className={(0, utils_1.cn)('transition-colors', s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300')}/>
                  </button>); })}
              </div>
              <textarea className="input resize-none mb-4" rows={3} placeholder={t('bookingsExtra.commentPlaceholder')} value={comment} onChange={function (e) { return setComment(e.target.value); }}/>
              <div className="flex gap-3">
                <button onClick={function () { return setReviewBooking(null); }} className="btn-secondary flex-1">{t('common.cancel')}</button>
                <button onClick={function () { return submitReview.mutate(); }} disabled={submitReview.isPending} className="btn-primary flex-1">
                  {submitReview.isPending ? t('bookingsExtra.sending') : t('bookings.submitReview')}
                </button>
              </div>
            </framer_motion_1.motion.div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
