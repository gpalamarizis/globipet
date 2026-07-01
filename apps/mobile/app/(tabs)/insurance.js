"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InsuranceScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../../src/lib/api");
var TIER_LABELS = {
    basic: { label: 'Βασικό', color: '#374151', bg: '#F3F4F6' },
    standard: { label: 'Standard', color: '#1E40AF', bg: '#DBEAFE' },
    premium: { label: 'Premium', color: '#6D28D9', bg: '#EDE9FE' },
    comprehensive: { label: 'Ολοκληρωμένο', color: '#065F46', bg: '#D1FAE5' },
};
function InsuranceScreen() {
    var _a, _b, _c, _d;
    var _e = (0, react_1.useState)(''), petType = _e[0], setPetType = _e[1];
    var _f = (0, react_1.useState)(null), selectedPlan = _f[0], setSelectedPlan = _f[1];
    var _g = (0, react_query_1.useQuery)({
        queryKey: ['insurance-plans', petType],
        queryFn: function () { return api_1.api.get('/insurance/plans', { params: { pet_type: petType || undefined } }).then(function (r) { var _a, _b; return (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : []; }); },
    }), _h = _g.data, plans = _h === void 0 ? [] : _h, isLoading = _g.isLoading;
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>🛡️ Ασφάλιση Κατοικιδίου</react_native_1.Text>
        <react_native_1.Text style={styles.subtitle}>Συγκρίνετε πλάνα ασφάλισης</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {[['', 'Όλα'], ['dog', '🐕 Σκύλος'], ['cat', '🐈 Γάτα'], ['rabbit', '🐇 Κουνέλι'], ['bird', '🦜 Πτηνό']].map(function (_a) {
            var val = _a[0], label = _a[1];
            return (<react_native_1.TouchableOpacity key={val} style={[styles.filterChip, petType === val && styles.filterChipActive]} onPress={function () { return setPetType(val); }}>
            <react_native_1.Text style={[styles.filterText, petType === val && styles.filterTextActive]}>{label}</react_native_1.Text>
          </react_native_1.TouchableOpacity>);
        })}
      </react_native_1.ScrollView>

      {isLoading ? (<react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator color="#E65100" size="large"/></react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={styles.list}>
          {plans.length === 0 ? (<react_native_1.View style={styles.emptyContainer}>
              <react_native_1.Text style={styles.emptyEmoji}>🛡️</react_native_1.Text>
              <react_native_1.Text style={styles.emptyTitle}>Δεν βρέθηκαν πλάνα</react_native_1.Text>
            </react_native_1.View>) : plans.map(function (plan) {
                var _a, _b;
                var tier = TIER_LABELS[plan.tier] || TIER_LABELS.basic;
                return (<react_native_1.TouchableOpacity key={plan.id} style={[styles.card, plan.is_featured && styles.cardFeatured]} onPress={function () { return setSelectedPlan(plan); }}>
                {plan.is_featured && (<react_native_1.View style={styles.featuredBadge}>
                    <react_native_1.Text style={styles.featuredText}>⭐ Προτεινόμενο</react_native_1.Text>
                  </react_native_1.View>)}
                <react_native_1.View style={styles.cardTop}>
                  <react_native_1.View style={styles.providerInfo}>
                    <react_native_1.Text style={styles.providerName}>{((_a = plan.provider) === null || _a === void 0 ? void 0 : _a.name_el) || ((_b = plan.provider) === null || _b === void 0 ? void 0 : _b.name)}</react_native_1.Text>
                    <react_native_1.Text style={styles.planName}>{plan.name_el || plan.name}</react_native_1.Text>
                    <react_native_1.View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
                      <react_native_1.Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>
                  <react_native_1.View style={styles.priceBox}>
                    <react_native_1.Text style={styles.price}>€{plan.price_monthly}</react_native_1.Text>
                    <react_native_1.Text style={styles.priceLabel}>/μήνα</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>

                <react_native_1.View style={styles.coverageRow}>
                  {[
                        ['covers_accidents', 'Ατυχήματα'],
                        ['covers_illness', 'Ασθένεια'],
                        ['covers_surgery', 'Χειρουργείο'],
                        ['covers_dental', 'Οδοντιατρείο'],
                    ].map(function (_a) {
                        var key = _a[0], label = _a[1];
                        return (<react_native_1.View key={key} style={[styles.coverageChip, { backgroundColor: plan[key] ? '#D1FAE5' : '#F3F4F6' }]}>
                      <react_native_1.Text style={[styles.coverageText, { color: plan[key] ? '#065F46' : '#9CA3AF' }]}>
                        {plan[key] ? '✓' : '✗'} {label}
                      </react_native_1.Text>
                    </react_native_1.View>);
                    })}
                </react_native_1.View>

                <react_native_1.Text style={styles.detailsLink}>Περισσότερες λεπτομέρειες →</react_native_1.Text>
              </react_native_1.TouchableOpacity>);
            })}
          <react_native_1.View style={{ height: 40 }}/>
        </react_native_1.ScrollView>)}

      {/* Plan Detail Modal */}
      <react_native_1.Modal visible={!!selectedPlan} animationType="slide" presentationStyle="pageSheet" onRequestClose={function () { return setSelectedPlan(null); }}>
        {selectedPlan && (<react_native_1.View style={styles.modal}>
            <react_native_1.View style={styles.modalHeader}>
              <react_native_1.View style={styles.modalTitleGroup}>
                <react_native_1.Text style={styles.modalProvider}>{((_a = selectedPlan.provider) === null || _a === void 0 ? void 0 : _a.name_el) || ((_b = selectedPlan.provider) === null || _b === void 0 ? void 0 : _b.name)}</react_native_1.Text>
                <react_native_1.Text style={styles.modalPlanName}>{selectedPlan.name_el || selectedPlan.name}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.TouchableOpacity onPress={function () { return setSelectedPlan(null); }}>
                <react_native_1.Text style={styles.modalClose}>✕</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.ScrollView style={styles.modalBody}>
              <react_native_1.View style={styles.priceSection}>
                <react_native_1.Text style={styles.modalPrice}>€{selectedPlan.price_monthly}<react_native_1.Text style={styles.modalPriceLabel}>/μήνα</react_native_1.Text></react_native_1.Text>
                {selectedPlan.price_annual && <react_native_1.Text style={styles.modalPriceAnnual}>€{selectedPlan.price_annual}/χρόνο</react_native_1.Text>}
              </react_native_1.View>

              <react_native_1.Text style={styles.sectionTitle}>Κάλυψη</react_native_1.Text>
              {[
                ['covers_accidents', 'Ατυχήματα'],
                ['covers_illness', 'Ασθένεια'],
                ['covers_surgery', 'Χειρουργείο'],
                ['covers_dental', 'Οδοντιατρείο'],
                ['covers_preventive', 'Πρόληψη'],
                ['covers_liability', 'Αστική ευθύνη'],
                ['covers_death', 'Θάνατος'],
            ].map(function (_a) {
                var key = _a[0], label = _a[1];
                return (<react_native_1.View key={key} style={styles.coverageItem}>
                  <react_native_1.Text style={[styles.coverageIcon, { color: selectedPlan[key] ? '#10B981' : '#D1D5DB' }]}>
                    {selectedPlan[key] ? '✓' : '✗'}
                  </react_native_1.Text>
                  <react_native_1.Text style={[styles.coverageLabel, { color: selectedPlan[key] ? '#111827' : '#9CA3AF' }]}>{label}</react_native_1.Text>
                </react_native_1.View>);
            })}

              <react_native_1.Text style={styles.sectionTitle}>Λεπτομέρειες</react_native_1.Text>
              {selectedPlan.annual_limit && (<react_native_1.View style={styles.detailRow}>
                  <react_native_1.Text style={styles.detailLabel}>Ετήσιο όριο</react_native_1.Text>
                  <react_native_1.Text style={styles.detailValue}>€{selectedPlan.annual_limit.toLocaleString()}</react_native_1.Text>
                </react_native_1.View>)}
              {selectedPlan.deductible && (<react_native_1.View style={styles.detailRow}>
                  <react_native_1.Text style={styles.detailLabel}>Απαλλαγή</react_native_1.Text>
                  <react_native_1.Text style={styles.detailValue}>€{selectedPlan.deductible}</react_native_1.Text>
                </react_native_1.View>)}
              {selectedPlan.reimbursement_percent && (<react_native_1.View style={styles.detailRow}>
                  <react_native_1.Text style={styles.detailLabel}>Αποζημίωση</react_native_1.Text>
                  <react_native_1.Text style={styles.detailValue}>{selectedPlan.reimbursement_percent}%</react_native_1.Text>
                </react_native_1.View>)}
              <react_native_1.View style={styles.detailRow}>
                <react_native_1.Text style={styles.detailLabel}>Περίοδος αναμονής</react_native_1.Text>
                <react_native_1.Text style={styles.detailValue}>{selectedPlan.waiting_period_days} ημέρες</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.ScrollView>
            <react_native_1.View style={styles.modalFooter}>
              {((_c = selectedPlan.provider) === null || _c === void 0 ? void 0 : _c.phone) && (<react_native_1.TouchableOpacity style={styles.phoneBtn} onPress={function () { return react_native_1.Linking.openURL("tel:".concat(selectedPlan.provider.phone)); }}>
                  <react_native_1.Text style={styles.phoneBtnText}>📞 {selectedPlan.provider.phone}</react_native_1.Text>
                </react_native_1.TouchableOpacity>)}
              {((_d = selectedPlan.provider) === null || _d === void 0 ? void 0 : _d.website) && (<react_native_1.TouchableOpacity style={styles.applyBtn} onPress={function () { return react_native_1.Linking.openURL(selectedPlan.provider.website); }}>
                  <react_native_1.Text style={styles.applyBtnText}>Αίτηση Ασφάλισης</react_native_1.Text>
                </react_native_1.TouchableOpacity>)}
            </react_native_1.View>
          </react_native_1.View>)}
      </react_native_1.Modal>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#6B7280' },
    filters: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    filterChipActive: { backgroundColor: '#E65100' },
    filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    filterTextActive: { color: '#fff', fontWeight: '700' },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
    cardFeatured: { borderWidth: 2, borderColor: '#E65100' },
    featuredBadge: { backgroundColor: '#FFF7ED', marginHorizontal: -16, marginTop: -16, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 12 },
    featuredText: { fontSize: 12, fontWeight: '700', color: '#E65100' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    providerInfo: { flex: 1 },
    providerName: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    planName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
    tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    tierText: { fontSize: 11, fontWeight: '600' },
    priceBox: { alignItems: 'flex-end' },
    price: { fontSize: 24, fontWeight: '900', color: '#E65100' },
    priceLabel: { fontSize: 12, color: '#6B7280' },
    coverageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    coverageChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    coverageText: { fontSize: 11, fontWeight: '500' },
    detailsLink: { fontSize: 13, color: '#E65100', fontWeight: '600' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
    modal: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitleGroup: { flex: 1 },
    modalProvider: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
    modalPlanName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    modalClose: { fontSize: 20, color: '#6B7280', padding: 4 },
    modalBody: { flex: 1, padding: 20 },
    priceSection: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#FFF7ED', borderRadius: 16, marginBottom: 20 },
    modalPrice: { fontSize: 36, fontWeight: '900', color: '#E65100' },
    modalPriceLabel: { fontSize: 16, fontWeight: '400', color: '#6B7280' },
    modalPriceAnnual: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12, marginTop: 8 },
    coverageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    coverageIcon: { fontSize: 16, marginRight: 10, width: 20 },
    coverageLabel: { fontSize: 14 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    detailLabel: { fontSize: 14, color: '#6B7280' },
    detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
    modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    phoneBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E65100', alignItems: 'center' },
    phoneBtnText: { color: '#E65100', fontWeight: '700', fontSize: 14 },
    applyBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#E65100', alignItems: 'center' },
    applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
