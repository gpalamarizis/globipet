import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { loadMapbox } from '@/lib/loadMapbox'

/**
 * Τοποθεσία υπηρεσίας στον χάρτη υπηρεσιών (Service.latitude/longitude).
 *
 * «Εύρεση στον χάρτη» → GET /geocode με διεύθυνση + πόλη της φόρμας. Το
 * αποτέλεσμα φαίνεται σε μικρό χάρτη (Mapbox, ίδιο κλειδί με ServicesMap),
 * με marker που σύρεται για διόρθωση. Χωρίς κλειδί Mapbox ή αν αποτύχει η
 * φόρτωση: μόνο οι συντεταγμένες. Προαιρετικό — κατ' οίκον ή τηλεϊατρική
 * υπηρεσία μπορεί να μην έχει φυσικό σημείο.
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const round6 = (n: number) => Math.round(n * 1e6) / 1e6

export interface Coords { latitude: number | null; longitude: number | null }

interface Props {
  address?: string
  city?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  onChange: (c: Coords) => void
}

export default function ServiceLocationPicker({ address, city, country, latitude, longitude, onChange }: Props) {
  const { t } = useTranslation()
  const [finding, setFinding] = useState(false)
  const [foundName, setFoundName] = useState('')
  const has = latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))

  const find = async () => {
    const q = [address, city].map(s => (s || '').trim()).filter(Boolean).join(', ')
    if (q.length < 3) { toast.error(t('svcLocation.needAddress')); return }
    setFinding(true)
    try {
      const { data } = await api.get('/geocode', { params: { address: q, country: country || undefined } })
      onChange({ latitude: round6(Number(data.lat)), longitude: round6(Number(data.lon)) })
      setFoundName(data.display_name || '')
    } catch (e: any) {
      toast.error(e?.response?.status === 404 ? t('svcLocation.notFound') : t('svcLocation.error'))
    } finally { setFinding(false) }
  }

  const remove = () => { setFoundName(''); onChange({ latitude: null, longitude: null }) }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <MapPin size={14} className="shrink-0" />{t('svcLocation.title')}
      </div>
      <p className="text-xs text-gray-400">{t('svcLocation.hint')}</p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={find} disabled={finding}
          className="btn-secondary text-sm inline-flex items-center gap-1.5">
          <Search size={14} />{finding ? t('svcLocation.finding') : t('svcLocation.find')}
        </button>
        {has && (
          <button type="button" onClick={remove}
            className="btn-ghost text-sm inline-flex items-center gap-1.5 text-red-600">
            <Trash2 size={14} />{t('svcLocation.remove')}
          </button>
        )}
      </div>

      {has ? (
        <>
          {foundName && <p className="text-xs text-gray-600 dark:text-gray-300 break-words">{foundName}</p>}
          <p className="text-xs text-gray-500 tabular-nums">
            {t('svcLocation.coords', { lat: Number(latitude).toFixed(5), lng: Number(longitude).toFixed(5) })}
          </p>
          {MAPBOX_TOKEN && (
            <LocationMiniMap lat={Number(latitude)} lng={Number(longitude)}
              onMove={(lat, lng) => { setFoundName(''); onChange({ latitude: round6(lat), longitude: round6(lng) }) }} />
          )}
        </>
      ) : (
        <p className="text-xs text-gray-400">{t('svcLocation.notSet')}</p>
      )}
    </div>
  )
}

/** Μικρός χάρτης με draggable marker. Αν δεν φορτώσει, δεν δείχνει τίποτα (οι συντεταγμένες φαίνονται ήδη). */
function LocationMiniMap({ lat, lng, onMove }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void }) {
  const { t } = useTranslation()
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const [failed, setFailed] = useState(false)

  // Δημιουργία μία φορά, στις αρχικές συντεταγμένες.
  useEffect(() => {
    let cancelled = false
    loadMapbox()
      .then(mapboxgl => {
        if (cancelled || !boxRef.current) return
        mapboxgl.accessToken = MAPBOX_TOKEN
        const map = new mapboxgl.Map({
          container: boxRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 15,
        })
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
        let loaded = false
        // Ο χάρτης ζει σε modal με κίνηση εισόδου: resize όταν φορτώσει.
        map.on('load', () => { loaded = true; map.resize() })
        map.on('error', () => { if (!cancelled && !loaded && !map.isStyleLoaded()) setFailed(true) })
        const marker = new mapboxgl.Marker({ color: '#f97316', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map)
        marker.on('dragend', () => {
          const p = marker.getLngLat()
          onMoveRef.current(p.lat, p.lng)
        })
        mapRef.current = map
        markerRef.current = marker
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      markerRef.current?.remove(); markerRef.current = null
      mapRef.current?.remove(); mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Νέες συντεταγμένες (π.χ. νέα εύρεση): μετακίνηση marker και κέντρου.
  useEffect(() => {
    const marker = markerRef.current
    const map = mapRef.current
    if (!marker || !map) return
    const cur = marker.getLngLat()
    if (Math.abs(cur.lat - lat) < 1e-7 && Math.abs(cur.lng - lng) < 1e-7) return
    marker.setLngLat([lng, lat])
    map.flyTo({ center: [lng, lat], duration: 600 })
  }, [lat, lng])

  if (failed) return null
  return (
    <div className="space-y-1">
      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
        <div ref={boxRef} className="absolute inset-0" />
      </div>
      <p className="text-xs text-gray-400">{t('svcLocation.dragHint')}</p>
    </div>
  )
}
