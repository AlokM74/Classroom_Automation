const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['light', 'fan', 'ac', 'projector', 'mobile', 'other'],
      required: true,
    },
    isOn: {
      type: Boolean,
      default: false,
    },
    powerConsumption: {
      type: Number,
      default: 0,
      comment: 'Current power in Watts',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Device', deviceSchema);
