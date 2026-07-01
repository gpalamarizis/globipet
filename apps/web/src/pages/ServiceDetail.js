"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServiceDetail;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var canvas_confetti_1 = require("canvas-confetti");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var LoadingSpinner_1 = require("@/components/ui/LoadingSpinner");
// #6: illustration fallback per service type (instead of one generic 🐾 emoji)
var typeIllustration = {
    veterinary: { Icon: lucide_react_1.Stethoscope, bg: 'bg-red-50 dark:bg-red-900/15', fg: 'text-red-400 dark:text-red-500' },
    grooming: { Icon: lucide_react_1.Scissors, bg: 'bg-purple-50 dark:bg-purple-900/15', fg: 'text-purple-400 dark:text-purple-500' },
    training: { Icon: lucide_react_1.GraduationCap, bg: 'bg-blue-50 dark:bg-blue-900/15', fg: 'text-blue-400 dark:text-blue-500' },
    pet_sitting: { Icon: lucide_react_1.Home, bg: 'bg-green-50 dark:bg-green-900/15', fg: 'text-green-400 dark:text-green-500' },
    walking: { Icon: lucide_react_1.Footprints, bg: 'bg-yellow-50 dark:bg-yellow-900/15', fg: 'text-yellow-500 dark:text-yellow-500' },
    boarding: { Icon: lucide_react_1.Building2, bg: 'bg-orange-50 dark:bg-orange-900/15', fg: 'text-orange-400 dark:text-orange-500' },
    pet_taxi: { Icon: lucide_react_1.Car, bg: 'bg-teal-50 dark:bg-teal-900/15', fg: 'text-teal-400 dark:text-teal-500' },
    photography: { Icon: lucide_react_1.Camera, bg: 'bg-pink-50 dark:bg-pink-900/15', fg: 'text-pink-400 dark:text-pink-500' },
    pharmacy: { Icon: lucide_react_1.Pill, bg: 'bg-indigo-50 dark:bg-indigo-900/15', fg: 'text-indigo-400 dark:text-indigo-500' },
};
var defaultIllustration = { Icon: lucide_react_1.PawPrint, bg: 'bg-gray-50 dark:bg-gray-800', fg: 'text-gray-300 dark:text-gray-600' };
// Local label fallback so a missing/incomplete i18n key never shows the raw key to the user
var typeLabels = {
    veterinary: 'Κτηνίατρος', grooming: 'Περιποίηση', training: 'Εκπαίδευση',
    pet_sitting: 'Φιλοξενία · Ιδιώτης', walking: 'Βόλτες', boarding: 'Φιλοξενία · Ξενοδοχείο',
    pet_taxi: 'Pet Taxi', photography: 'Φωτογράφιση', pharmacy: 'Φαρμακείο',
    adoption: 'Υιοθεσία', shelter: 'Καταφύγιο', other: 'Άλλο',
};
function ServiceDetail() {
    var _a;
    var id = (0, react_router_dom_1.useParams)().id;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var t = (0, react_i18next_1.useTranslation)().t;
    var _b = (0, auth_1.useAuthStore)(), isAuthenticated = _b.isAuthenticated, user = _b.user;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)(''), selectedDate = _c[0], setSelectedDate = _c[1];
    var _d = (0, react_1.useState)(''), selectedTime = _d[0], setSelectedTime = _d[1];
    var _e = (0, react_1.useState)('about'), tab = _e[0], setTab = _e[1];
    var _f = (0, react_1.useState)(''), bookingNote = _f[0], setBookingNote = _f[1];
    var _g = (0, react_1.useState)(false), showNotes = _g[0], setShowNotes = _g[1];
    var bookingRef = (0, react_1.useRef)(null);
    var goToBooking = function () {
        if (!isAuthenticated) {
            navigate('/auth');
            return;
        }
        setTab('booking');
        setTimeout(function () { var _a; return (_a = bookingRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
    };
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['service', id],
        queryFn: function () { return api_1.api.get("/services/".concat(id)).then(function (r) { return r.data; }); },
        enabled: !!id,
    }), service = _h.data, isLoading = _h.isLoading;
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['service-reviews', id],
        queryFn: function () { return api_1.api.get("/services/".concat(id, "/reviews")).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }).catch(function () { return []; }); },
        enabled: !!id,
    }).data, reviews = _j === void 0 ? [] : _j;
    var bookService = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/bookings', {
            service_id: id,
            provider_id: service === null || service === void 0 ? void 0 : service.provider_id,
            date: selectedDate,
            time: selectedTime,
            notes: bookingNote,
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            // #5: confetti celebration on successful booking (respects reduced motion)
            var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!prefersReducedMotion) {
                (0, canvas_confetti_1.default)({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#E65100', '#FFD60A', '#FF9800', '#1565C0'],
                });
            }
            react_hot_toast_1.default.success('✅ ' + t('bookings.status.confirmed'));
            setTimeout(function () { return navigate('/bookings'); }, 600);
        },
        onError: function () { return react_hot_toast_1.default.error(t('common.error')); },
    });
    var timeSlots = [
        '09:00', '10:00', '11:00', '12:00', '13:00',
        '14:00', '15:00', '16:00', '17:00', '18:00',
    ];
    // Generate next 14 days
    var dates = Array.from({ length: 14 }, function (_, i) {
        var d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d.toISOString().split('T')[0];
    });
    if (isLoading)
        return (<div className="page-container py-24 flex justify-center">
      <LoadingSpinner_1.default />
    </div>);
    if (!service)
        return (<div className="page-container py-16 text-center">
      <p className="text-4xl mb-4">🐾</p>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('common.noResults')}</h2>
      <button onClick={function () { return navigate('/services'); }} className="btn-primary mt-4">{t('nav.services')}</button>
    </div>);
    var avgRating = reviews.length > 0
        ? reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length
        : service.rating || 0;
    var canBook = isAuthenticated && selectedDate && selectedTime;
    var illustration = typeIllustration[service.service_type] || defaultIllustration;
    var TypeIcon = illustration.Icon, illuBg = illustration.bg, illuFg = illustration.fg;
    return (<div className="page-container py-8 pb-24 lg:pb-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={function () { return navigate(-1); }} className="hover:text-brand-900 flex items-center gap-1">
          <lucide_react_1.ArrowLeft size={15}/> {t('common.back')}
        </button>
        <lucide_react_1.ChevronRight size={13}/>
        <react_router_dom_1.Link to="/services" className="hover:text-brand-900">{t('nav.services')}</react_router_dom_1.Link>
        <lucide_react_1.ChevronRight size={13}/>
        <span className="text-gray-900 dark:text-white truncate max-w-[200px]">{service.provider_name}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image */}
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            {service.image_url
            ? <img src={service.image_url} alt={service.provider_name} className="w-full h-full object-cover"/>
            : <div className={(0, utils_1.cn)('w-full h-full flex items-center justify-center', illuBg)}><TypeIcon size={72} className={illuFg} strokeWidth={1.5}/></div>}
          </framer_motion_1.motion.div>

          {/* Header */}
          <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}>
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="badge bg-brand-50 text-brand-900 dark:bg-brand-900/20 text-xs capitalize">
                {t("services.types.".concat(service.service_type), { defaultValue: typeLabels[service.service_type] || service.service_type })}
              </span>
              {service.is_verified && (<span className="flex items-center gap-1 badge bg-green-50 text-green-700 dark:bg-green-900/20 text-xs">
                  <lucide_react_1.BadgeCheck size={11}/> {t('services.verified')}
                </span>)}
              {service.emergency_available && (<span className="badge bg-red-50 text-red-600 dark:bg-red-900/20 text-xs">
                  <lucide_react_1.Zap size={11} className="inline mr-1"/>{t('services.emergency')}
                </span>)}
            </div>

            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
              {service.provider_name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(function (s) { return (<lucide_react_1.Star key={s} size={15} className={s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}/>); })}
              </div>
              <span className="text-sm text-gray-500">
                {avgRating.toFixed(1)} ({reviews.length || service.reviews_count || 0} {t('common.reviews')})
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {service.city && (<span className="flex items-center gap-1.5">
                  <lucide_react_1.MapPin size={14}/> {service.city}
                </span>)}
              {service.duration && (<span className="flex items-center gap-1.5">
                  <lucide_react_1.Clock size={14}/> {service.duration} {t('bookings.minutes')}
                </span>)}
              {service.home_visits && (<span className="flex items-center gap-1.5 text-green-600">
                  <lucide_react_1.Home size={14}/> {t('services.homeVisits')}
                </span>)}
              {service.years_experience && (<span className="flex items-center gap-1.5">
                  <lucide_react_1.Shield size={14}/> {service.years_experience} {t('services.yearsExp')}
                </span>)}
            </div>
          </framer_motion_1.motion.div>

          {/* Tabs */}
          <div ref={bookingRef} className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex" role="tablist" aria-label="Λεπτομέρειες υπηρεσίας">
              {['about', 'reviews', 'booking'].map(function (t_) { return (<button key={t_} onClick={function () { return setTab(t_); }} role="tab" aria-selected={tab === t_} className={(0, utils_1.cn)('px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px', tab === t_
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-gray-500 hover:text-gray-700')}>
                  {t_ === 'about' ? 'About'
                : t_ === 'reviews' ? t('common.reviews')
                    : t('services.bookNow')}
                </button>); })}
            </div>
          </div>

          {tab === 'about' && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {service.description || 'No description available.'}
              </p>

              {/* Provider info */}
              {service.provider_name && (<div className="card p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl font-bold text-brand-900">
                    {(_a = service.provider_name[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{service.provider_name}</p>
                    {service.provider_bio && (<p className="text-sm text-gray-500 truncate">{service.provider_bio}</p>)}
                  </div>
                  {service.provider_phone && (<a href={"tel:".concat(service.provider_phone)} className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                      <lucide_react_1.Phone size={18}/>
                    </a>)}
                </div>)}

              {/* Features */}
              {service.features && service.features.length > 0 && (<div className="grid grid-cols-2 gap-2">
                  {service.features.map(function (f, i) { return (<div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <lucide_react_1.Check size={14} className="text-green-500 shrink-0"/>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                    </div>); })}
                </div>)}
            </framer_motion_1.motion.div>)}

          {tab === 'reviews' && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {reviews.length === 0 ? (<div className="text-center py-12">
                  <lucide_react_1.Star size={40} className="mx-auto text-gray-300 mb-3"/>
                  <p className="text-gray-500">No reviews yet.</p>
                </div>) : (<div className="space-y-4">
                  {reviews.map(function (r) {
                    var _a, _b;
                    return (<div key={r.id} className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-900">
                            {((_b = (_a = r.user_name) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || 'U'}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{r.user_name}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(function (s) { return (<lucide_react_1.Star key={s} size={12} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}/>); })}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
                    </div>);
                })}
                </div>)}
            </framer_motion_1.motion.div>)}

          {tab === 'booking' && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {!isAuthenticated ? (<div className="text-center py-8">
                  <p className="text-gray-500 mb-4">{t('authExtra.requiredTitle')}</p>
                  <button onClick={function () { return navigate('/auth'); }} className="btn-primary">{t('auth.login')}</button>
                </div>) : (<>
                  {/* Date picker */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      <lucide_react_1.Calendar size={14} className="inline mr-1.5"/>Date
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dates.map(function (d) {
                    var date = new Date(d);
                    var day = date.toLocaleDateString('en', { weekday: 'short' });
                    var num = date.getDate();
                    return (<button key={d} onClick={function () { return setSelectedDate(d); }} className={(0, utils_1.cn)('flex flex-col items-center p-3 rounded-xl border-2 min-w-[60px] transition-all', selectedDate === d
                            ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300')}>
                            <span className="text-xs font-medium">{day}</span>
                            <span className="text-lg font-bold">{num}</span>
                          </button>);
                })}
                    </div>
                  </div>

                  {/* Time picker */}
                  {selectedDate && (<div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        <lucide_react_1.Clock size={14} className="inline mr-1.5"/>Time
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {timeSlots.map(function (time) { return (<button key={time} onClick={function () { return setSelectedTime(time); }} className={(0, utils_1.cn)('py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all', selectedTime === time
                            ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20 text-brand-900'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300')}>
                            {time}
                          </button>); })}
                      </div>
                    </div>)}

                  {/* Notes — collapsed by default to keep the flow short */}
                  {showNotes ? (<div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        {t('bookingsExtra.commentPlaceholder')}
                      </label>
                      <textarea autoFocus value={bookingNote} onChange={function (e) { return setBookingNote(e.target.value); }} placeholder={t('bookingsExtra.commentPlaceholder')} className="input w-full h-24 resize-none"/>
                    </div>) : (<button type="button" onClick={function () { return setShowNotes(true); }} className="text-sm text-brand-900 dark:text-brand-400 font-medium hover:underline">
                      + Προσθήκη σημείωσης (προαιρετικό)
                    </button>)}

                  <button onClick={function () { return bookService.mutate(); }} disabled={!canBook || bookService.isPending} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <lucide_react_1.Calendar size={18}/>
                    {bookService.isPending ? t('bookingsExtra.sending') : t('services.bookNow')}
                  </button>
                </>)}
            </framer_motion_1.motion.div>)}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Price card */}
          <div className="card p-5 sticky top-20">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {service.price ? (0, utils_1.formatCurrency)(service.price) : t('common.free')}
            </div>
            {service.price_per === 'hour' && (<p className="text-sm text-gray-500 mb-4">/ hour</p>)}
            {service.price_per === 'session' && (<p className="text-sm text-gray-500 mb-4">/ session</p>)}

            <button onClick={goToBooking} className="btn-primary w-full mb-3 flex items-center justify-center gap-2">
              <lucide_react_1.Calendar size={16}/>
              {t('services.bookNow')}
            </button>

            <button className="btn-secondary w-full flex items-center justify-center gap-2" aria-label="Κοινοποίηση υπηρεσίας">
              <lucide_react_1.Share2 size={16}/>
              Share
            </button>

            {/* Quick info */}
            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {service.duration && (<div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium text-gray-900 dark:text-white">{service.duration} min</span>
                </div>)}
              {service.city && (<div className="flex justify-between text-sm">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-gray-900 dark:text-white">{service.city}</span>
                </div>)}
              {service.home_visits && (<div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('services.homeVisits')}</span>
                  <lucide_react_1.Check size={16} className="text-green-500"/>
                </div>)}
            </div>
          </div>
        </div>
      </div>

      {/* #10: mobile sticky booking bar — 1-tap access, no scroll/tab hunting */}
      <div className="lg:hidden fixed bottom-20 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3 shadow-card-hover">
        <div>
          <p className="text-xs text-gray-500">Τιμή</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {service.price ? (0, utils_1.formatCurrency)(service.price) : t('common.free')}
          </p>
        </div>
        <button onClick={goToBooking} className="btn-primary flex-1 max-w-[200px] flex items-center justify-center gap-2 py-3">
          <lucide_react_1.Calendar size={16}/>
          {t('services.bookNow')}
        </button>
      </div>
    </div>);
}
