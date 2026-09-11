const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const PowerHistory = require('../models/PowerHistory');

// @route  GET /api/devices/reports/hourly
// @desc   Get historical hourly power logs
// @access Public
router.get('/reports/hourly', async (req, res) => {
  try {
    const logs = await PowerHistory.find().sort({ timestamp: -1 }).limit(24);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
const { protect } = require('../middleware/authMiddleware');

// @route  GET /api/devices
// @desc   Get all devices and complete classroom status
// @access Protected
router.get('/', async (req, res) => {
  try {
    const SensorHistory = require('../models/SensorHistory');
    const devices = await Device.find().sort({ type: 1, name: 1 });
    const latestSensor = await SensorHistory.findOne().sort({ timestamp: -1 }).lean();

    const fans = devices.filter(d => d.type === 'fan');
    const lights = devices.filter(d => d.type === 'light');
    const others = devices.filter(d => d.type !== 'fan' && d.type !== 'light');
    
    const totalPowerConsumption = devices.reduce((sum, d) => d.isOn ? sum + d.powerConsumption : sum, 0);

    res.json({
      id: "classroom_1",
      devices, 
      totalPowerConsumption,
      sensorData: latestSensor || { temperature: 0, humidity: 0 },
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route  POST /api/devices
// @desc   Create a new dummy device OR sync all classroom data
// @access Protected
router.post('/', async (req, res) => {
  try {
    const { name, type, powerConsumption, isOn, sensorData, fans, lights } = req.body;
    
    // If it's a legacy create device request
    if (name && type) {
      const newDevice = new Device({
        name,
        type,
        powerConsumption: powerConsumption || 0,
        isOn: isOn || false
      });
      const savedDevice = await newDevice.save();
      return res.status(201).json(savedDevice);
    }

    // Otherwise, treat it as a Sync Data request
    const SensorHistory = require('../models/SensorHistory');

    // 1. Update Sensor Data if provided
    if (sensorData && sensorData.temperature !== undefined && sensorData.humidity !== undefined) {
      await SensorHistory.create({
        temperature: sensorData.temperature,
        humidity: sensorData.humidity
      });
    }

    // 2. Update Fans if provided
    if (fans && Array.isArray(fans)) {
      for (const f of fans) {
        if (f._id) {
          const updateData = {};
          if (f.isOn !== undefined) updateData.isOn = f.isOn;
          if (f.powerConsumption !== undefined) updateData.powerConsumption = f.powerConsumption;
          updateData.lastUpdated = new Date();
          await Device.findByIdAndUpdate(f._id, updateData);
        }
      }
    }

    // 3. Update Lights if provided
    if (lights && Array.isArray(lights)) {
      for (const l of lights) {
        if (l._id) {
          const updateData = {};
          if (l.isOn !== undefined) updateData.isOn = l.isOn;
          if (l.powerConsumption !== undefined) updateData.powerConsumption = l.powerConsumption;
          updateData.lastUpdated = new Date();
          await Device.findByIdAndUpdate(l._id, updateData);
        }
      }
    }

    // 4. Fetch the updated state to return
    const devices = await Device.find().sort({ type: 1, name: 1 });
    const latestSensor = await SensorHistory.findOne().sort({ timestamp: -1 }).lean();

    const totalPower = devices.reduce((sum, d) => d.isOn ? sum + d.powerConsumption : sum, 0);

    res.json({
      id: "classroom_1",
      message: "Data synced successfully",
      devices,
      totalPowerConsumption: totalPower,
      sensorData: latestSensor || { temperature: 0, humidity: 0 },
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route  POST /api/devices/:id/update
// @desc   Update a device status
// @access Public
router.post('/:id/update', async (req, res) => {
  try {
    const { isOn } = req.body;
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (isOn !== undefined) device.isOn = isOn;
    device.lastUpdated = new Date();
    await device.save();

    res.json(device);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route  PUT /api/devices/:id
// @desc   Update device details (name, type, power, status)
// @access Public
router.put('/:id', async (req, res) => {
  try {
    const { name, type, powerConsumption, isOn } = req.body;
    const updateData = { lastUpdated: new Date() };

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (powerConsumption !== undefined) updateData.powerConsumption = powerConsumption;
    if (isOn !== undefined) updateData.isOn = isOn;

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json(device);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route  DELETE /api/devices/:id
// @desc   Delete a device
// @access Public
router.delete('/:id', async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    res.json({ message: 'Device deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route  POST /api/devices/power/update
// @desc   Update power consumption for a device (IoT endpoint)
// @access Protected
router.post('/power/update', async (req, res) => {
  try {
    const { deviceId, powerConsumption } = req.body;

    const device = await Device.findByIdAndUpdate(
      deviceId,
      { powerConsumption, lastUpdated: new Date() },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json(device);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route  POST /api/devices/bulk-update
// @desc   Update all devices (toggle state and/or power consumption)
// @access Public
router.post('/bulk-update', async (req, res) => {
  try {
    const { isOn, powerConsumption } = req.body;
    const updateData = { lastUpdated: new Date() };
    
    if (isOn !== undefined) updateData.isOn = isOn;
    if (powerConsumption !== undefined) updateData.powerConsumption = powerConsumption;

    await Device.updateMany({}, updateData);
    
    // Return the updated list
    const devices = await Device.find().sort({ type: 1, name: 1 });
    res.json({
      devices,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route  GET /api/devices/power/total
// @desc   Get total power consumption of all ON devices
// @access Protected
router.get('/power/total', async (req, res) => {
  try {
    const devices = await Device.find({ isOn: true });
    const total = devices.reduce((sum, d) => sum + d.powerConsumption, 0);
    res.json({ total, devices });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
