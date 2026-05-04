'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export type PunchMapPin = {
  id: number
  latitude: number
  longitude: number
  status: 'pending' | 'approved' | 'declined' | 'auto_rejected'
  label: string
  detail?: string
}

const STATUS_COLOR: Record<PunchMapPin['status'], string> = {
  pending: '#d97706',
  approved: '#059669',
  declined: '#dc2626',
  auto_rejected: '#64748b',
}

export default function PunchMap({
  pins,
  selectedId,
  onSelect,
  height = 560,
  initialCenter,
}: {
  pins: PunchMapPin[]
  selectedId: number | null
  onSelect: (id: number) => void
  height?: number
  initialCenter?: [number, number]
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<number, any>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any | null>(null)

  // Init map once
  useEffect(() => {
    let canceled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (canceled || !containerRef.current || mapRef.current) return
      LRef.current = L
      const center =
        initialCenter ?? (pins[0] ? [pins[0].latitude, pins[0].longitude] : [42.36, -83.1])
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(center as [number, number], 11)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map)
      mapRef.current = map
    })()
    return () => {
      canceled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markersRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render markers
  useEffect(() => {
    const L = LRef.current
    const map = mapRef.current
    if (!L || !map) return
    Object.values(markersRef.current).forEach((m) => m.remove())
    markersRef.current = {}
    for (const p of pins) {
      const isSel = p.id === selectedId
      const color = STATUS_COLOR[p.status]
      const size = isSel ? 36 : 26
      const html = `
        <div style="position:relative;width:${size}px;height:${size}px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.18;"></div>
          <div style="position:absolute;inset:25%;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);"></div>
          ${
            isSel
              ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};animation:cmp-pulse 1.4s infinite;"></div>`
              : ''
          }
        </div>
      `
      const icon = L.divIcon({
        html,
        className: 'cmp-pin',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([p.latitude, p.longitude], { icon }).addTo(map)
      marker.on('click', () => onSelect(p.id))
      markersRef.current[p.id] = marker
    }
  }, [pins, selectedId, onSelect])

  // Pan to selection
  useEffect(() => {
    const map = mapRef.current
    if (!map || selectedId == null) return
    const pin = pins.find((p) => p.id === selectedId)
    if (!pin) return
    map.setView([pin.latitude, pin.longitude], Math.max(map.getZoom(), 12), { animate: true })
  }, [selectedId, pins])

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--ink-200)]">
      <style>{`
        @keyframes cmp-pulse { 0% { transform: scale(1); opacity: .7 } 100% { transform: scale(1.6); opacity: 0 } }
        .cmp-pin { background: transparent !important; border: 0 !important; }
        .leaflet-container { font-family: inherit; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
      <div ref={containerRef} style={{ height, width: '100%', background: '#e8eef3' }} />

      {/* Legend top-left */}
      <div className="absolute left-2.5 top-2.5 z-[999] flex flex-col gap-1 rounded-lg border border-[var(--ink-200)] bg-white px-3 py-2 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">Pins</div>
        {[
          ['Pending', STATUS_COLOR.pending],
          ['Approved', STATUS_COLOR.approved],
          ['Declined', STATUS_COLOR.declined],
        ].map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5 text-[11px] text-[var(--ink-700)]">
            <span
              className="h-2 w-2 rounded-full border-[1.5px] border-white"
              style={{ background: c, boxShadow: `0 0 0 1px ${c}` }}
            />
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}
