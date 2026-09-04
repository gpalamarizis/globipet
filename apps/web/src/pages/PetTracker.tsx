import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MapPin, Battery, Signal, Clock, Navigation, AlertTriangle,
  Plus, Wifi, X, Copy, Check, Trash2, RefreshCw,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

/** Fallback centre when no pet has reported a position yet — central Athens. */
const DEFAULT_CENTER: [number, number] = [23.7275, 37.9838]

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🦜', rabbit: '🐰',
  hamster: '🐹', fish: '🐠', reptile: '🦎', horse: '🐴',
}
const emojiFor = (species?: string) => SPECIES_EMOJI[String(species).toLowerCase()] ?? '🐾'

type TrackerRow = {
  pet: {
    id: string; name: string; species: string; breed?: string | null
    image_url?: string | null; is_lost: boolean; last_seen_location?: string | null
  }
  location: {
    id: string; latitude: number; longitude: number
    status: string; created_at: string
  } | null
  tracker: {
    id: string; device_id: string; name?: string | null
    battery_percent: number | null; signal_strength: string | null
    last_seen_at: string | null; is_active: boolean
  } | null
}

// ─── Map ──────────────────────────────────────────────────────────────

function MapView({ selected, rows, t }: { selected: TrackerRow | null; rows: TrackerRow[]; t: any }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [ready, setReady] = useState(false)

  // Load Mapbox once.
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const init = () => {
      const mapboxgl = (window as any).mapboxgl
      if (!mapboxgl) return
      mapboxgl.accessToken = MAPBOX_TOKEN
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: DEFAULT_CENTER,
        zoom: 12,
      })
      mapInstance.current = map
      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true }, trackUserLocation: true,
      }), 'top-right')
      map.on('load', () => setReady(true))
    }

    if ((window as any).mapboxgl) { init(); return }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js'
    script.onload = init
    document.head.appendChild(script)
  }, [])

  /**
   * Redraw markers whenever the data changes.
   *
   * The previous version built markers inside the mount-only effect, closing
   * over the pet list as it was at first render. Positions arriving later —
   * which is the entire point of a tracker — never appeared.
   */
  useEffect(() => {
    const map = mapInstance.current
    const mapboxgl = (window as any).mapboxgl
    if (!map || !mapboxgl || !ready) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const located = rows.filter(r => r.location)
    for (const row of located) {
      const lost = row.pet.is_lost || row.location!.status === 'lost'
      const el = document.createElement('div')
      el.innerHTML = `<div style="background:${lost ? '#ef4444' : '#f97316'};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer">${emojiFor(row.pet.species)}</div>`

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([row.location!.longitude, row.location!.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding:8px;font-family:sans-serif">
            <strong style="font-size:14px">${row.pet.name}</strong>
            <p style="margin:4px 0;font-size:12px;color:#666">${row.location!.latitude.toFixed(5)}, ${row.location!.longitude.toFixed(5)}</p>
            <p style="margin:0;font-size:12px;color:${lost ? '#ef4444' : '#22c55e'}">${lost ? '⚠️ ' + t('tracker.lost') : '✅ ' + t('tracker.safe')}</p>
          </div>
        `))
        .addTo(map)
      markersRef.current.push(marker)
    }

    if (located.length && !selected) {
      map.flyTo({ center: [located[0].location!.longitude, located[0].location!.latitude], zoom: 14, duration: 800 })
    }
  }, [rows, ready])

  useEffect(() => {
    if (selected?.location && mapInstance.current) {
      mapInstance.current.flyTo({
        center: [selected.location.longitude, selected.location.latitude],
        zoom: 15, duration: 1000,
      })
    }
  }, [selected])

  return <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800" />
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function PetTracker() {
  const { t } = useTranslation()
  const { isAuthenticated, token } = useAuthStore()
  const qc = useQueryClient()
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tracker-latest'],
    queryFn: () => api.get('/tracker/latest').then(r => (r.data?.data ?? []) as TrackerRow[]),
    enabled: isAuthenticated,
    // A collar reports on its own schedule; poll so the page keeps up even if
    // the socket drops.
    refetchInterval: 60_000,
  })

  const selected = useMemo(
    () => rows.find(r => r.pet.id === selectedPetId) ?? rows[0] ?? null,
    [rows, selectedPetId]
  )
  const lostRows = rows.filter(r => r.pet.is_lost || r.location?.status === 'lost')

  useEffect(() => {
    if (!isAuthenticated || !token) return

    /**
     * The notifications router is mounted at /api/notifications, so its socket
     * lives at /api/notifications/ws. This previously pointed at a bare /ws,
     * which no route serves — the connection failed every time and the
     * "realtime" dot stayed grey.
     *
     * The server identifies the caller from a verified JWT. Browsers cannot
     * set headers on a WebSocket handshake, so the token goes in the query.
     */
    const apiBase = import.meta.env.VITE_API_URL
      || 'https://globipetbackend-production.up.railway.app/api'
    const wsUrl = apiBase.replace(/^http/, 'ws').replace(/\/$/, '')
      + `/notifications/ws?token=${encodeURIComponent(token)}`

    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(wsUrl)
      ws.onopen = () => setWsConnected(true)
      ws.onclose = () => setWsConnected(false)
      ws.onerror = () => setWsConnected(false)
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'location_update') {
            // Pull the authoritative rows rather than patching local state
            // from a socket payload.
            qc.invalidateQueries({ queryKey: ['tracker-latest'] })
          }
        } catch {}
      }
    } catch { setWsConnected(false) }

    return () => { ws?.close() }
  }, [isAuthenticated, token, qc])

  const batteryColor = (b: number | null) =>
    b == null ? 'text-gray-400' : b > 50 ? 'text-green-500' : b > 20 ? 'text-yellow-500' : 'text-red-500'

  const signalBars = (s: string | null) =>
    s === 'good' ? '████' : s === 'weak' ? '██░░' : s === 'none' ? '░░░░' : '——'

  const signalLabel = (s: string | null) =>
    s === 'good' ? t('tracker.signalGood') : s === 'weak' ? t('tracker.signalWeak')
      : s === 'none' ? t('tracker.signalNone') : '—'

  const timeSince = (iso?: string | null) => {
    if (!iso) return '—'
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (m < 1) return t('tracker.now')
    if (m < 60) return `${m} ${t('tracker.minutesAgo')}`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} ${t('tracker.hoursAgo')}`
    return `${Math.floor(h / 24)} ${t('tracker.daysAgo', 'ημέρες πριν')}`
  }

  return (
    <div className="page-container py-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('tracker.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
            {wsConnected ? t('tracker.realtime') : t('tracker.offline')}
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm inline-flex items-center gap-1.5">
          <Plus size={16} /> {t('tracker.addTracker')}
        </button>
      </div>

      {lostRows.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-red-800 dark:text-red-400 text-sm">{t('tracker.lostPetAlert')}</p>
            <p className="text-xs text-red-600 dark:text-red-500 truncate">
              {lostRows.map(r => r.pet.name).join(', ')}
            </p>
          </div>
          {lostRows[0].location && (
            <button
              onClick={() => setSelectedPetId(lostRows[0].pet.id)}
              className="ml-auto text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium shrink-0">
              {t('tracker.locate')}
            </button>
          )}
        </motion.div>
      )}

      {/* Empty state — no pets at all */}
      {!isLoading && rows.length === 0 && (
        <div className="card p-8 text-center">
          <MapPin size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
            {t('tracker.noPets', 'Δεν έχεις καταχωρημένα κατοικίδια')}
          </p>
          <p className="text-sm text-gray-500">
            {t('tracker.noPetsHint', 'Πρόσθεσε πρώτα ένα κατοικίδιο και μετά σύνδεσε τη συσκευή GPS του.')}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {rows.map(row => {
              const lost = row.pet.is_lost || row.location?.status === 'lost'
              return (
                <motion.div key={row.pet.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedPetId(row.pet.id)}
                  className={cn('card p-4 cursor-pointer transition-all',
                    selected?.pet.id === row.pet.id ? 'ring-2 ring-brand-900' : '')}>
                  <div className="flex items-center gap-3 mb-3">
                    {row.pet.image_url
                      ? <img src={row.pet.image_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      : <span className="text-2xl">{emojiFor(row.pet.species)}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{row.pet.name}</p>
                        {lost && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">{t('pets.lostBadge')}</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {row.location
                          ? `${row.location.latitude.toFixed(4)}, ${row.location.longitude.toFixed(4)}`
                          : t('tracker.noSignalYet', 'Καμία θέση ακόμη')}
                      </p>
                    </div>
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',
                      lost ? 'bg-red-500 animate-pulse' : row.location ? 'bg-green-500' : 'bg-gray-300')} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Battery size={12} className={batteryColor(row.tracker?.battery_percent ?? null)} />
                      <span className={batteryColor(row.tracker?.battery_percent ?? null)}>
                        {row.tracker?.battery_percent != null ? `${row.tracker.battery_percent}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Signal size={12} className="text-gray-400" />
                      <span className="text-gray-500 font-mono text-[10px]">
                        {signalBars(row.tracker?.signal_strength ?? null)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <Clock size={12} className="text-gray-400 shrink-0" />
                      <span className="text-gray-500 truncate">{timeSince(row.location?.created_at)}</span>
                    </div>
                  </div>

                  {!row.tracker && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                      {t('tracker.noDevice', 'Χωρίς συνδεδεμένη συσκευή')}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>

          <div className="lg:col-span-2 h-[480px]">
            <MapView selected={selected} rows={rows} t={t} />
          </div>
        </div>
      )}

      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={selected.pet.id}
          className="card p-5 mt-6">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {selected.pet.image_url
              ? <img src={selected.pet.image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              : <span className="text-3xl">{emojiFor(selected.pet.species)}</span>}
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white">{selected.pet.name}</h3>
              <p className="text-sm text-gray-500">
                {selected.tracker
                  ? (selected.tracker.name || selected.tracker.device_id)
                  : t('tracker.noDevice', 'Χωρίς συνδεδεμένη συσκευή')}
              </p>
            </div>
            {selected.location && (
              <div className="ml-auto flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.location.latitude},${selected.location.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs flex items-center gap-1.5">
                  <Navigation size={13} /> {t('tracker.directions')}
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: t('tracker.battery'),
                value: selected.tracker?.battery_percent != null ? `${selected.tracker.battery_percent}%` : '—',
                color: batteryColor(selected.tracker?.battery_percent ?? null),
              },
              {
                label: t('tracker.signal'),
                value: signalLabel(selected.tracker?.signal_strength ?? null),
                color: 'text-gray-600',
              },
              {
                label: t('tracker.lastUpdate'),
                value: timeSince(selected.location?.created_at),
                color: 'text-gray-600',
              },
              {
                label: t('tracker.status'),
                value: (selected.pet.is_lost || selected.location?.status === 'lost')
                  ? t('tracker.lost') : t('tracker.safe'),
                color: (selected.pet.is_lost || selected.location?.status === 'lost')
                  ? 'text-red-500' : 'text-green-500',
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={cn('text-sm font-semibold', item.color)}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {addOpen && (
        <DeviceManager
          rows={rows}
          onClose={() => setAddOpen(false)}
          onChanged={() => qc.invalidateQueries({ queryKey: ['tracker-latest'] })}
        />
      )}
    </div>
  )
}

// ─── Device registration ──────────────────────────────────────────────

function DeviceManager({
  rows, onClose, onChanged,
}: { rows: TrackerRow[]; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ pet_id: rows[0]?.pet.id ?? '', device_id: '', name: '', brand: '', model: '' })
  const [issued, setIssued] = useState<{ token: string; ingestUrl: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const devicesQuery = useQuery({
    queryKey: ['tracker-devices'],
    queryFn: () => api.get('/tracker/devices').then(r => (r.data?.data ?? []) as any[]),
  })

  const register = useMutation({
    mutationFn: () => api.post('/tracker/devices', {
      pet_id: form.pet_id,
      device_id: form.device_id.trim(),
      name: form.name.trim() || undefined,
      brand: form.brand.trim() || undefined,
      model: form.model.trim() || undefined,
    }),
    onSuccess: (res) => {
      setIssued({
        token: res.data?.data?.device_token,
        ingestUrl: res.data?.setup?.ingest_url,
      })
      setForm(f => ({ ...f, device_id: '', name: '', brand: '', model: '' }))
      qc.invalidateQueries({ queryKey: ['tracker-devices'] })
      onChanged()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common.error')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tracker/devices/${id}`),
    onSuccess: () => {
      toast.success(t('common.deleted'))
      qc.invalidateQueries({ queryKey: ['tracker-devices'] })
      onChanged()
    },
    onError: () => toast.error(t('common.error')),
  })

  const regenerate = useMutation({
    mutationFn: (id: string) => api.post(`/tracker/devices/${id}/token`),
    onSuccess: (res) => {
      setIssued({ token: res.data?.data?.device_token, ingestUrl: '' })
    },
    onError: () => toast.error(t('common.error')),
  })

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {t('tracker.devicesTitle', 'Συσκευές GPS')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* The token appears once — make that unmissable. */}
          {issued?.token && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                {t('tracker.tokenOnce', 'Αντίγραψε το τώρα — δεν εμφανίζεται ξανά')}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white dark:bg-gray-800 rounded px-2 py-1.5 break-all">
                  {issued.token}
                </code>
                <button onClick={() => copy(issued.token)} className="btn-secondary p-1.5 shrink-0">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              {issued.ingestUrl && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 break-all">
                  {t('tracker.ingestUrl', 'URL αποστολής θέσης')}: <code>{issued.ingestUrl}</code>
                </p>
              )}
            </div>
          )}

          {/* Registered devices */}
          {(devicesQuery.data ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('tracker.myDevices', 'Οι συσκευές μου')}
              </p>
              {devicesQuery.data!.map(d => (
                <div key={d.id} className="flex items-center gap-2 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {d.name || d.device_id}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {d.pet?.name} · {d.device_id}
                      {d.battery_percent != null && ` · ${d.battery_percent}%`}
                    </p>
                  </div>
                  <button
                    onClick={() => regenerate.mutate(d.id)}
                    title={t('tracker.newToken', 'Νέο token')}
                    className="text-gray-400 hover:text-brand-900 p-1 shrink-0">
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t('tracker.confirmRemoveDevice', 'Να αφαιρεθεί η συσκευή;'))) remove.mutate(d.id)
                    }}
                    className="text-gray-400 hover:text-red-600 p-1 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Register a new device */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('tracker.addDevice', 'Προσθήκη συσκευής')}
            </p>

            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('tracker.noPetsHint', 'Πρόσθεσε πρώτα ένα κατοικίδιο και μετά σύνδεσε τη συσκευή GPS του.')}
              </p>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    {t('tracker.pet', 'Κατοικίδιο')}
                  </label>
                  <select
                    value={form.pet_id}
                    onChange={e => setForm(f => ({ ...f, pet_id: e.target.value }))}
                    className="input w-full mt-1">
                    {rows.map(r => <option key={r.pet.id} value={r.pet.id}>{r.pet.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    {t('tracker.deviceId', 'Αναγνωριστικό συσκευής')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.device_id}
                    onChange={e => setForm(f => ({ ...f, device_id: e.target.value }))}
                    placeholder="IMEI / serial"
                    className="input w-full mt-1" />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t('tracker.deviceIdHint', 'Το IMEI ή ο σειριακός αριθμός που αναγράφεται στο κολάρο.')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {t('tracker.brand', 'Μάρκα')}
                    </label>
                    <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                           className="input w-full mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {t('tracker.model', 'Μοντέλο')}
                    </label>
                    <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                           className="input w-full mt-1" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    {t('tracker.deviceName', 'Όνομα (προαιρετικό)')}
                  </label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                         className="input w-full mt-1" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary text-sm">{t('common.close', 'Κλείσιμο')}</button>
          <button
            onClick={() => register.mutate()}
            disabled={register.isPending || !form.pet_id || form.device_id.trim().length < 4}
            className="btn-primary text-sm inline-flex items-center gap-1.5">
            <Wifi size={14} /> {register.isPending ? t('common.loading') : t('tracker.register', 'Καταχώρηση')}
          </button>
        </div>
      </div>
    </div>
  )
}
