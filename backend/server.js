const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const sensorRoutes = require('./routes/sensorRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = ['http://localhost:5173', 'https://classroomauto.ionode.cloud'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sensors', sensorRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Classroom Automation API is running 🚀' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');

    const Device = require('./models/Device');
    const PowerHistory = require('./models/PowerHistory');
    const SensorHistory = require('./models/SensorHistory');

    // Seed default devices
    const deviceCount = await Device.countDocuments();
    if (deviceCount === 0) {
      await Device.insertMany([
        { name: 'Light 1', type: 'light', isOn: false, powerConsumption: 20 },
        { name: 'Light 2', type: 'light', isOn: false, powerConsumption: 22 },
        { name: 'Light 3', type: 'light', isOn: false, powerConsumption: 18 },
        { name: 'Fan 1',   type: 'fan',   isOn: false, powerConsumption: 40 },
        { name: 'Fan 2',   type: 'fan',   isOn: false, powerConsumption: 45 },
        { name: 'Fan 3',   type: 'fan',   isOn: false, powerConsumption: 38 },
      ]);
      console.log('🌱 Default devices seeded');
    }

    // Seed mock hourly reports if empty
    const historyCount = await PowerHistory.countDocuments();
    if (historyCount === 0) {
      const mockHistory = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setHours(date.getHours() - (12 - i));
        return {
          timestamp: date,
          totalPower: 120 + Math.floor(Math.random() * 60),
          activeDevices: 3 + Math.floor(Math.random() * 3),
          status: Math.random() > 0.8 ? 'High Usage' : 'Normal',
        };
      });
      await PowerHistory.insertMany(mockHistory);
      console.log('🌱 Hourly power history seeded');
    }

    // Seed mock sensor readings if empty (48 half-hourly entries → 24 hours)
    const sensorCount = await SensorHistory.countDocuments();
    if (sensorCount === 0) {
      const baseTempC = 24; // comfortable classroom baseline
      const baseHumidity = 55;
      const mockSensors = Array.from({ length: 48 }, (_, i) => {
        const date = new Date();
        date.setMinutes(date.getMinutes() - (48 - i) * 30);
        // Simulate daily cycle: slightly warmer midday, higher humidity morning/evening
        const hourOfDay = date.getHours() + date.getMinutes() / 60;
        const tempVariance = 3 * Math.sin((Math.PI * (hourOfDay - 6)) / 12); // peak at noon
        const humVariance = -5 * Math.sin((Math.PI * (hourOfDay - 6)) / 12) + (Math.random() * 4 - 2);
        return {
          timestamp: date,
          temperature: parseFloat((baseTempC + tempVariance + (Math.random() * 1.5 - 0.75)).toFixed(1)),
          humidity: parseFloat(Math.min(95, Math.max(30, baseHumidity + humVariance)).toFixed(1)),
        };
      });
      await SensorHistory.insertMany(mockSensors);
      console.log('🌱 Sensor history seeded (48 half-hourly readings)');
    }

    // ── Periodic live sensor simulation (every 30 min) ──
    const logSensorReading = async () => {
      try {
        const now = new Date();
        const hourOfDay = now.getHours() + now.getMinutes() / 60;
        const temp = parseFloat((24 + 3 * Math.sin((Math.PI * (hourOfDay - 6)) / 12) + (Math.random() * 1.5 - 0.75)).toFixed(1));
        const humidity = parseFloat(Math.min(95, Math.max(30, 55 - 5 * Math.sin((Math.PI * (hourOfDay - 6)) / 12) + (Math.random() * 4 - 2))).toFixed(1));
        await SensorHistory.create({ temperature: temp, humidity });
        console.log(`🌡️  Sensor Log: ${temp}°C  💧 ${humidity}%`);
      } catch (err) {
        console.error('❌ Failed to log sensor reading:', err.message);
      }
    };
    setInterval(logSensorReading, 30 * 60 * 1000); // every 30 minutes

    // Hourly Logging Task
    const logPowerUsage = async () => {
      try {
        const activeDevices = await Device.find({ isOn: true });
        const totalPower = activeDevices.reduce((sum, d) => sum + d.powerConsumption, 0);
        
        await PowerHistory.create({
          totalPower,
          activeDevices: activeDevices.length,
          status: totalPower > 250 ? 'High Usage' : 'Normal'
        });
        console.log(`📊 Hourly Log: ${totalPower}W usage across ${activeDevices.length} devices.`);
      } catch (err) {
        console.error('❌ Failed to log hourly power:', err.message);
      }
    };

    // Run every hour (3600000 ms)
    setInterval(logPowerUsage, 3600000);

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
