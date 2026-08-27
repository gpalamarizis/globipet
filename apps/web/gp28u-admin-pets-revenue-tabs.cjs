/**
 * add-admin-pets-revenue-tabs.cjs — καρτέλες Κατοικίδια και Έσοδα.
 *
 * Συμπληρώνει τα δύο κουτιά που έμεναν χωρίς προορισμό.
 *
 * Χρήση:
 *   cd /d C:\gp\apps\web
 *   node add-admin-pets-revenue-tabs.cjs
 */
const fs = require('fs');
const p = 'src/pages/admin/AdminDashboard.tsx';

if (!fs.existsSync(p)) { console.error('✗ δεν βρέθηκε ' + p); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
const before = s;

if (s.includes('AdminPetsTab')) {
  console.log('· Ήδη προστέθηκαν — καμία αλλαγή.');
  process.exit(0);
}
if (!s.includes('AdminBookingsTab')) {
  console.error('✗ τρέξε πρώτα το gp28s (καρτέλα κρατήσεων)');
  process.exit(1);
}

let done = 0;
const fail = (m) => { console.error('✗ ' + m + ' — δεν έγινε αλλαγή'); process.exit(1); };

// ── 1. Εικονίδια ──────────────────────────────────────────────────────
const icons = s.match(/import \{([^}]*)\} from 'lucide-react'/);
if (!icons) fail('δεν βρέθηκε το import του lucide-react');
let add = [];
if (!/\bPawPrint\b/.test(icons[1])) add.push('PawPrint');
if (!/\bEuro\b/.test(icons[1])) add.push('Euro');
if (add.length) {
  s = s.replace(icons[0], `import {${icons[1].replace(/\s*$/, '')}, ${add.join(', ')} } from 'lucide-react'`);
  done++;
}

