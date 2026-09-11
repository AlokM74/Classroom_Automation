const mongoose = require('mongoose');

const powerHistorySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    totalPower: {
      type: Number,
      required: true,
    },
    activeDevices: {
      type: Number,
      required: true,
    },
    efficiency: {
      type: String,
      default: '94.5%',
    },
    status: {
      type: String,
      enum: ['Normal', 'High Usage'],
      default: 'Normal',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PowerHistory', powerHistorySchema);
