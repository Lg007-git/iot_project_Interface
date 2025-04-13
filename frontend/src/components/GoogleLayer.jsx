import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet.gridlayer.googlemutant'
import { useMap } from 'react-leaflet'

export default function GoogleLayer() {
  const map = useMap()

  useEffect(() => {
    if (!window.google) return

    const googleLayer = L.gridLayer.googleMutant({
      type: 'satellite'
    })

    googleLayer.addTo(map)

    return () => {
      map.removeLayer(googleLayer)
    }
  }, [map])

  return null
}