// ── 2. Καρτέλες ───────────────────────────────────────────────────────
const bookingsTab = s.match(/^\s*\{ id: 'bookings',.*$/m);
if (!bookingsTab) fail('δεν βρέθηκε η καρτέλα bookings');
s = s.replace(bookingsTab[0], bookingsTab[0] +
  `\n    { id: 'pets',      label: 'Κατοικίδια',   icon: PawPrint },` +
  `\n    { id: 'revenue',   label: 'Έσοδα',        icon: Euro },`);
done++;

// ── 3. Ο τύπος Tab ────────────────────────────────────────────────────
const tabType = s.match(/^type Tab = .*$/m);
if (tabType && !/['"]pets['"]/.test(tabType[0])) {
  s = s.replace(tabType[0], tabType[0].replace(/$/, " | 'pets' | 'revenue'"));
  done++;
}

// ── 4. Τα δύο κουτιά γίνονται clickable ───────────────────────────────
for (const [label, tab] of [['Κατοικίδια', 'pets'], ['Έσοδα', 'revenue']]) {
  const re = new RegExp(`(<StatCard[^>]*label="${label}"(?:[^>](?!onClick))*?)(\\s*/>)`);
  const m = s.match(re);
  if (m && !m[0].includes('onClick')) {
    s = s.replace(m[0], `${m[1]} onClick={() => setActiveTab('${tab}' as Tab)}${m[2]}`);
    done++;
  }
}

// ── 5. Απόδοση ────────────────────────────────────────────────────────
const anchor = s.match(/^\s*\{activeTab === 'bookings' && <AdminBookingsTab \/>\}$/m);
if (!anchor) fail('δεν βρέθηκε η απόδοση της καρτέλας bookings');
s = s.replace(anchor[0], anchor[0] +
  `\n      {activeTab === 'pets' && <AdminPetsTab />}` +
  `\n      {activeTab === 'revenue' && <AdminRevenueTab />}`);
done++;

// ── 6. Τα components ──────────────────────────────────────────────────
const components = `

// ═══════════════════════════════════════════════════════════════════════
//  Κατοικίδια — ΧΩΡΙΣ ιατρικά δεδομένα
// ═══════════════════════════════════════════════════════════════════════

function AdminPetsTab() {
  const [q, setQ] = useState('')
  const [species, setSpecies] = useState('')
  const [page, setPage] = useState(0)
  const LIMIT = 50

  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  if (species) params.set('species', species)
  params.set('limit', String(LIMIT))
  params.set('offset', String(page * LIMIT))

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pets', q, species, page],
    queryFn: () => api.get(\`/admin/pets?\${params}\`).then(r => r.data),
  })

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const SPECIES: Record<string, string> = {
    dog: 'Σκύλος', cat: 'Γάτα', bird: 'Πτηνό',
    rabbit: 'Κουνέλι', reptile: 'Ερπετό', fish: 'Ψάρι', other: 'Άλλο',
  }

  return (
    <div className="space-y-4">
      {data?.summary?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{total}</p>
            <p className="text-xs text-gray-500">Σύνολο</p>
          </div>
          {data.summary.map((s: any) => (
            <button key={s.species} onClick={() => { setSpecies(s.species); setPage(0) }}
              className="card p-4 text-left hover:border-brand-400 transition-colors">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.count}</p>
              <p className="text-xs text-gray-500">{SPECIES[s.species] ?? s.species}</p>
            </button>
          ))}
        </div>
      )}

      <div className="card p-3 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Όνομα, φυλή ή ιδιοκτήτης..."
            value={q} onChange={e => { setQ(e.target.value); setPage(0) }} />
        </div>
        {species && (
          <button onClick={() => { setSpecies(''); setPage(0) }} className="btn-secondary text-sm">
            Καθαρισμός φίλτρου
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">Φόρτωση...</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <PawPrint size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Κανένα κατοικίδιο</p>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800">
                <tr className="text-left text-xs text-gray-500">
                  <th className="p-3 font-medium">Όνομα</th>
                  <th className="p-3 font-medium">Είδος</th>
                  <th className="p-3 font-medium">Φυλή</th>
                  <th className="p-3 font-medium">Ηλικία</th>
                  <th className="p-3 font-medium">Βάρος</th>
                  <th className="p-3 font-medium">Microchip</th>
                  <th className="p-3 font-medium">Ιδιοκτήτης</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          : <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <PawPrint size={14} className="text-gray-400" />
                            </div>}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.is_lost && <span className="text-[11px] text-red-600">χαμένο</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{SPECIES[p.species] ?? p.species}</td>
                    <td className="p-3 text-gray-500">{p.breed || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{p.age != null ? \`\${p.age} ετών\` : '—'}</td>
                    <td className="p-3 whitespace-nowrap">{p.weight != null ? \`\${p.weight} kg\` : '—'}</td>
                    <td className="p-3 text-xs text-gray-500">{p.microchip_number || '—'}</td>
                    <td className="p-3 text-xs text-gray-500">{p.owner_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} από {total}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0} className="btn-secondary text-sm">Προηγούμενα</button>
                <button onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * LIMIT >= total} className="btn-secondary text-sm">Επόμενα</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Έσοδα
// ═══════════════════════════════════════════════════════════════════════

function AdminRevenueTab() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue', from, to],
    queryFn: () => api.get(\`/admin/revenue?\${params}\`).then(r => r.data?.data),
  })

  const money = (n: any) => \`€\${Math.round(Number(n) || 0).toLocaleString('el-GR')}\`

  if (isLoading) return <div className="card p-12 text-center text-gray-500">Φόρτωση...</div>

  const b = data?.bookings ?? {}
  const o = data?.orders ?? {}
  const maxMonth = Math.max(1, ...(data?.monthly ?? []).map((m: any) => m.revenue))

  return (
    <div className="space-y-4">

      <div className="card p-3 flex gap-2 flex-wrap items-end">
        <div>
          <label className="label">Από</label>
          <input className="input text-sm" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Έως</label>
          <input className="input text-sm" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }} className="btn-secondary text-sm">
            Καθαρισμός
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Έσοδα κρατήσεων', money(b.revenue), \`\${b.count ?? 0} κρατήσεις\`],
          ['Προμήθεια πλατφόρμας', money(b.commission), 'από κρατήσεις'],
          ['Απόδοση σε παρόχους', money(b.payout), 'μετά προμήθειας'],
          ['Έσοδα καταστήματος', money(o.revenue), \`\${o.count ?? 0} παραγγελίες\`],
        ].map(([label, value, sub]) => (
          <div key={label as string} className="card p-4">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {data?.monthly?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ανά μήνα</h3>
          <div className="space-y-2">
            {data.monthly.map((m: any) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">{m.month}</span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div className="h-full bg-brand-900 dark:bg-yellow-500 rounded-lg transition-all"
                    style={{ width: \`\${Math.max(2, (m.revenue / maxMonth) * 100)}%\` }} />
                </div>
                <span className="text-sm font-medium w-24 text-right shrink-0">{money(m.revenue)}</span>
                <span className="text-xs text-gray-400 w-20 text-right shrink-0 hidden sm:block">
                  {m.bookings} κρατ.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.byProvider?.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-gray-900 dark:text-white p-4 pb-2">Ανά πάροχο</h3>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-gray-800">
              <tr className="text-left text-xs text-gray-500">
                <th className="p-3 font-medium">Πάροχος</th>
                <th className="p-3 font-medium">Κρατήσεις</th>
                <th className="p-3 font-medium">Έσοδα</th>
                <th className="p-3 font-medium">Προμήθεια</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.byProvider.map((p: any) => (
                <tr key={p.email} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3">
                    <p className="font-medium">{p.name || '—'}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </td>
                  <td className="p-3">{p.bookings}</td>
                  <td className="p-3 font-medium">{money(p.revenue)}</td>
                  <td className="p-3 text-gray-500">{money(p.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
`;

s = s.trimEnd() + '\n' + components;
done++;

fs.writeFileSync(p + '.bak', before);
fs.writeFileSync(p, s);
console.log(`✓ ${done} αλλαγές  (αντίγραφο: AdminDashboard.tsx.bak)`);

const out = fs.readFileSync(p, 'utf8');
const checks = [
  ['εικονίδια', /import \{[^}]*\bPawPrint\b[^}]*\bEuro\b/.test(out) || (/\bPawPrint\b/.test(out) && /\bEuro\b/.test(out))],
  ['καρτέλα pets', out.includes("id: 'pets'")],
  ['καρτέλα revenue', out.includes("id: 'revenue'")],
  ['απόδοση pets', out.includes("activeTab === 'pets' && <AdminPetsTab />")],
  ['απόδοση revenue', out.includes("activeTab === 'revenue' && <AdminRevenueTab />")],
  ['components', out.includes('function AdminPetsTab') && out.includes('function AdminRevenueTab')],
  ['κουτί Κατοικίδια clickable', /label="Κατοικίδια"[^>]*onClick=\{\(\) => setActiveTab\('pets'/.test(out)],
  ['κουτί Έσοδα clickable',      /label="Έσοδα"[^>]*onClick=\{\(\) => setActiveTab\('revenue'/.test(out)],
  ['ΧΩΡΙΣ ιατρικά στο UI', !/vaccination_status|medical_conditions/.test(components)],
];
let bad = 0;
for (const [k, v] of checks) { console.log(`  ${v ? '✓' : '✗'} ${k}`); if (!v) bad++; }
console.log('\nΤρέξε τώρα:  npm run build');
if (bad) process.exit(1);
