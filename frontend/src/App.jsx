import { LoadScript } from '@react-google-maps/api'
import MapViewer from './components/MapViewer.jsx'
import './App.css'

function App() {
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      loadingElement={<p>Loading Google Maps...</p>}
    >
      <MapViewer />
    </LoadScript>
  )
}

export default App
