"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PetTracker;
var react_1 = require("react");
var react_i18next_1 = require("react-i18next");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
var mockPets = [
    { id: '1', name: 'Ρέξ', species: 'dog', emoji: '🐶', battery: 85, signal: 'good', lat: 37.9838, lng: 23.7275, lastSeen: new Date(Date.now() - 5 * 60000), isLost: false, address: 'Σύνταγμα, Αθήνα' },
    { id: '2', name: 'Μίτσα', species: 'cat', emoji: '🐱', battery: 42, signal: 'weak', lat: 37.9755, lng: 23.7348, lastSeen: new Date(Date.now() - 2 * 60000), isLost: false, address: 'Μοναστηράκι, Αθήνα' },
    { id: '3', name: 'Μπόμπι', species: 'dog', emoji: '🐶', battery: 12, signal: 'none', lat: 37.9908, lng: 23.7041, lastSeen: new Date(Date.now() - 45 * 60000), isLost: true, address: 'Εξάρχεια, Αθήνα' },
];
function MapView(_a) {
    var selectedPet = _a.selectedPet, pets = _a.pets, t = _a.t;
    var mapRef = (0, react_1.useRef)(null);
    var mapInstance = (0, react_1.useRef)(null);
    var markersRef = (0, react_1.useRef)([]);
    (0, react_1.useEffect)(function () {
        if (!mapRef.current || mapInstance.current)
            return;
        var script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
        script.onload = function () {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
            document.head.appendChild(link);
            var mapboxgl = window.mapboxgl;
            mapboxgl.accessToken = MAPBOX_TOKEN;
            var map = new mapboxgl.Map({
                container: mapRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [23.7275, 37.9838],
                zoom: 13,
            });
            mapInstance.current = map;
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');
            pets.forEach(function (pet) {
                var el = document.createElement('div');
                el.innerHTML = "<div style=\"background:".concat(pet.isLost ? '#ef4444' : '#f97316', ";width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer\">").concat(pet.emoji, "</div>");
                var marker = new mapboxgl.Marker({ element: el })
                    .setLngLat([pet.lng, pet.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML("\n            <div style=\"padding:8px;font-family:sans-serif\">\n              <strong style=\"font-size:14px\">".concat(pet.name, "</strong>\n              <p style=\"margin:4px 0;font-size:12px;color:#666\">").concat(pet.address, "</p>\n              <p style=\"margin:0;font-size:12px;color:").concat(pet.isLost ? '#ef4444' : '#22c55e', "\">").concat(pet.isLost ? '⚠️ ' + t('tracker.lost') : '✅ ' + t('tracker.safe'), "</p>\n            </div>\n          ")))
                    .addTo(map);
                markersRef.current.push(marker);
            });
        };
        document.head.appendChild(script);
    }, []);
    (0, react_1.useEffect)(function () {
        if (selectedPet && mapInstance.current) {
            mapInstance.current.flyTo({ center: [selectedPet.lng, selectedPet.lat], zoom: 15, duration: 1000 });
        }
    }, [selectedPet]);
    return <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden"/>;
}
function PetTracker() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    var _a = (0, react_1.useState)(mockPets[0]), selectedPet = _a[0], setSelectedPet = _a[1];
    var _b = (0, react_1.useState)(false), wsConnected = _b[0], setWsConnected = _b[1];
    var wsRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!isAuthenticated)
            return;
        try {
            var ws = new WebSocket('wss://globipetbackend-production.up.railway.app/ws');
            wsRef.current = ws;
            ws.onopen = function () { return setWsConnected(true); };
            ws.onclose = function () { return setWsConnected(false); };
            ws.onerror = function () { return setWsConnected(false); };
            ws.onmessage = function (e) {
                try {
                    var data = JSON.parse(e.data);
                    if (data.type === 'location_update') {
                        console.log('Location update:', data);
                    }
                }
                catch (_a) { }
            };
        }
        catch (_a) {
            setWsConnected(false);
        }
        return function () { var _a; return (_a = wsRef.current) === null || _a === void 0 ? void 0 : _a.close(); };
    }, [isAuthenticated]);
    var getBatteryColor = function (b) { return b > 50 ? 'text-green-500' : b > 20 ? 'text-yellow-500' : 'text-red-500'; };
    var getSignalIcon = function (s) { return s === 'good' ? '████' : s === 'weak' ? '██░░' : '░░░░'; };
    var timeSince = function (d) {
        var m = Math.floor((Date.now() - d.getTime()) / 60000);
        return m < 1 ? t('tracker.now') : m < 60 ? "".concat(m, " ").concat(t('tracker.minutesAgo')) : "".concat(Math.floor(m / 60), " ").concat(t('tracker.hoursAgo'));
    };
    var signalLabel = function (s) { return s === 'good' ? t('tracker.signalGood') : s === 'weak' ? t('tracker.signalWeak') : t('tracker.signalNone'); };
    return (<div className="page-container py-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('tracker.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <span className={(0, utils_1.cn)('w-2 h-2 rounded-full', wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400')}/>
            {wsConnected ? t('tracker.realtime') : t('tracker.offline')}
          </p>
        </div>
        <button className="btn-ghost p-2.5"><lucide_react_1.Settings size={18} className="text-gray-500"/></button>
      </div>

      {mockPets.some(function (p) { return p.isLost; }) && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <lucide_react_1.AlertTriangle size={20} className="text-red-600 shrink-0"/>
          <div>
            <p className="font-semibold text-red-800 dark:text-red-400 text-sm">{t('tracker.lostPetAlert')}</p>
            <p className="text-xs text-red-600 dark:text-red-500">{t('tracker.lostPetMsg', { name: 'Μπόμπι', minutes: 45 })}</p>
          </div>
          <button className="ml-auto text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium">{t('tracker.locate')}</button>
        </framer_motion_1.motion.div>)}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {mockPets.map(function (pet) { return (<framer_motion_1.motion.div key={pet.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={function () { return setSelectedPet(pet); }} className={(0, utils_1.cn)('card p-4 cursor-pointer transition-all', selectedPet.id === pet.id ? 'ring-2 ring-brand-900' : '')}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{pet.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{pet.name}</p>
                    {pet.isLost && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{t('pets.lostBadge')}</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{pet.address}</p>
                </div>
                <div className={(0, utils_1.cn)('w-2.5 h-2.5 rounded-full', pet.isLost ? 'bg-red-500 animate-pulse' : 'bg-green-500')}/>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <lucide_react_1.Battery size={12} className={getBatteryColor(pet.battery)}/>
                  <span className={getBatteryColor(pet.battery)}>{pet.battery}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <lucide_react_1.Signal size={12} className="text-gray-400"/>
                  <span className="text-gray-500 font-mono text-[10px]">{getSignalIcon(pet.signal)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <lucide_react_1.Clock size={12} className="text-gray-400"/>
                  <span className="text-gray-500 truncate">{timeSince(pet.lastSeen)}</span>
                </div>
              </div>
            </framer_motion_1.motion.div>); })}

          <button className="w-full card p-4 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-brand-900 hover:border-brand-300 transition-colors border-dashed">
            <lucide_react_1.Plus size={16}/>
            {t('tracker.addTracker')}
          </button>
        </div>

        <div className="lg:col-span-2 h-[480px]">
          <MapView selectedPet={selectedPet} pets={mockPets} t={t}/>
        </div>
      </div>

      {selectedPet && (<framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={selectedPet.id} className="card p-5 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{selectedPet.emoji}</span>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{selectedPet.name}</h3>
              <p className="text-sm text-gray-500">{selectedPet.address}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="btn-secondary text-xs flex items-center gap-1.5">
                <lucide_react_1.Navigation size={13}/> {t('tracker.directions')}
              </button>
              <button onClick={function () { return react_hot_toast_1.default.success(t('tracker.pingSent')); }} className="btn-primary text-xs flex items-center gap-1.5">
                <lucide_react_1.Wifi size={13}/> {t('tracker.ping')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
                { label: t('tracker.battery'), value: "".concat(selectedPet.battery, "%"), color: getBatteryColor(selectedPet.battery) },
                { label: t('tracker.signal'), value: signalLabel(selectedPet.signal), color: 'text-gray-600' },
                { label: t('tracker.lastUpdate'), value: timeSince(selectedPet.lastSeen), color: 'text-gray-600' },
                { label: t('tracker.status'), value: selectedPet.isLost ? t('tracker.lost') : t('tracker.safe'), color: selectedPet.isLost ? 'text-red-500' : 'text-green-500' },
            ].map(function (item, i) { return (<div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={(0, utils_1.cn)('text-sm font-semibold', item.color)}>{item.value}</p>
              </div>); })}
          </div>
        </framer_motion_1.motion.div>)}
    </div>);
}
