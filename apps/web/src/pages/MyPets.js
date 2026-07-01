"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MyPets;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var react_i18next_1 = require("react-i18next");
var lucide_react_1 = require("lucide-react");
var auth_1 = require("@/store/auth");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var AddPetModal_1 = require("@/components/features/pets/AddPetModal");
var react_hot_toast_1 = require("react-hot-toast");
var speciesEmoji = {
    dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾'
};
function MyPets() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, auth_1.useAuthStore)(), user = _a.user, isAuthenticated = _a.isAuthenticated;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(false), addOpen = _b[0], setAddOpen = _b[1];
    var _c = (0, react_1.useState)(null), editPet = _c[0], setEditPet = _c[1];
    var _d = (0, react_1.useState)(null), selectedPet = _d[0], setSelectedPet = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['my-pets'],
        queryFn: function () { return api_1.api.get('/pets/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
        enabled: isAuthenticated,
    }), _f = _e.data, pets = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var deletePet = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/pets/".concat(id)); },
        onSuccess: function () { queryClient.invalidateQueries({ queryKey: ['my-pets'] }); react_hot_toast_1.default.success('Διαγράφηκε'); },
    });
    var toggleLost = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isLost = _a.isLost;
            return api_1.api.patch("/pets/".concat(id), { is_lost: isLost });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['my-pets'] }); },
    });
    if (!isAuthenticated)
        return (<div className="page-container py-16 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{t('authExtra.requiredTitle')}</p>
      <a href="/login" className="btn-primary inline-block">{t('auth.login')}</a>
    </div>);
    return (<div className="page-container py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('pets.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pets.length} {t('pets.subtitle')}</p>
        </div>
        <button onClick={function () { return setAddOpen(true); }} className="btn-primary flex items-center gap-2">
          <lucide_react_1.Plus size={18}/> {t('pets.addPet')}
        </button>
      </div>

      {isLoading ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(function (i) { return <div key={i} className="card p-5 space-y-3"><div className="skeleton h-24 w-full rounded-xl"/><div className="skeleton h-4 w-3/4"/><div className="skeleton h-3 w-1/2"/></div>; })}
        </div>) : pets.length === 0 ? (<div className="text-center py-20">
          <p className="text-6xl mb-4">🐾</p>
          <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">{t('pets.noPets')}</h3>
          <p className="text-gray-500 mb-6">{t('pets.noPetsDesc')}</p>
          <button onClick={function () { return setAddOpen(true); }} className="btn-primary">{t('pets.addFirst')}</button>
        </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map(function (pet, i) { return (<framer_motion_1.motion.div key={pet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center relative">
                {pet.image_url
                    ? <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover"/>
                    : <span className="text-6xl">{speciesEmoji[pet.species] || '🐾'}</span>}
                {pet.is_lost && (<div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <lucide_react_1.AlertTriangle size={10}/> {t('petsExtra.lostBadge')}
                  </div>)}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{pet.name}</h3>
                    <p className="text-xs text-gray-500">{pet.breed || pet.species}</p>
                  </div>
                  <span className={(0, utils_1.cn)('text-xs px-2 py-0.5 rounded-full font-medium', pet.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700')}>
                    {pet.gender === 'male' ? '♂' : '♀'}
                  </span>
                </div>

                <div className="flex gap-2 mb-3 text-xs text-gray-500">
                  {pet.age && <span>🎂 {pet.age} {t('pets.years')}</span>}
                  {pet.weight && <span>⚖️ {pet.weight}kg</span>}
                  {pet.color && <span>🎨 {pet.color}</span>}
                </div>

                <div className="flex gap-2 mb-2">
                  <button onClick={function () { return setEditPet(pet); }} className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                    <lucide_react_1.Edit size={12}/> Επεξεργασία
                  </button>
                  <button onClick={function () { return toggleLost.mutate({ id: pet.id, isLost: !pet.is_lost }); }} className={(0, utils_1.cn)('flex-1 text-xs py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5', pet.is_lost ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600')}>
                    <lucide_react_1.MapPin size={12}/> {pet.is_lost ? t('pets.markAsFound') : t('pets.markAsLost')}
                  </button>
                </div>
                <button onClick={function () { if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE ".concat(pet.name, ";")))
                deletePet.mutate(pet.id); }} className="w-full btn-ghost text-xs py-1.5 text-red-500 flex items-center justify-center gap-1.5">
                  <lucide_react_1.Trash2 size={12}/> Διαγραφή
                </button>
              </div>
            </framer_motion_1.motion.div>); })}

          <framer_motion_1.motion.button onClick={function () { return setAddOpen(true); }} whileHover={{ scale: 1.01 }} className="card p-5 border-dashed flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-brand-900 hover:border-brand-300 transition-colors min-h-[240px]">
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
              <lucide_react_1.Plus size={22}/>
            </div>
            <span className="text-sm font-medium">{t('pets.addPet')}</span>
          </framer_motion_1.motion.button>
        </div>)}

      <AddPetModal_1.default open={addOpen} onClose={function () { return setAddOpen(false); }}/>
      <AddPetModal_1.default open={!!editPet} onClose={function () { return setEditPet(null); }} editing={editPet}/>
    </div>);
}
