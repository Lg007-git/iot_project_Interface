import { MapContainer, Marker, Popup,useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.gridlayer.googlemutant'
import GoogleLayer from './GoogleLayer'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
})

const views = {
  MAIN: { center: [26.933624, 75.923047], zoom: 17 },
  PARK1: { center: [26.936786, 75.924369], zoom: 20 },
  PARK2: { center: [26.935356, 75.924815], zoom: 21 },
  PARK3: { center: [26.935179, 75.924761], zoom: 21 }
}

const thresholds = {
  PARK1: 3,
  PARK2: 2,
  PARK3: 2
}

const bounds = {
  PARK1: { minLat: 26.936593, maxLat: 26.936951, minLng:  75.924266, maxLng: 75.924457 },
  PARK2: { minLat: 26.935023, maxLat: 26.935524, minLng: 75.924322, maxLng: 75.925024  },
  PARK3: { minLat: 26.934931, maxLat: 26.935403, minLng: 75.924419, maxLng: 75.925084 }
}


export default function MapViewer() {
  const [data, setData] = useState([])
  const [batches, setBatches] = useState([])
  const [batchIndex, setBatchIndex] = useState(null)
  const [activeView, setActiveView] = useState('MAIN')

  useEffect(() => {
    axios.get('https://iot-project-interfacebackend.vercel.app/api/gps')
      .then(res => setData(res.data))
      .catch(err => console.error('Failed to fetch GPS data:', err))
  }, [])

  useEffect(() => {
    if (data.length === 0) return
    const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const batchList = []
    let index = 0

    while (index < sorted.length) {
      const batchStartTime = new Date(sorted[index].timestamp)
      const vehicleMap = new Map()

      while (index < sorted.length) {
        const current = sorted[index]
        const currentTime = new Date(current.timestamp)
        const diffInSeconds = (currentTime - batchStartTime) / 1000

        if (diffInSeconds <= 4) {
          vehicleMap.set(current.vehicleId, current)
          index++
        } else {
          break
        }
      }

      const uniqueBatch = Array.from(vehicleMap.values())
      if (uniqueBatch.length > 0) {
        batchList.push(uniqueBatch)
      }
    }

    setBatches(batchList)
  }, [data])

  const currentBatch = batchIndex !== null ? batches[batchIndex] : batches[batches.length - 1] || []
  const lastTimestamp = currentBatch.length > 0
  ? new Date(currentBatch[currentBatch.length - 1].timestamp).toLocaleString()
  : 'No data yet'

const park1Count = countVehiclesInBounds(currentBatch, bounds.PARK1)
const park2Count = countVehiclesInBounds(currentBatch, bounds.PARK2)
const park3Count = countVehiclesInBounds(currentBatch, bounds.PARK3)

const parkStatus = {
  PARK1: park1Count > thresholds.PARK1 ? '❌ No Parking Area' : '✅ Parking Area Present',
  PARK2: park2Count > thresholds.PARK2 ? '❌ No Parking Area' : '✅ Parking Area Present',
  PARK3: park3Count > thresholds.PARK3 ? '❌ No Parking Area' : '✅ Parking Area Present'
}


  const handlePrev = () => {
    setBatchIndex(prev => {
      const val = prev === null ? batches.length - 2 : prev - 1
      return Math.max(val, 0)
    })
  }

  useEffect(() => {
    if (batchIndex !== null && batchIndex >= batches.length - 1) {
      setBatchIndex(null)
    }
  }, [batches])

  const handleNext = () => {
    setBatchIndex(prev => {
      if (prev === null) return 0
      return Math.min(prev + 1, batches.length - 1)
    })
  }



  const lastVehicle = currentBatch[currentBatch.length - 1]
  const mapCenter = views[activeView].center
  const mapZoom = views[activeView].zoom

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <MapContainer
          center={ mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
        >
           <RecenterMap center={mapCenter} zoom={mapZoom} />
          <GoogleLayer />
          {currentBatch.map(vehicle => (
            <Marker
              key={`${vehicle.vehicleId}-${vehicle.timestamp}`}
              position={[vehicle.latitude, vehicle.longitude]}
            >
              <Popup>
                <b>Vehicle ID:</b> {vehicle.vehicleId} <br />
                <b>Speed:</b> {vehicle.speed} km/h <br />
                <b>Course:</b> {vehicle.course} <br />
                <b>Time:</b> {new Date(vehicle.timestamp).toLocaleString()}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div style={{
              width: '10rem',
              background: 'linear-gradient(145deg, #d6d6d6, #f5f5f5)',
            boxShadow: 'inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#fff',
              borderRight: '1px solid rgba(255,255,255,0.1)'}}>
        <div >
          <h4 style={{ color: 'black' }}>Map Controls</h4>
          <button onClick={handlePrev} disabled={batches.length <= 1} style={{ width: '100%', marginBottom: '0.5rem' }}>⬅️ Prev</button>
          <button onClick={handleNext} disabled={batches.length <= 1} style={{ width: '100%', marginBottom: '1rem' }}>Next ➡️</button>

          <p style={{ color: 'black' }}><b>Batch Time:</b><br />{lastTimestamp}</p>

          <hr />

          <h5 style={{ color: 'black' }}>Switch View</h5>
          <button onClick={() => setActiveView('MAIN')} style={{ width: '100%', marginBottom: '0.5rem',color: 'black' }}>🏫 LNMIIT Campus</button>
          <button onClick={() => setActiveView('PARK1')} style={{ width: '100%', marginBottom: '0.5rem',color: 'black' }}>🅿️ Parking 1 </button>
          <button onClick={() => setActiveView('PARK2')} style={{ width: '100%', marginBottom: '0.5rem',color: 'black' }}>🅿️ Parking 2</button>
          <button onClick={() => setActiveView('PARK3')} style={{ width: '100%' ,color: 'black'}}>🅿️ Parking 3</button>
          
          <hr />
          <h5 style={{ color: 'black' }}>Parking Status</h5>
          <p style={{ fontSize: '0.8rem',color: 'black' }}>🅿️ 1: {parkStatus.PARK1}</p>
          <p style={{ fontSize: '0.8rem',color: 'black' }}>🅿️ 2: {parkStatus.PARK2}</p>
          <p style={{ fontSize: '0.8rem' ,color: 'black'}}>🅿️ 3: {parkStatus.PARK3}</p>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
          GPS Tracker © 2025
        </div>
      </div>
    </div>
  )
}

function countVehiclesInBounds(vehicles, bound) {
  return vehicles.filter(v =>
    v.latitude >= bound.minLat &&
    v.latitude <= bound.maxLat &&
    v.longitude >= bound.minLng &&
    v.longitude <= bound.maxLng
  ).length
}


function RecenterMap({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom])
  return null
}