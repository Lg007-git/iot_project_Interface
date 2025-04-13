import mongoose from 'mongoose';

const GpsDataSchema = new mongoose.Schema({
  vehicleId: String,
  latitude: Number,
  longitude: Number,
  speed: Number,
  course: Number,
  timestamp: { type: Date, default: Date.now }
},{ collection: 'gps' });

export default mongoose.model('GpsData', GpsDataSchema);
