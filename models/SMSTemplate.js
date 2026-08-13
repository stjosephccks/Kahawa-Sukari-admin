const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SMSTemplateSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: String, 
    required: true,
    enum: ['payment_reminder', 'payment_confirmation', 'general', 'announcement'],
    default: 'general'
  },
  variables: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Indexes for better query performance
SMSTemplateSchema.index({ category: 1 });
SMSTemplateSchema.index({ name: 1 });

// Check if model exists before compiling it
let SMSTemplate;
try {
  SMSTemplate = mongoose.model('SMSTemplate');
} catch {
  SMSTemplate = model('SMSTemplate', SMSTemplateSchema, 'smstemplates');
}

module.exports = {
  SMSTemplate,
  SMSTemplateSchema
};
