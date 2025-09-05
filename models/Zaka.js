const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ZakaSchema = new Schema({
  zakaNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  fullName: { 
    type: String, 
    required: true,
    trim: true
  },
  mobileNumber: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Very flexible phone number validation
        // Accepts: +254790943918, 0790943918, 790943918, 0111111111, etc.
        // Minimum 9 digits, maximum 15 digits, allows + at start
        const flexibleFormat = /^[\+]?[0-9]{9,15}$/;
        return flexibleFormat.test(v.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please enter a valid mobile number (9-15 digits, + allowed)'
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes for better query performance
ZakaSchema.index({ zakaNumber: 1 });
ZakaSchema.index({ fullName: 1 });

// Check if model exists before compiling it
let Zaka;
try {
  Zaka = mongoose.model('Zaka');
} catch {
  Zaka = model('Zaka', ZakaSchema, 'zakas');
}

module.exports = {
  Zaka,
  ZakaSchema
};
