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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProviderPackagesPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var api_1 = require("@/lib/api");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
var GROUP_META = {
    bathing: { label: 'Μπάνιο', color: 'bg-sky-50 text-sky-700 border-sky-200', emoji: '🛁' },
    haircut: { label: 'Κούρεμα', color: 'bg-purple-50 text-purple-700 border-purple-200', emoji: '✂️' },
    addon: { label: 'Extras (à la carte)', color: 'bg-amber-50 text-amber-700 border-amber-200', emoji: '✨' },
    consultation: { label: 'Επισκέψεις', color: 'bg-blue-50 text-blue-700 border-blue-200', emoji: '🩺' },
    vaccination: { label: 'Εμβολιασμοί', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', emoji: '💉' },
    surgery: { label: 'Χειρουργικές', color: 'bg-rose-50 text-rose-700 border-rose-200', emoji: '🏥' },
    dental: { label: 'Οδοντιατρικά', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', emoji: '🦷' },
    diagnostics: { label: 'Διαγνωστικά', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', emoji: '🔬' },
    specialty: { label: 'Ειδικότητες', color: 'bg-violet-50 text-violet-700 border-violet-200', emoji: '👨‍⚕️' },
    oncology: { label: 'Ογκολογία', color: 'bg-pink-50 text-pink-700 border-pink-200', emoji: '🎗️' },
    service: { label: 'Υπηρεσίες', color: 'bg-teal-50 text-teal-700 border-teal-200', emoji: '🐕' },
    emergency: { label: 'Έκτακτα', color: 'bg-red-50 text-red-700 border-red-200', emoji: '🚨' },
    other: { label: 'Άλλα', color: 'bg-gray-50 text-gray-700 border-gray-200', emoji: '📋' },
};
var SIZE_LABELS = { small: 'Μικρό', medium: 'Μεσαίο', large: 'Μεγάλο', xlarge: 'Πολύ μεγάλο' };
var MODALITY_LABELS = {
    in_clinic: 'Στο ιατρείο', home_visit: 'Κατ\' οίκον', telehealth: 'Τηλεσυμβ.', emergency: 'Έκτακτο'
};
var CATEGORY_LABELS = {
    grooming: { label: 'Περιποίηση', emoji: '✂️' },
    veterinary: { label: 'Κτηνίατρος', emoji: '🩺' },
    clinic: { label: 'Κτηνιατρική κλινική', emoji: '🏥' },
    walking: { label: 'Dog walking', emoji: '🚶' },
    sitting: { label: 'Pet sitting', emoji: '🏡' },
    boarding: { label: 'Boarding', emoji: '🏨' },
    daycare: { label: 'Daycare', emoji: '☀️' },
    training: { label: 'Εκπαίδευση', emoji: '🎓' },
    transport: { label: 'Μεταφορά', emoji: '🚐' },
    photography: { label: 'Φωτογράφιση', emoji: '📷' },
    other: { label: 'Άλλο', emoji: '✨' },
};
function ProviderPackagesPage() {
    var _a, _b, _c, _d;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _e = (0, react_1.useState)(null), selectedServiceId = _e[0], setSelectedServiceId = _e[1];
    var _f = (0, react_1.useState)(false), showPresetModal = _f[0], setShowPresetModal = _f[1];
    var _g = (0, react_1.useState)(false), showCustomModal = _g[0], setShowCustomModal = _g[1];
    var _h = (0, react_1.useState)(false), showServiceEditModal = _h[0], setShowServiceEditModal = _h[1];
    var _j = (0, react_1.useState)(false), showNewServiceModal = _j[0], setShowNewServiceModal = _j[1];
    var _k = (0, react_1.useState)(null), editingPackage = _k[0], setEditingPackage = _k[1];
    var _l = (0, react_1.useState)(new Set()), collapsedGroups = _l[0], setCollapsedGroups = _l[1];
    var _m = (0, react_query_1.useQuery)({
        queryKey: ['provider-packages'],
        queryFn: function () { return api_1.api.get('/packages/my').then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _o = _m.data, services = _o === void 0 ? [] : _o, isLoading = _m.isLoading;
    var activeService = (0, react_1.useMemo)(function () {
        if (selectedServiceId)
            return services.find(function (s) { return s.id === selectedServiceId; });
        return services[0];
    }, [services, selectedServiceId]);
    var deletePackage = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/packages/".concat(id)); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['provider-packages'] });
            react_hot_toast_1.default.success('Πακέτο διαγράφηκε');
        },
    });
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, is_active = _a.is_active;
            return api_1.api.patch("/packages/".concat(id), { is_active: is_active });
        },
        onSuccess: function () { return queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); },
    });
    var deleteService = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_1.api.delete("/packages/services/".concat(id)); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ['provider-packages'] });
            react_hot_toast_1.default.success('Η υπηρεσία διαγράφηκε');
            setSelectedServiceId(null);
        },
    });
    var groupedPackages = (0, react_1.useMemo)(function () {
        if (!activeService)
            return {};
        var grouped = {};
        for (var _i = 0, _a = activeService.packages || []; _i < _a.length; _i++) {
            var pkg = _a[_i];
            if (!grouped[pkg.group])
                grouped[pkg.group] = [];
            grouped[pkg.group].push(pkg);
        }
        return grouped;
    }, [activeService]);
    var totalCount = (_b = (_a = activeService === null || activeService === void 0 ? void 0 : activeService.packages) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    var packagesWithoutPrice = ((activeService === null || activeService === void 0 ? void 0 : activeService.packages) || []).filter(function (p) { return !p.price || p.price === 0; }).length;
    var toggleGroup = function (g) {
        setCollapsedGroups(function (prev) {
            var n = new Set(prev);
            n.has(g) ? n.delete(g) : n.add(g);
            return n;
        });
    };
    if (isLoading) {
        return <div className="page-container py-8"><div className="skeleton h-12 w-64 mb-6"/></div>;
    }
    if (services.length === 0) {
        return (<div className="page-container py-16 text-center">
        <lucide_react_1.Package size={48} className="mx-auto text-gray-300 mb-4"/>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Δεν έχετε υπηρεσίες ακόμα</h2>
        <button onClick={function () { return setShowNewServiceModal(true); }} className="btn-primary inline-flex items-center gap-2 mt-4">
          <lucide_react_1.Plus size={15}/> Δημιουργία υπηρεσίας
        </button>
        <NewServiceModal open={showNewServiceModal} onClose={function () { return setShowNewServiceModal(false); }} onCreated={function (id) {
                queryClient.invalidateQueries({ queryKey: ['provider-packages'] });
                setShowNewServiceModal(false);
                setSelectedServiceId(id);
            }}/>
      </div>);
    }
    return (<div className="page-container py-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Πακέτα υπηρεσιών</h1>
          <p className="text-sm text-gray-500 mt-1">Διαχειριστείτε τις υπηρεσίες, τις τιμές και τις παραλλαγές σας</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={function () { return setShowNewServiceModal(true); }} className="btn-secondary flex items-center gap-2 text-sm">
            <lucide_react_1.Building2 size={15}/> Νέα υπηρεσία
          </button>
          <button onClick={function () { return setShowPresetModal(true); }} className="btn-secondary flex items-center gap-2 text-sm">
            <lucide_react_1.Sparkles size={15}/> Φόρτωση από κατάλογο
          </button>
          <button onClick={function () { setEditingPackage(null); setShowCustomModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <lucide_react_1.Plus size={15}/> Νέο πακέτο
          </button>
        </div>
      </div>

      {services.length > 1 && (<div className="flex flex-wrap gap-2 mb-6">
          {services.map(function (s) {
                var _a, _b, _c;
                var cat = CATEGORY_LABELS[s.category] || CATEGORY_LABELS.other;
                var isActive = (selectedServiceId || ((_a = services[0]) === null || _a === void 0 ? void 0 : _a.id)) === s.id;
                return (<button key={s.id} onClick={function () { return setSelectedServiceId(s.id); }} className={(0, utils_1.cn)('px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 flex items-center gap-2', isActive ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
                <span>{cat.emoji}</span>
                <span>{s.title}</span>
                <span className="text-xs opacity-60">({(_c = (_b = s.packages) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0})</span>
              </button>);
            })}
        </div>)}

      {activeService && (<div className="card p-5 mb-6 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border-brand-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="text-3xl shrink-0">{((_c = CATEGORY_LABELS[activeService.category]) === null || _c === void 0 ? void 0 : _c.emoji) || '✨'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">
                  {((_d = CATEGORY_LABELS[activeService.category]) === null || _d === void 0 ? void 0 : _d.label) || activeService.category}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{activeService.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalCount} πακέτα · {Object.keys(groupedPackages).length} κατηγορίες
                  {activeService.city && " \u00B7 \uD83D\uDCCD ".concat(activeService.city)}
                </p>
                {packagesWithoutPrice > 0 && (<p className="text-xs text-amber-700 mt-2 font-medium">
                    ⚠️ {packagesWithoutPrice} πακέτα χωρίς τιμή — δεν εμφανίζονται στους πελάτες
                  </p>)}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={function () { return setShowServiceEditModal(true); }} className="btn-ghost p-2 hover:bg-white/50" title="Επεξεργασία">
                <lucide_react_1.Settings size={16} className="text-gray-700"/>
              </button>
              <button onClick={function () {
                if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \u03C5\u03C0\u03B7\u03C1\u03B5\u03C3\u03AF\u03B1\u03C2 \"".concat(activeService.title, "\";")))
                    deleteService.mutate(activeService.id);
            }} className="btn-ghost p-2 hover:bg-red-50" title="Διαγραφή">
                <lucide_react_1.Trash2 size={16} className="text-red-500"/>
              </button>
            </div>
          </div>
        </div>)}

      {totalCount === 0 ? (<div className="card p-12 text-center">
          <lucide_react_1.Package size={40} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Δεν έχετε πακέτα</h3>
          <button onClick={function () { return setShowPresetModal(true); }} className="btn-primary inline-flex items-center gap-2 mt-4">
            <lucide_react_1.Sparkles size={15}/> Φόρτωση από κατάλογο
          </button>
        </div>) : (<div className="space-y-3">
          {Object.entries(groupedPackages).map(function (_a) {
                var group = _a[0], items = _a[1];
                var meta = GROUP_META[group] || GROUP_META.other;
                var isCollapsed = collapsedGroups.has(group);
                return (<div key={group} className="card overflow-hidden">
                <button onClick={function () { return toggleGroup(group); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{meta.label}</h3>
                      <p className="text-xs text-gray-500">{items.length} πακέτα</p>
                    </div>
                  </div>
                  {isCollapsed ? <lucide_react_1.ChevronRight size={18} className="text-gray-400"/> : <lucide_react_1.ChevronDown size={18} className="text-gray-400"/>}
                </button>
                <framer_motion_1.AnimatePresence>
                  {!isCollapsed && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map(function (pkg) { return (<div key={pkg.id} className={(0, utils_1.cn)('p-4 flex items-center gap-3', !pkg.is_active && 'opacity-50')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{pkg.name}</p>
                                {pkg.size && <span className={(0, utils_1.cn)('text-[10px] px-1.5 py-0.5 rounded-full font-medium', meta.color, 'border')}>{SIZE_LABELS[pkg.size]}</span>}
                                {pkg.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">{MODALITY_LABELS[pkg.modality] || pkg.modality}</span>}
                                {pkg.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-200">{pkg.pet_type === 'dog' ? '🐕' : pkg.pet_type === 'cat' ? '🐈' : '🐾'}</span>}
                                {pkg.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">Add-on</span>}
                              </div>
                              {pkg.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pkg.description}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><lucide_react_1.Clock size={11}/> {pkg.duration_minutes}΄</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {pkg.price > 0 ? (<p className="font-bold text-lg text-gray-900 dark:text-white">€{pkg.price.toFixed(2)}</p>) : (<p className="text-xs font-semibold text-amber-600">Χωρίς τιμή</p>)}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={function () { return toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active }); }} className="btn-ghost p-1.5">
                                {pkg.is_active ? <lucide_react_1.Check size={14} className="text-green-600"/> : <lucide_react_1.X size={14} className="text-gray-400"/>}
                              </button>
                              <button onClick={function () { setEditingPackage(pkg); setShowCustomModal(true); }} className="btn-ghost p-1.5">
                                <lucide_react_1.Edit2 size={14} className="text-gray-500"/>
                              </button>
                              <button onClick={function () { if (confirm("\u0394\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE \"".concat(pkg.name, "\";")))
                            deletePackage.mutate(pkg.id); }} className="btn-ghost p-1.5 hover:bg-red-50">
                                <lucide_react_1.Trash2 size={14} className="text-red-500"/>
                              </button>
                            </div>
                          </div>); })}
                      </div>
                    </framer_motion_1.motion.div>)}
                </framer_motion_1.AnimatePresence>
              </div>);
            })}
        </div>)}

      <PresetCatalogModal open={showPresetModal} onClose={function () { return setShowPresetModal(false); }} serviceId={activeService === null || activeService === void 0 ? void 0 : activeService.id} category={activeService === null || activeService === void 0 ? void 0 : activeService.category} onImported={function () { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowPresetModal(false); }}/>
      <CustomPackageModal open={showCustomModal} onClose={function () { setShowCustomModal(false); setEditingPackage(null); }} serviceId={activeService === null || activeService === void 0 ? void 0 : activeService.id} editing={editingPackage} onSaved={function () { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowCustomModal(false); setEditingPackage(null); }}/>
      <ServiceEditModal open={showServiceEditModal} onClose={function () { return setShowServiceEditModal(false); }} service={activeService} onSaved={function () { queryClient.invalidateQueries({ queryKey: ['provider-packages'] }); setShowServiceEditModal(false); }}/>
      <NewServiceModal open={showNewServiceModal} onClose={function () { return setShowNewServiceModal(false); }} onCreated={function (id) {
            queryClient.invalidateQueries({ queryKey: ['provider-packages'] });
            setShowNewServiceModal(false);
            setSelectedServiceId(id);
        }}/>
    </div>);
}
// ═══════════════════════════════════════════════════════════════
// Preset Catalog Modal — pick templates AND set prices in one step
// ═══════════════════════════════════════════════════════════════
function PresetCatalogModal(_a) {
    var open = _a.open, onClose = _a.onClose, serviceId = _a.serviceId, category = _a.category, onImported = _a.onImported;
    // Map<template_id, { price, duration_minutes }>
    var _b = (0, react_1.useState)(new Map()), selectedMap = _b[0], setSelectedMap = _b[1];
    var _c = (0, react_1.useState)(''), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)('all'), filterGroup = _d[0], setFilterGroup = _d[1];
    (0, react_1.useEffect)(function () {
        if (!open) {
            setSelectedMap(new Map());
            setSearch('');
            setFilterGroup('all');
        }
    }, [open]);
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['catalog-preset', category],
        queryFn: function () { return category ? api_1.api.get("/catalog/preset/".concat(category)).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }) : Promise.resolve([]); },
        enabled: open && !!category,
    }), _f = _e.data, templates = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var importMutation = (0, react_query_1.useMutation)({
        mutationFn: function (packages) { return api_1.api.post('/packages/bulk', {
            service_id: serviceId,
            packages_with_prices: packages
        }); },
        onSuccess: function (res) {
            react_hot_toast_1.default.success("\u03A0\u03C1\u03BF\u03C3\u03C4\u03AD\u03B8\u03B7\u03BA\u03B1\u03BD ".concat(res.data.count, " \u03C0\u03B1\u03BA\u03AD\u03C4\u03B1"));
            setSelectedMap(new Map());
            onImported();
        },
        onError: function () { return react_hot_toast_1.default.error('Σφάλμα εισαγωγής'); },
    });
    var filtered = (0, react_1.useMemo)(function () {
        return templates.filter(function (t) {
            if (filterGroup !== 'all' && t.group !== filterGroup)
                return false;
            if (search && !t.name.toLowerCase().includes(search.toLowerCase()))
                return false;
            return true;
        });
    }, [templates, search, filterGroup]);
    var groups = (0, react_1.useMemo)(function () { return Array.from(new Set(templates.map(function (t) { return t.group; }))); }, [templates]);
    var toggleTemplate = function (tpl) {
        setSelectedMap(function (prev) {
            var next = new Map(prev);
            if (next.has(tpl.id))
                next.delete(tpl.id);
            else
                next.set(tpl.id, { price: '', duration_minutes: tpl.duration_minutes });
            return next;
        });
    };
    var updatePrice = function (templateId, price) {
        setSelectedMap(function (prev) {
            var next = new Map(prev);
            var cur = next.get(templateId);
            if (cur)
                next.set(templateId, __assign(__assign({}, cur), { price: price }));
            return next;
        });
    };
    var handleImport = function () {
        var packages = Array.from(selectedMap.entries())
            .filter(function (_a) {
            var v = _a[1];
            return v.price !== '' && parseFloat(v.price) > 0;
        })
            .map(function (_a) {
            var template_id = _a[0], v = _a[1];
            return ({
                template_id: template_id,
                price: parseFloat(v.price),
                duration_minutes: v.duration_minutes,
            });
        });
        if (packages.length === 0) {
            react_hot_toast_1.default.error('Συμπληρώστε τιμές για τα επιλεγμένα πακέτα');
            return;
        }
        if (packages.length < selectedMap.size) {
            react_hot_toast_1.default.error("".concat(selectedMap.size - packages.length, " \u03C0\u03B1\u03BA\u03AD\u03C4\u03B1 \u03B4\u03B5\u03BD \u03AD\u03C7\u03BF\u03C5\u03BD \u03C4\u03B9\u03BC\u03AE \u2014 \u03C3\u03C5\u03BC\u03C0\u03BB\u03B7\u03C1\u03CE\u03C3\u03C4\u03B5 \u03C4\u03B9\u03C2 \u03C0\u03C1\u03CE\u03C4\u03B1"));
            return;
        }
        importMutation.mutate(packages);
    };
    var missingPrices = Array.from(selectedMap.values()).filter(function (v) { return !v.price || parseFloat(v.price) <= 0; }).length;
    return (<framer_motion_1.AnimatePresence>
      {open && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
          <framer_motion_1.motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={function (e) { return e.stopPropagation(); }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">

            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <lucide_react_1.Sparkles size={18} className="text-amber-500"/> Κατάλογος υπηρεσιών
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Επιλέξτε υπηρεσίες και ορίστε τιμές</p>
              </div>
              <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1 input">
                <lucide_react_1.Search size={14} className="text-gray-400 shrink-0"/>
                <input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Αναζήτηση..." className="flex-1 bg-transparent text-sm outline-none"/>
              </div>
              <select value={filterGroup} onChange={function (e) { return setFilterGroup(e.target.value); }} className="input text-sm">
                <option value="all">Όλες οι κατηγορίες</option>
                {groups.map(function (g) { var _a; return <option key={g} value={g}>{((_a = GROUP_META[g]) === null || _a === void 0 ? void 0 : _a.label) || g}</option>; })}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (<div className="space-y-2">{[1, 2, 3, 4, 5].map(function (i) { return <div key={i} className="skeleton h-16 w-full"/>; })}</div>) : filtered.length === 0 ? (<div className="text-center py-8 text-gray-400 text-sm">Δεν βρέθηκαν υπηρεσίες</div>) : (<div className="space-y-2">
                  {filtered.map(function (tpl) {
                    var selected = selectedMap.get(tpl.id);
                    var isSelected = !!selected;
                    var meta = GROUP_META[tpl.group] || GROUP_META.other;
                    return (<div key={tpl.id} className={(0, utils_1.cn)('rounded-xl border-2 transition-all', isSelected
                            ? 'border-brand-900 bg-brand-50/50 dark:bg-brand-900/20'
                            : 'border-gray-200 dark:border-gray-700')}>
                        <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={function () { return toggleTemplate(tpl); }}>
                          <div className={(0, utils_1.cn)('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors', isSelected ? 'bg-brand-900 border-brand-900' : 'border-gray-300')}>
                            {isSelected && <lucide_react_1.Check size={12} className="text-white"/>}
                          </div>
                          <span className="text-xl shrink-0">{meta.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{tpl.name}</p>
                              {tpl.size && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{SIZE_LABELS[tpl.size]}</span>}
                              {tpl.modality && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{MODALITY_LABELS[tpl.modality] || tpl.modality}</span>}
                              {tpl.pet_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700">{tpl.pet_type === 'dog' ? '🐕' : tpl.pet_type === 'cat' ? '🐈' : '🐾'}</span>}
                              {tpl.is_addon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Add-on</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{tpl.duration_minutes}΄ · {meta.label}</p>
                            {tpl.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tpl.description}</p>}
                          </div>
                        </div>

                        {/* Price input — εμφανίζεται μόνο όταν είναι επιλεγμένο */}
                        {isSelected && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-brand-200 dark:border-brand-800 px-3 py-2.5 bg-white dark:bg-gray-900 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Η τιμή σας:</label>
                              <div className="relative flex-1 max-w-[160px]">
                                <lucide_react_1.Euro size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input type="number" step="0.01" min="0" autoFocus value={selected.price} onChange={function (e) { return updatePrice(tpl.id, e.target.value); }} placeholder="0.00" className="input pl-7 py-1.5 text-sm" onClick={function (e) { return e.stopPropagation(); }}/>
                              </div>
                              <span className="text-xs text-gray-400">· {tpl.duration_minutes}΄</span>
                            </div>
                          </framer_motion_1.motion.div>)}
                      </div>);
                })}
                </div>)}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedMap.size > 0 ? <><strong>{selectedMap.size}</strong> επιλεγμένα</> : <span className="text-gray-400">Καμία επιλογή</span>}
                </p>
                {missingPrices > 0 && (<p className="text-xs text-amber-600 mt-0.5">⚠️ {missingPrices} χωρίς τιμή</p>)}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary">Άκυρο</button>
                <button onClick={handleImport} disabled={selectedMap.size === 0 || importMutation.isPending} className="btn-primary flex items-center gap-2">
                  {importMutation.isPending ? 'Εισαγωγή...' : <>Εισαγωγή ({selectedMap.size - missingPrices})</>}
                </button>
              </div>
            </div>
          </framer_motion_1.motion.div>
        </framer_motion_1.motion.div>)}
    </framer_motion_1.AnimatePresence>);
}
// ═══════════════════════════════════════════════════════════════
// Service Edit Modal
// ═══════════════════════════════════════════════════════════════
function ServiceEditModal(_a) {
    var open = _a.open, onClose = _a.onClose, service = _a.service, onSaved = _a.onSaved;
    var _b = (0, react_1.useState)({}), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        if (service && open) {
            setForm({
                title: service.title || '',
                description: service.description || '',
                city: service.city || '',
                country: service.country || 'GR',
                location: service.location || '',
                home_visits: !!service.home_visits,
                emergency_available: !!service.emergency_available,
                years_experience: service.years_experience || 0,
                specializations: Array.isArray(service.specializations) ? service.specializations.join(', ') : '',
                pet_types: Array.isArray(service.pet_types) ? service.pet_types.join(',') : '',
                languages: Array.isArray(service.languages) ? service.languages.join(',') : 'el,en',
                is_active: service.is_active !== false,
            });
        }
    }, [service, open]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.patch("/packages/services/".concat(service.id), form); },
        onSuccess: function () { react_hot_toast_1.default.success('Η υπηρεσία ενημερώθηκε'); onSaved(); },
        onError: function (e) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    if (!open || !service)
        return null;
    return (<framer_motion_1.AnimatePresence>
      <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <framer_motion_1.motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={function (e) { return e.stopPropagation(); }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><lucide_react_1.Settings size={18}/> Επεξεργασία υπηρεσίας</h3>
            <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.title || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { title: e.target.value })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={3} className="input" value={form.description || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                <input className="input" value={form.city || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { city: e.target.value })); }}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
                <input type="number" className="input" value={form.years_experience || 0} onChange={function (e) { return setForm(__assign(__assign({}, form), { years_experience: parseInt(e.target.value) || 0 })); }}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
              <input className="input" value={form.location || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { location: e.target.value })); }}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Εξειδικεύσεις (χωρισμένες με κόμμα)</label>
              <input className="input" value={form.specializations || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { specializations: e.target.value })); }}/>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.home_visits} onChange={function (e) { return setForm(__assign(__assign({}, form), { home_visits: e.target.checked })); }}/>
                Κατ' οίκον
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.emergency_available} onChange={function (e) { return setForm(__assign(__assign({}, form), { emergency_available: e.target.checked })); }}/>
                Έκτακτα
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/>
                Ενεργή
              </label>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.title} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </framer_motion_1.motion.div>
      </framer_motion_1.motion.div>
    </framer_motion_1.AnimatePresence>);
}
// ═══════════════════════════════════════════════════════════════
// New Service Modal — wizard, no preset prices step (uses preset modal after)
// ═══════════════════════════════════════════════════════════════
function NewServiceModal(_a) {
    var open = _a.open, onClose = _a.onClose, onCreated = _a.onCreated;
    var _b = (0, react_1.useState)(1), step = _b[0], setStep = _b[1];
    var _c = (0, react_1.useState)(''), category = _c[0], setCategory = _c[1];
    var _d = (0, react_1.useState)({
        title: '', description: '', city: '', country: 'GR', location: '',
        home_visits: false, emergency_available: false, years_experience: 0,
    }), form = _d[0], setForm = _d[1];
    (0, react_1.useEffect)(function () {
        if (!open) {
            setStep(1);
            setCategory('');
            setForm({ title: '', description: '', city: '', country: 'GR', location: '',
                home_visits: false, emergency_available: false, years_experience: 0 });
        }
    }, [open]);
    var createService = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_1.api.post('/packages/setup', {
            category: category,
            title: form.title, description: form.description,
            city: form.city, country: form.country, location: form.location,
            home_visits: form.home_visits, emergency_available: form.emergency_available,
            years_experience: form.years_experience,
            packages_with_prices: [], // δεν δίνουμε τιμές εδώ - θα τις βάλει μετά από το catalog
        }); },
        onSuccess: function (res) {
            var _a;
            react_hot_toast_1.default.success('🎉 Νέα υπηρεσία. Πρόσθεσε πακέτα από τον κατάλογο.');
            onCreated((_a = res.data.service) === null || _a === void 0 ? void 0 : _a.id);
        },
        onError: function (e) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    if (!open)
        return null;
    return (<framer_motion_1.AnimatePresence>
      <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <framer_motion_1.motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={function (e) { return e.stopPropagation(); }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><lucide_react_1.Building2 size={18}/> Νέα υπηρεσία</h3>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2].map(function (n) { return (<div key={n} className="flex items-center">
                    <div className={(0, utils_1.cn)('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold', step >= n ? 'bg-brand-900 text-white' : 'bg-gray-200 text-gray-400')}>
                      {step > n ? <lucide_react_1.Check size={10}/> : n}
                    </div>
                    {n < 2 && <div className={(0, utils_1.cn)('w-8 h-0.5 mx-1', step > n ? 'bg-brand-900' : 'bg-gray-200')}/>}
                  </div>); })}
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {step === 1 && (<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(CATEGORY_LABELS).map(function (_a) {
                var key = _a[0], val = _a[1];
                return (<button key={key} onClick={function () { return setCategory(key); }} className={(0, utils_1.cn)('p-4 rounded-xl border-2 text-left transition-all', category === key ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300')}>
                    <div className="text-3xl mb-2">{val.emoji}</div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{val.label}</div>
                  </button>);
            })}
              </div>)}
            {step === 2 && (<div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
                  <input className="input" value={form.title} onChange={function (e) { return setForm(__assign(__assign({}, form), { title: e.target.value })); }}/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
                  <textarea rows={3} className="input" value={form.description} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Πόλη</label>
                    <input className="input" value={form.city} onChange={function (e) { return setForm(__assign(__assign({}, form), { city: e.target.value })); }}/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Έτη εμπειρίας</label>
                    <input type="number" className="input" value={form.years_experience} onChange={function (e) { return setForm(__assign(__assign({}, form), { years_experience: parseInt(e.target.value) || 0 })); }}/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Διεύθυνση</label>
                  <input className="input" value={form.location} onChange={function (e) { return setForm(__assign(__assign({}, form), { location: e.target.value })); }}/>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.home_visits} onChange={function (e) { return setForm(__assign(__assign({}, form), { home_visits: e.target.checked })); }}/> Κατ' οίκον</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.emergency_available} onChange={function (e) { return setForm(__assign(__assign({}, form), { emergency_available: e.target.checked })); }}/> Έκτακτα</label>
                </div>
                <p className="text-xs text-gray-500 italic mt-2">💡 Μετά τη δημιουργία, θα μπορείτε να προσθέσετε πακέτα με τις τιμές σας από τον κατάλογο.</p>
              </div>)}
          </div>

          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            {step > 1 && <button onClick={function () { return setStep(1); }} className="btn-secondary">Πίσω</button>}
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={function () {
            if (step === 1) {
                if (!category)
                    return react_hot_toast_1.default.error('Επέλεξε κατηγορία');
                setStep(2);
            }
            else {
                if (!form.title)
                    return react_hot_toast_1.default.error('Δώσε όνομα');
                createService.mutate();
            }
        }} disabled={createService.isPending} className="btn-primary">
              {createService.isPending ? 'Δημιουργία...' : step === 2 ? 'Δημιουργία' : 'Συνέχεια →'}
            </button>
          </div>
        </framer_motion_1.motion.div>
      </framer_motion_1.motion.div>
    </framer_motion_1.AnimatePresence>);
}
// ═══════════════════════════════════════════════════════════════
// Custom Package Add/Edit Modal
// ═══════════════════════════════════════════════════════════════
function CustomPackageModal(_a) {
    var open = _a.open, onClose = _a.onClose, serviceId = _a.serviceId, editing = _a.editing, onSaved = _a.onSaved;
    var _b = (0, react_1.useState)({
        group: 'service', name: '', description: '',
        size: '', pet_type: '', breed_group: '', modality: '',
        price: '', duration_minutes: 60, is_addon: false, is_active: true
    }), form = _b[0], setForm = _b[1];
    (0, react_1.useEffect)(function () {
        if (editing)
            setForm(__assign(__assign({}, editing), { price: String(editing.price) }));
        else
            setForm({
                group: 'service', name: '', description: '',
                size: '', pet_type: '', breed_group: '', modality: '',
                price: '', duration_minutes: 60, is_addon: false, is_active: true
            });
    }, [editing, open]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return editing
            ? api_1.api.patch("/packages/".concat(editing.id), __assign(__assign({}, form), { service_id: undefined }))
            : api_1.api.post('/packages', __assign(__assign({}, form), { service_id: serviceId })); },
        onSuccess: function () {
            react_hot_toast_1.default.success(editing ? 'Πακέτο ενημερώθηκε' : 'Πακέτο προστέθηκε');
            onSaved();
        },
        onError: function (e) { var _a, _b; return react_hot_toast_1.default.error(((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Σφάλμα'); },
    });
    if (!open)
        return null;
    return (<framer_motion_1.AnimatePresence>
      <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <framer_motion_1.motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={function (e) { return e.stopPropagation(); }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-modal max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white">{editing ? 'Επεξεργασία πακέτου' : 'Νέο πακέτο'}</h3>
            <button onClick={onClose} className="btn-ghost p-2"><lucide_react_1.X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Όνομα *</label>
              <input className="input" value={form.name} onChange={function (e) { return setForm(__assign(__assign({}, form), { name: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Κατηγορία</label>
                <select className="input" value={form.group} onChange={function (e) { return setForm(__assign(__assign({}, form), { group: e.target.value })); }}>
                  {Object.entries(GROUP_META).map(function (_a) {
            var key = _a[0], meta = _a[1];
            return (<option key={key} value={key}>{meta.emoji} {meta.label}</option>);
        })}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τιμή (€) *</label>
                <input type="number" step="0.01" className="input" value={form.price} onChange={function (e) { return setForm(__assign(__assign({}, form), { price: e.target.value })); }}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Περιγραφή</label>
              <textarea rows={2} className="input" value={form.description || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { description: e.target.value })); }}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Διάρκεια (λεπτά)</label>
                <input type="number" className="input" value={form.duration_minutes} onChange={function (e) { return setForm(__assign(__assign({}, form), { duration_minutes: parseInt(e.target.value) || 60 })); }}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Μέγεθος</label>
                <select className="input" value={form.size || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { size: e.target.value || null })); }}>
                  <option value="">— (δεν εξαρτάται)</option>
                  <option value="small">Μικρό</option>
                  <option value="medium">Μεσαίο</option>
                  <option value="large">Μεγάλο</option>
                  <option value="xlarge">Πολύ μεγάλο</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τύπος κατοικιδίου</label>
                <select className="input" value={form.pet_type || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { pet_type: e.target.value || null })); }}>
                  <option value="">— (όλα)</option>
                  <option value="dog">🐕 Σκύλος</option>
                  <option value="cat">🐈 Γάτα</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Τρόπος</label>
                <select className="input" value={form.modality || ''} onChange={function (e) { return setForm(__assign(__assign({}, form), { modality: e.target.value || null })); }}>
                  <option value="">— (δεν εξαρτάται)</option>
                  <option value="in_clinic">Στο ιατρείο</option>
                  <option value="home_visit">Κατ' οίκον</option>
                  <option value="telehealth">Τηλεσυμβ.</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_addon} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_addon: e.target.checked })); }}/> Add-on</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={function (e) { return setForm(__assign(__assign({}, form), { is_active: e.target.checked })); }}/> Ενεργό</label>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Άκυρο</button>
            <button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending || !form.name || !form.price} className="btn-primary">
              {saveMutation.isPending ? 'Αποθήκευση...' : (editing ? 'Ενημέρωση' : 'Προσθήκη')}
            </button>
          </div>
        </framer_motion_1.motion.div>
      </framer_motion_1.motion.div>
    </framer_motion_1.AnimatePresence>);
}
