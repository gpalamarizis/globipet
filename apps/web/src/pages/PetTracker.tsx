import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { MapPin, Battery, Signal, Clock, Navigation, AlertTriangle, Plus, Settings, Wifi } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const mockPets = [
  { id: '1', name: 'Ρέξ', species: 'dog', emoji: '🐶', battery: 85, signal: 'good', lat: 37.9838, lng: 23.7275, lastSeen: new Date(Date.now() - 5*60000), isLost: false, address: 'Σύνταγμα, Αθήνα' },
  { id: '2', name: 'Μίτσα', species: 'cat', emoji: '🐱', battery: 42, signal: 'weak', lat: 37.9755, lng: 23.7348, lastSeen: new Date(Date.now() - 2*60000), isLost: false, address: 'Μοναστηράκι, Αθήνα' },
  { id: '3', name: 'Μπόμπι', species: 'dog', emoji: '🐶', battery: 12, signal: 'none', lat: 37.9908, lng: 23.7041, lastSeen: new Date(Date.now() - 45*60000), isLost: true, address: 'Εξάρχεια, Αθήνα' },
]

function MapView({ selectedPet, pets }: { selectedPet: any; pets: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js'
    script.onload = () => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'
      document.head.appendChild(link)

      const mapboxgl = (window as any).mapboxgl
      mapboxgl.accessToken = MAPBOX_TOKEN

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [23.7275, 37.9838],
        zoom: 13,
      })
      mapInstance.current = map

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right')

      // Add pet markers
      pets.forEach(pet => {
        const el = document.createElement('div')
        el.innerHTML = `<div style="background:${pet.isLost ? '#ef4444' : '#f97316'};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer">${pet.emoji}</div>`

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pet.lng, pet.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding:8px;font-family:sans-serif">
              <strong style="font-size:14px">${pet.name}</strong>
              <p style="margin:4px 0;font-size:12px;color:#666">${pet.address}</p>
              <p style="margin:0;font-size:12px;color:${pet.isLost ? '#ef4444' : '#22c55e'}">${pet.isLost ? '⚠️ Χαμένο' : '✅ Ασφαλές'}</p>
            </div>
          `))
          .addTo(map)
        markersRef.current.push(marker)
      })
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (selectedPet && mapInstance.current) {
      mapInstance.current.flyTo({ center: [selectedPet.lng, selectedPet.lat], zoom: 15, duration: 1000 })
    }
  }, [selectedPet])

  return <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />
}

export default function PetTracker() {
  const { isAuthenticated } = useAuthStore()
  const [selectedPet, setSelectedPet] = useState(mockPets[0])
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return
    try {
      const ws = new WebSocket('wss://globipetbackend-production.up.railway.app/ws')
      wsRef.current = ws
      ws.onopen = () => setWsConnected(true)
      ws.onclose = () => setWsConnected(false)
      ws.onerror = () => setWsConnected(false)
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'location_update') {
            console.log('Location update:', data)
          }
        } catch {}
      }
    } catch { setWsConnected(false) }
    return () => wsRef.current?.close()
  }, [isAuthenticated])

  const getBatteryColor = (b: number) => b > 50 ? 'text-green-500' : b > 20 ? 'text-yellow-500' : 'text-red-500'
  const getSignalIcon = (s: string) => s === 'good' ? '████' : s === 'weak' ? '██░░' : '░░░░'
  const timeSince = (d: Date) => {
    const m = Math.floor((Date.now() - d.getTime()) / 60000)
    return m < 1 ? 'Τώρα' : m < 60 ? `${m} λεπτά πριν` : `${Math.floor(m/60)} ώρες πριν`
  }

  return (
    <div className="page-container py-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">GPS Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
            {wsConnected ? 'Σύνδεση real-time' : 'Εκτός σύνδεσης'}
          </p>
        </div>
        <button className="btn-ghost p-2.5"><Settings size={18} className="text-gray-500" /></button>
      </div>

      {/* Lost pet alert */}
      {mockPets.some(p => p.isLost) && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600 shrink-0" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-400 text-sm">Χαμένο κατοικίδιο!</p>
            <p className="text-xs text-red-600 dark:text-red-500">Ο Μπόμπι δεν έχει εντοπιστεί εδώ και 45 λεπτά</p>
          </div>
          <button className="ml-auto text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium">Εντοπισμός</button>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pet list */}
        <div className="space-y-3">
          {mockPets.map(pet => (
            <motion.div key={pet.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedPet(pet)}
              className={cn('card p-4 cursor-pointer transition-all', selectedPet.id === pet.id ? 'ring-2 ring-brand-900' : '')}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{pet.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{pet.name}</p>
                    {pet.isLost && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">ΧΑΜΕΝΟ</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{pet.address}</p>
                </div>
                <div className={cn('w-2.5 h-2.5 rounded-full', pet.isLost ? 'bg-red-500 animate-pulse' : 'bg-green-500')} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Battery size={12} className={getBatteryColor(pet.battery)} />
                  <span className={getBatteryColor(pet.battery)}>{pet.battery}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Signal size={12} className="text-gray-400" />
                  <span className="text-gray-500 font-mono text-[10px]">{getSignalIcon(pet.signal)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-gray-500 truncate">{timeSince(pet.lastSeen)}</span>
                </div>
              </div>
            </motion.div>
          ))}

          <button className="w-full card p-4 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-brand-900 hover:border-brand-300 transition-colors border-dashed">
            <Plus size={16} />
            Προσθήκη tracker
          </button>
        </div>

        {/* Map */}
        <div className="lg:col-span-2 h-[480px]">
          <MapView selectedPet={selectedPet} pets={mockPets} />
        </div>
      </div>

      {/* Selected pet details */}
      {selectedPet && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={selectedPet.id}
          className="card p-5 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{selectedPet.emoji}</span>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{selectedPet.name}</h3>
              <p className="text-sm text-gray-500">{selectedPet.address}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="btn-secondary text-xs flex items-center gap-1.5">
                <Navigation size={13} /> Οδηγίες
              </button>
              <button onClick={() => toast.success('Αποστολή ειδοποίησης στο tracker!')}
                className="btn-primary text-xs flex items-center gap-1.5">
                <Wifi size={13} /> Ping
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Μπαταρία', value: `${selectedPet.battery}%`, color: getBatteryColor(selectedPet.battery) },
              { label: 'Σήμα', value: selectedPet.signal === 'good' ? 'Καλό' : selectedPet.signal === 'weak' ? 'Αδύναμο' : 'Καμία', color: 'text-gray-600' },
              { label: 'Τελευταία ενημέρωση', value: timeSince(selectedPet.lastSeen), color: 'text-gray-600' },
              { label: 'Κατάσταση', value: selectedPet.isLost ? 'Χαμένο' : 'Ασφαλές', color: selectedPet.isLost ? 'text-red-500' : 'text-green-500' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={cn('text-sm font-semibold', item.color)}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
