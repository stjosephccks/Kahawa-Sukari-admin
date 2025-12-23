import mongoose, { Schema, models } from "mongoose";

const TimeSlotSchema = new Schema({
  time: {
    type: String,
    required: true
  },
  monday: String,
  tuesday: String,
  wednesday: String,
  thursday: String,
  friday: String,
  saturday: String,
  sunday: String
}, { _id: false });

const ScheduleSchema = new Schema({
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
  weekStartDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    default: '5:00 AM'
  },
  timezone: {
    type: String,
    default: 'EAT (Kenya)'
  },
  timeSlots: [TimeSlotSchema],
  importantTasks: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'AdminEmail',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

ScheduleSchema.index({ employee: 1, weekStartDate: 1 });

export const Schedule = models?.Schedule || mongoose.model('Schedule', ScheduleSchema);
