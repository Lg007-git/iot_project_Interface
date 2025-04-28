import { useEffect, useState } from 'react'
import axios from 'axios'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import GoogleLayer from './GoogleLayer'


const timeRanges = {
  '00:00-06:00': [0, 6],
  '06:00-12:00': [6, 12],
  '12:00-18:00': [12, 18],
  '18:00-00:00': [18, 24],
}

const views = {
  MAIN: { center: [26.933624, 75.923047], zoom: 17 }
}

function History() {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('lastDay')
  const [selectedTimeRange, setSelectedTimeRange] = useState('00:00-06:00')

  const fetchData = async () => {
    try {
      const response = await axios.get('https://iot-project-interfacebackend.vercel.app/api/gps')
      console.log(response.data);
      setData(response.data)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  const filterByTimeRange = (data, timeRange) => {
    const [startHour, endHour] = timeRanges[timeRange]
    return data.filter(vehicle => {
      const vehicleTime = new Date(vehicle.timestamp)
      const vehicleHour = vehicleTime.getHours()
      return vehicleHour >= startHour && vehicleHour < endHour
    })
  }

  const filterDataByPeriod = () => {
    const now = new Date()
    let filtered = []
    let periodStart;

    switch (selectedPeriod) {
      case 'lastDay':
        periodStart = new Date(now.setDate(now.getDate() - 1))
        break
      case 'lastWeek':
        periodStart = new Date(now.setDate(now.getDate() - 7))
        break
      case 'lastMonth':
        periodStart = new Date(now.setMonth(now.getMonth() - 1))
        break
      default:
        periodStart = new Date(now.setDate(now.getDate() - 1))
    }

    filtered = data.filter(vehicle => {
      const vehicleTimestamp = new Date(vehicle.timestamp)
      return vehicleTimestamp >= periodStart
    })

    setFilteredData(filterByTimeRange(filtered, selectedTimeRange))
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (data.length > 0) {
      filterDataByPeriod()
    }
  }, [data, selectedPeriod, selectedTimeRange])

  const mapCenter = views.MAIN.center
  const mapZoom = views.MAIN.zoom

  return (
    <div style={{ display: 'flex', height: '100%',width:'100%' }}>
      <div style={{ flex: 1 }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100vh', width: '181.7vh' }}
        >
          <GoogleLayer />
          {filteredData.map(vehicle => (
            <Marker
              key={`${vehicle.vehicleId}-${vehicle.timestamp}`}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={getIcon(vehicle.course)}
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

      <div style={{ width: '2500px', padding: '1rem', background: '#f1f1f1' }}>
        <h4>Filter by Period</h4>
        <select onChange={e => setSelectedPeriod(e.target.value)} value={selectedPeriod}>
          <option value="lastDay">Last Day</option>
          <option value="lastWeek">Last Week</option>
          <option value="lastMonth">Last Month</option>
        </select>

        <h4>Filter by Time Range</h4>
        <select onChange={e => setSelectedTimeRange(e.target.value)} value={selectedTimeRange}>
          {Object.keys(timeRanges).map(range => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

const getIcon = (course) => {
  let iconUrl
  if (course >= 0 && course <= 90) {
    iconUrl = '/n1.png'
  } else if (course > 90 && course <= 180) {
    iconUrl = '/e1.png'
  } else if (course > 180 && course <= 270) {
    iconUrl = '/s1.png'
  } else {
    iconUrl = '/w1.png'
  }
  return L.icon({
    iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

export default History
