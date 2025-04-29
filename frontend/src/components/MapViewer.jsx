import { MapContainer, Marker, Popup,useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.gridlayer.googlemutant'
import GoogleLayer from './GoogleLayer.jsx'
import '../App.css'
import Swal from 'sweetalert2'
import ChartView from './ChartView.jsx'


delete L.Icon.Default.prototype._getIconUrl;
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
  PARK3: 4
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
  const [showSidebar, setShowSidebar] = useState(false)
  const [showChart, setShowChart] = useState(false)

  const isMobile = window.innerWidth <= 768

  
  useEffect(() => {
    const fetchData = () => {
      axios.get('https://iot-project-interfacebackend.vercel.app/api/gps')
        .then(res => setData(res.data))
        .catch(err => console.error('Failed to fetch GPS data:', err))
    }
  
    fetchData() // Fetch immediately on mount
    const interval = setInterval(fetchData, 4000) // Then every 4 seconds
  
    return () => clearInterval(interval) // Clear interval when component unmounts
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
  PARK1: park1Count >= thresholds.PARK1 ? '❌ No Parking Area' : '✅ Parking Area Present',
  PARK2: park2Count >= thresholds.PARK2 ? '❌ No Parking Area' : '✅ Parking Area Present',
  PARK3: park3Count >= thresholds.PARK3 ? '❌ No Parking Area' : '✅ Parking Area Present'
}

const handleParkingClick = (zone) => {
  setActiveView(zone)

  let availableSlots = 0

  if (zone === 'PARK1') {
    availableSlots = Math.max(thresholds.PARK1 - park1Count, 0)
  } else if (zone === 'PARK2') {
    availableSlots = Math.max(thresholds.PARK2 - park2Count, 0)
  } else if (zone === 'PARK3') {
    availableSlots = Math.max(thresholds.PARK3 - park3Count, 0)
  }

  Swal.fire({
    title: `🅿️ ${zone} Parking Info`,
    text: `Available Slots: ${availableSlots}`,
    icon: availableSlots > 0 ? 'success' : 'error',
    confirmButtonText: 'OK'
  })
  //alert(`🅿️ ${zone} Parking:\nAvailable Slots: ${availableSlots}`)
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

  // const getCarIcon = (course) => {
  //   // Define your logic for assigning different icons based on the course
  //   if (course >= 0 && course < 90) {
  //     return '/n1.png'; // For course in [0, 90)
  //   } else if (course >= 90 && course < 180) {
  //     return '/e1.png'; // For course in [90, 180)
  //   } else if (course >= 180 && course < 270) {
  //     return '/s1.png'; // For course in [180, 270)
  //   } else {
  //     return '/w1.png'; // For course in [270, 360)
  //   }
  // };
  
  const openGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };
  
  return (
    <>
    
    <button
      onClick={() => setShowSidebar(prev => !prev)}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: '#fff',
        border: '1px solid #ccc',
        padding: '5px 10px',
        borderRadius: '5px',
        display: 'none'
      }}
      className="toggle-sidebar"
    >
      ☰ Menu
    </button>

    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1,position:'relative' }}>
        <MapContainer
          center={ mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={!isMobile}
        >
          <RecenterMap center={mapCenter} zoom={mapZoom} />
          <GoogleLayer />
          {currentBatch.map(vehicle => (
            <Marker
              key={`${vehicle.vehicleId}-${vehicle.timestamp}`}
              position={[vehicle.latitude, vehicle.longitude]}
              // icon={new L.Icon({
              //   iconUrl: getCarIcon(vehicle.course),
              //   iconSize: [40, 40],
              //   iconAnchor: [20, 20],
              // })}
            >
              <Popup>
                <b>Vehicle ID:</b> {vehicle.vehicleId} <br />
                <b>Speed:</b> {vehicle.speed} km/h <br />
                <b>Course:</b> {vehicle.course} <br />
                <b>Time:</b> {new Date(vehicle.timestamp).toLocaleString()}
              </Popup>
            </Marker>
          ))}
        
        <button onClick={() => setShowChart(prev => !prev)} style={{ position:'absolute',margin: '10px', padding: '8px 16px',marginLeft:'2.7rem', marginTop:'0.7rem',zIndex:'1001' }}>
        {showChart ? 'Hide Chart' : 'Show Chart'}
      </button>

      {showChart && (
    <div style={{
      position: 'fixed',        // fixed to screen
      top: 0,
      left: 0,
      width: '100vw',           // full width
      height: '100vh',          // full height
      backgroundColor: '#ffffff',  // solid white background
      zIndex: 1000,
      overflow: 'auto',         // scroll if chart overflows
      padding: '20px'           // optional padding
    }}>
      <ChartView />
    </div>
      )}
      </MapContainer>
      </div>
      

      <div className={`sidebar ${showSidebar ? 'show' : ''}`} style={{
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
          <h4 style={{ color: 'black',marginTop:'-0.2rem' }}>Map Controls</h4>
          <button onClick={handlePrev} disabled={batches.length <= 1} style={{ width: '100%', marginBottom: '0.3rem' }}>⬅️ Prev</button>
          <button onClick={handleNext} disabled={batches.length <= 1} style={{ width: '100%', marginBottom: '0.3rem' }}>Next ➡️</button>

          <p style={{ color: 'black' }}><b>Batch Time:</b><br />{lastTimestamp}</p>

          <hr />

          <h5 style={{ color: 'black' }}>Switch View</h5>
          <button onClick={() => setActiveView('MAIN')} style={{ width: '100%', marginBottom: '0.5rem',color: 'black' }}>🏫 LNMIIT Campus</button>
          <button onClick={() => handleParkingClick('PARK1')} style={{ width: '100%', marginBottom: '0.1rem',color: 'black' }}>🅿️ Parking 1 </button>
          <button onClick={() => openGoogleMaps(26.936884, 75.924377)} style={{ width: '100%', marginBottom: '0.5rem',color: 'black' }}>↪️Navigate to Park 1</button>
          <button onClick={() => handleParkingClick('PARK2')} style={{ width: '100%', marginBottom: '0.1rem',color: 'black' }}>🅿️ Parking 2</button>
          <button onClick={() => openGoogleMaps(26.935225, 75.924663)} style={{ width: '100%', marginBottom: '0.5rem',color: 'black' }}>↪️Navigate to Park 2</button>
          <button onClick={() => handleParkingClick('PARK3')} style={{ width: '100%' ,marginBottom: '0.1rem',color: 'black'}}>🅿️ Parking 3</button>
          <button onClick={() => openGoogleMaps(26.935124, 75.924726)} style={{ width: '100%', marginBottom: '0.5rem',color: 'black' }}>↪️Navigate to Park 3</button>

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
    </>
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