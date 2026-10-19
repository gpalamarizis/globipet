import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Service } from '@/types'
import { useTranslation } from 'react-i18next'
import { loadMapbox } from '@/lib/loadMapbox'

/**
 * Χάρτης υπηρεσιών.
 *
 * Ίδια βιβλιοθήκη και ίδιο κλειδί με τον χάρτη του PetTracker: Mapbox GL JS
 * από το CDN του Mapbox, με το VITE_MAPBOX_TOKEN. Καμία νέα εξάρτηση.
 *
 * Μπαίνουν μόνο οι υπηρεσίες που έχουν latitude/longitude (Service.latitude/
 * longitude στη βάση). Το popup χτίζεται με textContent — τα ονόματα έρχονται
 * από τους παρόχους και δεν περνούν ποτέ ως HTML.
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
/** Κέντρο όταν καμία υπηρεσία δεν έχει θέση — κέντρο Αθήνας, όπως στο PetTracker. */
const DEFAULT_CENTER: [number, number] = [23.7275, 37.9838]

const hasCoords = (s: Service) =>
  Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)) &&
  s.latitude != null && s.longitude != null &&
  !(Number(s.latitude) === 0 && Number(s.longitude) === 0)

interface Props {
  services: Service[]
}

export default function ServicesMap({ services }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const located = useMemo(() => services.filter(hasCoords), [services])

  // Δημιουργία χάρτη μία φορά.
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapRef.current) return
    let cancelled = false
    loadMapbox()
      .then(mapboxgl => {
        if (cancelled || !mapRef.current) return
        mapboxgl.accessToken = MAPBOX_TOKEN
        const map = new mapboxgl.Map({
          container: mapRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: DEFAULT_CENTER,
          zoom: 11,
        })
        map.addControl(new mapboxgl.NavigationControl(), 'top-right')
        let loaded = false
        map.on('load', () => { loaded = true; if (!cancelled) setReady(true) })
        // Π.χ. άκυρο κλειδί: το στυλ δεν φορτώνει ποτέ → μήνυμα αντί για κενό κουτί.
        // Σφάλματα μεμονωμένων πλακιδίων μετά τη φόρτωση του στυλ αγνοούνται.
        map.on('error', () => { if (!cancelled && !loaded && !map.isStyleLoaded()) setFailed(true) })
        mapInstance.current = map
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  // Markers: ξαναζωγραφίζονται όποτε αλλάζουν τα αποτελέσματα (φίλτρα, γλώσσα).
  useEffect(() => {
    const map = mapInstance.current
    const mapboxgl = (window as any).mapboxgl
    if (!map || !mapboxgl || !ready) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    for (const s of located) {
      const lng = Number(s.longitude)
      const lat = Number(s.latitude)

      const box = document.createElement('div')
      box.style.cssText = 'padding:4px 2px;font-family:inherit;min-width:160px'

      const name = document.createElement('a')
      name.href = `/services/${encodeURIComponent(s.id)}`
      name.textContent = s.provider_name
      name.style.cssText = 'display:block;font-weight:600;font-size:14px;color:#111827;text-decoration:none;margin-bottom:2px'
      name.addEventListener('click', e => { e.preventDefault(); navigate(`/services/${s.id}`) })
      box.appendChild(name)

      const type = document.createElement('div')
      type.textContent = t(`services.types.${s.service_type}`, { defaultValue: s.service_type })
      type.style.cssText = 'font-size:12px;color:#6b7280'
      box.appendChild(type)

      if (s.city) {
        const city = document.createElement('div')
        city.textContent = s.city
        city.style.cssText = 'font-size:12px;color:#6b7280'
        box.appendChild(city)
      }

      const meta = document.createElement('div')
      meta.textContent = `★ ${Number(s.rating ?? 0).toFixed(1)} · ${t('cmpServiceCard.fromPrice', { price: s.price })}`
      meta.style.cssText = 'font-size:12px;color:#374151;margin-top:4px'
      box.appendChild(meta)

      const marker = new mapboxgl.Marker({ color: s.emergency_available ? '#ef4444' : '#f97316' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(box))
        .addTo(map)
      markersRef.current.push(marker)
    }

    if (located.length === 1) {
      map.flyTo({ center: [Number(located[0].longitude), Number(located[0].latitude)], zoom: 14, duration: 800 })
    } else if (located.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      located.forEach(s => bounds.extend([Number(s.longitude), Number(s.latitude)]))
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 800 })
    }
  }, [located, ready, t, navigate])

  // Χωρίς κλειδί Mapbox ή αν απέτυχε η φόρτωση: καθαρό μήνυμα, όχι κενό κουτί.
  if (!MAPBOX_TOKEN || failed) {
    return (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-200 dark:border-gray-700">
        <MapPin size={40} className="text-gray-400" />
        <p className="text-gray-500 font-medium">{t('cmpServicesMap.title')}</p>
        <p className="text-sm text-gray-400 text-center max-w-xs">{t('cmpServicesMap.unavailable')}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
      <div ref={mapRef} className="absolute inset-0" />
      {ready && (
        <div className="absolute top-3 left-3 max-w-[calc(100%-4.5rem)] px-3 py-1.5 rounded-full bg-white/95 dark:bg-gray-900/95 shadow text-xs font-medium text-gray-700 dark:text-gray-200">
          {located.length > 0
            ? t('cmpServicesMap.onMap', { count: located.length })
            : t('cmpServicesMap.noLocations')}
        </div>
      )}
    </div>
  )
}
