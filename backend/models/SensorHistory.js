const mongoose = require('mongoose');

const sensorHistorySchema = new mongoose.Schema(
  {
    temperature: {
      type: Number,
      required: true,
      comment: 'Temperature in Celsius',
    },
    humidity: {
      type: Number,
      required: true,
      comment: 'Relative humidity in %',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SensorHistory', sensorHistorySchema);
