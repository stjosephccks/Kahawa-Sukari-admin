const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const AbsenceSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'AdminEmail',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  employeeNumber: {
    type: String,
    trim: true
  },
  absenceType: {
    type: String,
    enum: ['vacation', 'personal', 'sick', 'custom1', 'custom2'],
    required: true
  },
  customTypeName: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'AdminEmail',
    required: true
  },
  requestedByRole: {
    type: String,
    enum: ['employee', 'admin'],
    default: 'employee'
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

AbsenceSchema.index({ user: 1 });
AbsenceSchema.index({ startDate: 1, endDate: 1 });
AbsenceSchema.index({ status: 1 });
AbsenceSchema.index({ absenceType: 1 });

AbsenceSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    this.totalDays = diffDays;
  }
  next();
});

let Absence;
try {
  Absence = mongoose.model('Absence');
} catch {
  Absence = model('Absence', AbsenceSchema, 'absences');
}

module.exports = {
  Absence,
  AbsenceSchema
};
