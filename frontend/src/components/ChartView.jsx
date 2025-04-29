import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer ,Label} from 'recharts'
import axios from 'axios'

const ChartView = () => {
  const [data, setData] = useState([])
  const [chartData, setChartData] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('lastDay')

  const timeSlots = Array.from({ length: 24 }, (_, i) => `${i}-${(i + 1) % 24}`)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (data.length > 0) {
      processChartData()
    }
  }, [data, selectedPeriod])

  const fetchData = async () => {
    try {
      const response = await axios.get('https://iot-project-interfacebackend.vercel.app/api/gps')
      setData(response.data)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  const getToday = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  }

  const getLastWeekRange = (today) => {
    const lastSunday = new Date(today)
    lastSunday.setDate(today.getDate() - today.getDay() - 7)
    const lastSaturday = new Date(lastSunday)
    lastSaturday.setDate(lastSunday.getDate() + 6)
    return {
      start: new Date(lastSunday.setHours(0, 0, 0, 0)),
      end: new Date(lastSaturday.setHours(23, 59, 59, 999))
    }
  }

  const processChartData = () => {
    const today = getToday()
    let periodStart
    let periodEnd

    switch (selectedPeriod) {
      case 'lastDay': {
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        periodStart = new Date(yesterday.setHours(0, 0, 0, 0))
        periodEnd = new Date(yesterday.setHours(23, 59, 59, 999))
        break
      }
      case 'lastWeek': {
        const { start, end } = getLastWeekRange(today)
        periodStart = start
        periodEnd = end
        break
      }
      case 'lastMonth': {
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
        periodStart = new Date(firstDayLastMonth.setHours(0, 0, 0, 0))
        periodEnd = new Date(lastDayLastMonth.setHours(23, 59, 59, 999))
        break
      }
      case 'thisMonth': {
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        periodStart = new Date(firstDayThisMonth.setHours(0, 0, 0, 0))
        periodEnd = new Date(lastDayThisMonth.setHours(23, 59, 59, 999))
        break
      }
      default: {
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        periodStart = new Date(yesterday.setHours(0, 0, 0, 0))
        periodEnd = new Date(yesterday.setHours(23, 59, 59, 999))
      }
    }

    const filtered = data.filter(vehicle => {
      const vehicleTimestamp = new Date(vehicle.timestamp)
      return vehicleTimestamp >= periodStart && vehicleTimestamp <= periodEnd
    })

    const slotData = {}

    timeSlots.forEach(slot => {
      slotData[slot] = { timeSlot: slot, PARK1: new Set(), PARK2: new Set(), PARK3: new Set() }
    })

    const parkingAreas = {
      PARK1: { minLat: 26.936593, maxLat: 26.936951, minLng: 75.924266, maxLng: 75.924457 },
      PARK2: { minLat: 26.935023, maxLat: 26.935524, minLng: 75.924322, maxLng: 75.925024 },
      PARK3: { minLat: 26.934931, maxLat: 26.935403, minLng: 75.924419, maxLng: 75.925084 }
    }

    filtered.forEach(vehicle => {
      const timestamp = new Date(vehicle.timestamp)
      const hour = timestamp.getHours()
      const timeSlot = `${hour}-${(hour + 1) % 24}`

      let parkName = null
      Object.entries(parkingAreas).forEach(([name, bounds]) => {
        if (
          vehicle.latitude >= bounds.minLat &&
          vehicle.latitude <= bounds.maxLat &&
          vehicle.longitude >= bounds.minLng &&
          vehicle.longitude <= bounds.maxLng
        ) {
          parkName = name
        }
      })

      if (parkName && slotData[timeSlot]) {
        slotData[timeSlot][parkName].add(vehicle.vehicleId)
      }
    })

    const finalChartData = Object.values(slotData).map(slot => ({
      timeSlot: slot.timeSlot,
      PARK1: slot.PARK1.size,
      PARK2: slot.PARK2.size,
      PARK3: slot.PARK3.size
    }))

    setChartData(finalChartData)
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <h3 style={{ textAlign: 'center' }}>Parking Area's History</h3>

      <select
        onChange={(e) => setSelectedPeriod(e.target.value)}
        value={selectedPeriod}
        style={{ margin: '10px auto', display: 'block' }}
      >
        <option value="lastDay">Last Day</option>
        <option value="lastWeek">Last Week</option>
        <option value="lastMonth">Last Month</option>
        <option value="thisMonth">This Month</option>
      </select>

      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData}>
          <XAxis
            dataKey="timeSlot"
            interval={2}
            tick={{ fontSize: 12 }}
            tickMargin={10}>
                <Label
    value="Time Slot (Hours)"
    offset={0}
    position="Bottom"
    style={{ textAnchor: 'end' }}
  />
            </XAxis>
            
          
          <YAxis>
          <Label
        value="Unique Vehicles Count"
        angle={-90}
        position="left"
        offset={-10}
      />
    </YAxis>

          <Tooltip />
          <Legend />
          <Bar dataKey="PARK1" fill="#8884d8" />
          <Bar dataKey="PARK2" fill="#82ca9d" />
          <Bar dataKey="PARK3" fill="#ffc658" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ChartView
