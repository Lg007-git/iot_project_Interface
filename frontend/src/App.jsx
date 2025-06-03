import { LoadScript } from '@react-google-maps/api'
import MapViewer from './components/MapViewer.jsx'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ChartView from './components/ChartView'
import HistoryView from './components/History.jsx'
import IotMapView from './components/IotMapViewer.jsx'
import './App.css'

function App() {
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      loadingElement={<p>Loading Google Maps...</p>}
    >
      <Router>
        <Routes>
          {/* <MapViewer /> */}
          <Route path="/" element={<MapViewer />} />
          <Route path="/chart" element={<ChartView />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/iot-map" element={<IotMapView />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </LoadScript>
  )
}

export default App
