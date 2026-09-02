const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SmsLogSchema = new Schema({
  recipient: {
    type: String,
    required: true,
    trim: true
  },
  recipientName: {
    type: String,
    trim: true
  },
  zakaNumber: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  templateType: {
    type: String,
    enum: ['mpesa_confirmation', 'payment_confirmation', 'payment_reminder', 'weekly_reminder', 'custom']
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending'
  },
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'ZakaPayment'
  },
  error: {
    type: String,
    trim: true
  },
  apiResponse: {
    type: Schema.Types.Mixed
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
SmsLogSchema.index({ recipient: 1 });
SmsLogSchema.index({ status: 1 });
SmsLogSchema.index({ templateType: 1 });
SmsLogSchema.index({ createdAt: -1 });

let SmsLog;
try {
  SmsLog = mongoose.model('SmsLog');
} catch {
  SmsLog = model('SmsLog', SmsLogSchema, 'smslogs');
}

module.exports = {
  SmsLog,
  SmsLogSchema
};
