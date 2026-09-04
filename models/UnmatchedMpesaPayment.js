const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const UnmatchedMpesaPaymentSchema = new Schema({
  transID: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  transAmount: {
    type: Number,
    required: true
  },
  billRefNumber: {
    type: String,
    trim: true
  },
  msisdn: {
    type: String,
    trim: true
  },
  transTime: {
    type: String,
    trim: true
  },
  businessShortCode: {
    type: String,
    trim: true
  },
  paybillSource: {
    type: String,
    enum: ['Parish', 'Outstation', 'Unknown'],
    default: 'Unknown'
  },
  matchedBy: {
    type: String,
    enum: ['zakaNumber', 'phoneNumber', 'none'],
    default: 'none'
  },
  reason: {
    type: String,
    trim: true
  },
  manuallyProcessed: {
    type: Boolean,
    default: false
  },
  processedBy: {
    type: String,
    trim: true
  },
  processedAt: {
    type: Date
  },
  assignedZakaNumber: {
    type: String,
    trim: true
  },
  assignedMonth: {
    type: String,
    trim: true
  },
  assignedYear: {
    type: Number
  },
  // Parser hints — what the BillRefParser extracted from BillRefNumber
  // Used to pre-fill the admin manual assignment form
  parsedZakaNumber: {
    type: String,
    trim: true
  },
  parsedMonth: {
    type: String,
    trim: true
  },
  parsedYear: {
    type: Number
  },
  parseConfidence: {
    type: String,
    enum: ['high', 'low', 'none'],
    default: 'none'
  }
}, {
  timestamps: true
});

// Indexes
UnmatchedMpesaPaymentSchema.index({ transID: 1 });
UnmatchedMpesaPaymentSchema.index({ msisdn: 1 });
UnmatchedMpesaPaymentSchema.index({ businessShortCode: 1 });
UnmatchedMpesaPaymentSchema.index({ manuallyProcessed: 1 });
UnmatchedMpesaPaymentSchema.index({ createdAt: -1 });

let UnmatchedMpesaPayment;
try {
  UnmatchedMpesaPayment = mongoose.model('UnmatchedMpesaPayment');
} catch {
  UnmatchedMpesaPayment = model('UnmatchedMpesaPayment', UnmatchedMpesaPaymentSchema, 'unmatchedmpesapayments');
}

module.exports = {
  UnmatchedMpesaPayment,
  UnmatchedMpesaPaymentSchema
};
