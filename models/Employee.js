const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const EmployeeSchema = new Schema({
  employeeNumber: { 
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
  email: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  mobileNumber: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        const flexibleFormat = /^[\+]?[0-9]{9,15}$/;
        return flexibleFormat.test(v.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please enter a valid mobile number (9-15 digits, + allowed)'
    }
  },
  department: { 
    type: String,
    trim: true
  },
  position: { 
    type: String,
    trim: true
  },
  dateOfJoining: { 
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active'
  },
  totalAbsenceDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

EmployeeSchema.index({ employeeNumber: 1 });
EmployeeSchema.index({ fullName: 1 });
EmployeeSchema.index({ email: 1 });
EmployeeSchema.index({ status: 1 });

let Employee;
try {
  Employee = mongoose.model('Employee');
} catch {
  Employee = model('Employee', EmployeeSchema, 'employees');
}

module.exports = {
  Employee,
  EmployeeSchema
};
