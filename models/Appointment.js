import mongoose, { Schema, models } from "mongoose";

const AppointmentSlotSchema = new Schema({
  time: {
    type: String,
    required: true
  },
  appointment: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const AppointmentSchema = new Schema({
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'AdminEmail',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeEmail: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlots: [AppointmentSlotSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'AdminEmail',
    required: true
  },
  createdByName: String
}, {
  timestamps: true
});

AppointmentSchema.index({ employee: 1, date: 1 });

export const Appointment = models?.Appointment || mongoose.model('Appointment', AppointmentSchema);
