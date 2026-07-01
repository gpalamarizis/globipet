"use strict";
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
exports.default = Home;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_1 = require("@/lib/api");
var ServiceCard_1 = require("@/components/features/services/ServiceCard");
var EventCard_1 = require("@/components/features/events/EventCard");
var LoadingSpinner_1 = require("@/components/ui/LoadingSpinner");
var MOTTO = [
    'Η καλύτερη εφαρμογή κατοικιδίων στον κόσμο',
    'The best pet app in the world',
    'La meilleure app pour animaux de compagnie',
    'Die beste Haustier-App der Welt',
    'La migliore app per animali domestici',
    'La mejor app del mundo para mascotas',
    'Najlepsza aplikacja dla zwierząt na świecie',
    'En iyi evcil hayvan uygulaması',
];
function Home() {
    var _a, _b, _c, _d;
    var t = (0, react_i18next_1.useTranslation)().t;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _e = (0, react_1.useState)(''), searchQuery = _e[0], setSearchQuery = _e[1];
    var _f = (0, react_1.useState)(''), searchCity = _f[0], setSearchCity = _f[1];
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['featured-products'],
        queryFn: function () { return api_1.api.get('/products?featured=true&limit=4').then(function (r) { return r.data; }); },
    }), featuredProducts = _g.data, loadingProducts = _g.isLoading;
    var _h = (0, react_query_1.useQuery)({
        queryKey: ['featured-services'],
        queryFn: function () { return api_1.api.get('/services?limit=4').then(function (r) { return r.data; }); },
    }), featuredServices = _h.data, loadingServices = _h.isLoading;
    var _j = (0, react_query_1.useQuery)({
        queryKey: ['upcoming-events'],
        queryFn: function () { return api_1.api.get('/events?upcoming=true&limit=3').then(function (r) { return r.data; }); },
    }), upcomingEvents = _j.data, loadingEvents = _j.isLoading;
    var handleSearch = function (e) {
        e.preventDefault();
        navigate("/services?q=".concat(encodeURIComponent(searchQuery), "&city=").concat(encodeURIComponent(searchCity)));
    };
    var stats = [
        { value: '50K+', label: 'Χρήστες' },
        { value: '2K+', label: 'Πάροχοι' },
        { value: '120K+', label: 'Κατοικίδια' },
        { value: '4.9★', label: 'Βαθμολογία' },
    ];
    var categories = [
        { icon: lucide_react_1.Scissors, label: 'Grooming', type: 'grooming', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
        { icon: lucide_react_1.Stethoscope, label: 'Κτηνίατρος', type: 'veterinary', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
        { emoji: '🚶', label: 'Βόλτα', type: 'walking', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
        { icon: lucide_react_1.Home, label: 'Φιλοξενία', type: 'pet_sitting', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
        { icon: lucide_react_1.GraduationCap, label: 'Εκπαίδευση', type: 'training', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
        { icon: lucide_react_1.Car, label: 'Μεταφορά', type: 'pet_taxi', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
        { icon: lucide_react_1.Video, label: 'Τηλειατρική', type: 'telehealth', color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' },
        { icon: lucide_react_1.Pill, label: 'Φαρμακείο', type: 'pharmacy', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
        { icon: lucide_react_1.Shield, label: 'Ασφάλεια', type: 'insurance', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
    ];
    // Duplicate for seamless loop
    var mottoItems = __spreadArray(__spreadArray([], MOTTO, true), MOTTO, true);
    return (<div className="pb-20 lg:pb-0">
      <style>{"\n        @keyframes gp-ticker {\n          0%   { transform: translateX(0); }\n          100% { transform: translateX(-50%); }\n        }\n        .gp-ticker { animation: gp-ticker 24s linear infinite; }\n      "}</style>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 pt-16 pb-20 px-4 text-center overflow-hidden">
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-brand-900 dark:text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <lucide_react_1.Zap size={11}/> #1 Pet Super-App
          </div>
          <h1 className="text-4xl lg:text-[54px] font-display font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white mb-4 max-w-3xl mx-auto">
            Η καλύτερη φροντίδα για τους{' '}
            <span className="text-brand-900 dark:text-brand-400">καλύτερους φίλους</span> σου
          </h1>
        </framer_motion_1.motion.div>

        {/* Multilingual motto ticker */}
        <div className="overflow-hidden w-full my-5 h-6">
          <div className="gp-ticker flex gap-14 whitespace-nowrap">
            {mottoItems.map(function (text, i) { return (<span key={i} className="text-[13px] text-gray-400 dark:text-gray-600 flex items-center gap-2.5 flex-shrink-0">
                <span className="w-1 h-1 rounded-full bg-brand-900 dark:bg-brand-400 inline-block flex-shrink-0"/>
                {text}
              </span>); })}
          </div>
        </div>

        {/* Search bar */}
        <framer_motion_1.motion.form onSubmit={handleSearch} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1.5 rounded-2xl shadow-lg max-w-xl mx-auto">
          <div className="flex items-center gap-2.5 flex-1 px-3">
            <lucide_react_1.Search size={15} className="text-gray-400 shrink-0"/>
            <input type="text" placeholder="Τι ψάχνεις; grooming, κτηνίατρος…" value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }} className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900 dark:text-white"/>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 border-l border-gray-100 dark:border-gray-700">
            <lucide_react_1.MapPin size={13} className="text-gray-400 shrink-0"/>
            <input type="text" placeholder="Πόλη" value={searchCity} onChange={function (e) { return setSearchCity(e.target.value); }} className="w-24 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900 dark:text-white"/>
          </div>
          <button type="submit" className="btn-primary shrink-0 rounded-xl">Αναζήτηση</button>
        </framer_motion_1.motion.form>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <div className="border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800">
            {stats.map(function (s, i) { return (<framer_motion_1.motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 + 0.2 }} className="py-5 text-center">
                <p className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </framer_motion_1.motion.div>); })}
          </div>
        </div>
      </div>

      {/* ── CATEGORIES ───────────────────────────────────── */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="section-title">Υπηρεσίες</h2>
              <p className="text-sm text-gray-500 mt-0.5">Βρες τον καλύτερο πάροχο κοντά σου</p>
            </div>
            <react_router_dom_1.Link to="/services" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
              Όλες <lucide_react_1.ArrowRight size={14}/>
            </react_router_dom_1.Link>
          </div>
          <div className="grid grid-cols-5 lg:grid-cols-9 gap-2">
            {categories.map(function (cat, i) { return (<framer_motion_1.motion.div key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <react_router_dom_1.Link to={"/services?type=".concat(cat.type)} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <div className={"w-11 h-11 rounded-xl flex items-center justify-center ".concat(cat.color, " group-hover:scale-110 transition-transform")}>
                    {'emoji' in cat
                ? <span className="text-xl">{cat.emoji}</span>
                : <cat.icon size={20}/>}
                  </div>
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">{cat.label}</span>
                </react_router_dom_1.Link>
              </framer_motion_1.motion.div>); })}
          </div>
        </div>
      </section>

      {/* ── FEATURED SERVICES ────────────────────────────── */}
      <section className="py-12 bg-gray-50 dark:bg-gray-950">
        <div className="page-container">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="section-title">Κορυφαίοι Πάροχοι</h2>
              <p className="text-sm text-gray-500 mt-0.5">Επαληθευμένοι, αξιολογημένοι από την κοινότητα</p>
            </div>
            <react_router_dom_1.Link to="/services" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
              Όλοι <lucide_react_1.ArrowRight size={14}/>
            </react_router_dom_1.Link>
          </div>
          {loadingServices
            ? <div className="flex justify-center py-12"><LoadingSpinner_1.default /></div>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(_a = featuredServices === null || featuredServices === void 0 ? void 0 : featuredServices.data) === null || _a === void 0 ? void 0 : _a.map(function (service) { return (<ServiceCard_1.default key={service.id} service={service}/>); })}
              </div>}
        </div>
      </section>

      {/* ── MARKETPLACE ──────────────────────────────────── */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="section-title">Marketplace</h2>
              <p className="text-sm text-gray-500 mt-0.5">Τροφές, αξεσουάρ και φάρμακα με delivery</p>
            </div>
            <react_router_dom_1.Link to="/marketplace" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
              Όλα <lucide_react_1.ArrowRight size={14}/>
            </react_router_dom_1.Link>
          </div>
          {loadingProducts
            ? <div className="flex justify-center py-12"><LoadingSpinner_1.default /></div>
            : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Featured product — first result */}
                {((_b = featuredProducts === null || featuredProducts === void 0 ? void 0 : featuredProducts.data) === null || _b === void 0 ? void 0 : _b[0]) && (<react_router_dom_1.Link to={"/marketplace/".concat(featuredProducts.data[0].id)} className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl p-6 flex items-center gap-6 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                    {featuredProducts.data[0].imageUrl
                        ? <img src={featuredProducts.data[0].imageUrl} alt={featuredProducts.data[0].name} className="w-24 h-24 object-contain rounded-xl flex-shrink-0"/>
                        : <div className="w-24 h-24 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <lucide_react_1.ShoppingBag size={32} className="text-brand-900 dark:text-brand-400"/>
                        </div>}
                    <div>
                      <p className="text-[10px] font-bold text-brand-900 dark:text-brand-400 uppercase tracking-wider mb-1">Προτεινόμενο</p>
                      <p className="font-semibold text-gray-900 dark:text-white mb-2 leading-snug">{featuredProducts.data[0].name}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-brand-900 dark:text-brand-400">€{featuredProducts.data[0].price}</span>
                        {featuredProducts.data[0].originalPrice && (<span className="text-sm text-gray-400 line-through">€{featuredProducts.data[0].originalPrice}</span>)}
                      </div>
                      <span className="inline-block mt-3 bg-brand-900 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
                        Προσθήκη στο καλάθι
                      </span>
                    </div>
                  </react_router_dom_1.Link>)}
                {/* Mini list — remaining results */}
                <div className="flex flex-col gap-3">
                  {(_c = featuredProducts === null || featuredProducts === void 0 ? void 0 : featuredProducts.data) === null || _c === void 0 ? void 0 : _c.slice(1, 4).map(function (product) { return (<react_router_dom_1.Link key={product.id} to={"/marketplace/".concat(product.id)} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-contain rounded-lg flex-shrink-0"/>
                        : <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <lucide_react_1.ShoppingBag size={18} className="text-gray-400"/>
                          </div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                        <p className="text-sm text-brand-900 dark:text-brand-400 font-bold mt-0.5">€{product.price}</p>
                      </div>
                      <lucide_react_1.ArrowRight size={14} className="text-gray-400 shrink-0"/>
                    </react_router_dom_1.Link>); })}
                </div>
              </div>}
        </div>
      </section>

      {/* ── EVENTS (conditional) ─────────────────────────── */}
      {!loadingEvents && ((_d = upcomingEvents === null || upcomingEvents === void 0 ? void 0 : upcomingEvents.data) === null || _d === void 0 ? void 0 : _d.length) > 0 && (<section className="py-12 bg-gray-50 dark:bg-gray-950">
          <div className="page-container">
            <div className="flex items-center justify-between mb-7">
              <h2 className="section-title">{t('home.upcomingEvents')}</h2>
              <react_router_dom_1.Link to="/events" className="flex items-center gap-1 text-sm text-brand-900 dark:text-brand-400 font-medium hover:gap-2 transition-all">
                {t('home.allEvents')} <lucide_react_1.ArrowRight size={14}/>
              </react_router_dom_1.Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.data.map(function (event) { return (<EventCard_1.default key={event.id} event={event}/>); })}
            </div>
          </div>
        </section>)}

      {/* ── AI BANNER ────────────────────────────────────── */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="page-container">
          <div className="rounded-3xl bg-gray-950 p-8 lg:p-12 text-white overflow-hidden relative">
            <div className="absolute right-[-40px] top-[-40px] w-52 h-52 rounded-full border border-gray-800 pointer-events-none"/>
            <div className="absolute right-8 top-5 w-32 h-32 rounded-full border border-gray-800 pointer-events-none"/>
            <div className="relative">
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <lucide_react_1.Zap size={11} className="text-amber-400"/> AI Powered
              </p>
              <h2 className="text-2xl lg:text-4xl font-display font-bold mb-4 leading-tight">
                Ο γιατρός του κατοικίδιού σου<br />
                είναι πάντα <span className="text-amber-400">διαθέσιμος</span>
              </h2>
              <p className="text-gray-400 mb-7 max-w-md text-sm leading-relaxed">
                Ανάλυση συμπτωμάτων, health tracking, emotion detection και εξατομικευμένα πλάνα διατροφής — όλα με τεχνητή νοημοσύνη.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {['🧠 AI Health Check', '😊 Emotion Detector', '📊 Wellness Tracker', '🩺 Τηλειατρική 24/7'].map(function (f) { return (<span key={f} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300">{f}</span>); })}
              </div>
              <div className="flex flex-wrap gap-3">
                <react_router_dom_1.Link to="/ai-health" className="bg-amber-400 text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-300 transition-colors">
                  Δοκίμασε δωρεάν
                </react_router_dom_1.Link>
                <react_router_dom_1.Link to="/medical-center" className="text-white border border-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl hover:border-gray-500 transition-colors">
                  Μάθε περισσότερα
                </react_router_dom_1.Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────── */}
      <section className="bg-brand-900 py-16 px-4 text-center text-white">
        <h2 className="text-3xl font-display font-bold tracking-tight mb-3">Ξεκίνα δωρεάν σήμερα</h2>
        <p className="text-white/70 text-sm mb-8">Πάνω από 50.000 ιδιοκτήτες κατοικίδιων εμπιστεύονται το GlobiPet</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="bg-white text-brand-900 font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors">
            📱 App Store
          </a>
          <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="text-white border-2 border-white/30 text-sm font-semibold px-6 py-3 rounded-xl hover:border-white/60 transition-colors">
            ▶ Google Play
          </a>
        </div>
      </section>
    </div>);
}
