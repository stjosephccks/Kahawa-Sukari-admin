const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SmsTemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['mpesa_confirmation', 'weekly_reminder', 'payment_reminder', 'custom']
  },
  template: {
    type: String,
    required: true,
    trim: true
  },
  variables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
SmsTemplateSchema.index({ type: 1, isActive: 1 });

let SmsTemplate;
try {
  SmsTemplate = mongoose.model('SmsTemplate');
} catch {
  SmsTemplate = model('SmsTemplate', SmsTemplateSchema, 'smstemplates');
}

module.exports = {
  SmsTemplate,
  SmsTemplateSchema
};
