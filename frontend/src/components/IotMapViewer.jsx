import { MapContainer, Marker, Popup,useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.gridlayer.googlemutant'
import GoogleLayer from './GoogleLayer.jsx'
import '../App.css'
import { useNavigate } from 'react-router-dom'

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

export default function IotMapViewer() {
  const [batches, setBatches] = useState([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('https://smart-traffic-its.vercel.app/api/fetchdata')
      .then(res => {
        // Sort by latest first
        const sorted = [...res.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
        const chunks = [];
        let index = 0;
  
        while (index < sorted.length) {
          const start = new Date(sorted[index].createdAt);
          const chunk = [];
          const seen = new Set();
  
          while (index < sorted.length) {
            const entry = sorted[index];
            const diff = (new Date(start) - new Date(entry.createdAt)) / 1000; // positive difference from first entry
  
            if (diff <= 4) {
              if (!seen.has(entry.vehicleID)) {
                chunk.push(entry);
                seen.add(entry.vehicleID);
              }
              index++;
            } else {
              break;
            }
          }
  
          if (chunk.length > 0) {
            chunks.push(chunk);
          }
        }
  
        setBatches(chunks);     // chunk[0] is latest
        setBatchIndex(0);       // display latest batch
      })
      .catch(err => console.error('Failed to fetch IoT data:', err));
  }, []);
  


  const currentBatch = batches[batchIndex] || [];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer center={[26.933624, 75.923047]} zoom={17} style={{ height: '100%', width: '100%' }}>
        <GoogleLayer />
        {currentBatch.map((vehicle, idx) => (
          <Marker
            key={`iot-${vehicle.vehicleID}-${idx}`}
            position={[vehicle.latitude, vehicle.longitude]}
          >
            <Popup>
              <b>ID:</b> {vehicle.vehicleID}<br/>
              <b>Latitude:</b> {vehicle.latitude}<br/>
              <b>Longitude:</b> {vehicle.longitude}<br/>
              <b>Speed:</b> {vehicle.speed} km/h<br/>
              <b>Accel Course:</b> {vehicle.accelCourse}<br/>
              {/* <b>Time:</b> {vehicle.time}<br/> */}
              <b>Created:</b> {new Date(vehicle.createdAt).toLocaleString()}
            </Popup>
          </Marker>
        ))}
        <button className="showIotmap" onClick={() => {navigate('/map');}}>
              {'Main map'}
        </button>

        <button className="showchart" onClick={() => {navigate('/chart');}}>
            {'Show Chart'}
        </button>

      </MapContainer>

      <div style={{ position: 'absolute', top: 50, right: 10, zIndex: 2001 }}>
        <button 
          onClick={() => setBatchIndex(prev => Math.max(prev - 1, 0))} 
          disabled={batchIndex === 0}
          style={{ marginRight: '10px' }}
        >
          ⬅️ Prev
        </button>
        <button 
          onClick={() => setBatchIndex(prev => Math.min(prev + 1, batches.length - 1))} 
          disabled={batchIndex >= batches.length - 1}
        >
          Next ➡️
        </button>
      </div>
    </div>
  );
}
