const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ZakaPaymentSchema = new Schema({
  zakaNumber: { 
    type: String, 
    required: true,
    trim: true
  },
  zakaMember: {
    type: Schema.Types.ObjectId,
    ref: 'Zaka',
    required: true
  },
  month: { 
    type: String, 
    required: true,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 
           'July', 'August', 'September', 'October', 'November', 'December']
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2100
  },
  amount: {
    type: Number,
    required: false,
    min: 0,
    default: null
  },
  paymentMethod: {
    type: String,
    required: false,
    enum: ['cash', 'mpesa', 'bank'],
    default: 'cash'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  recordedBy: {
    type: String,
    trim: true
  },
  // M-Pesa specific fields
  mpesaReceipt: {
    type: String,
    trim: true
  },
  mpesaPhoneNumber: {
    type: String,
    trim: true
  },
  mpesaTransactionDate: {
    type: Date
  },
  mpesaPaybillNumber: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Indexes for better query performance
ZakaPaymentSchema.index({ zakaNumber: 1 });
ZakaPaymentSchema.index({ month: 1, year: 1 });
ZakaPaymentSchema.index({ paymentDate: -1 });
ZakaPaymentSchema.index({ mpesaReceipt: 1 });

// Check if model exists before compiling it
let ZakaPayment;
try {
  ZakaPayment = mongoose.model('ZakaPayment');
} catch {
  ZakaPayment = model('ZakaPayment', ZakaPaymentSchema, 'zakapayments');
}

module.exports = {
  ZakaPayment,
  ZakaPaymentSchema
};
