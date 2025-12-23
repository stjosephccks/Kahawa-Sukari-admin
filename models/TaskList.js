import mongoose, { Schema, models } from "mongoose";

const ImportantDateSchema = new Schema({
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const TaskItemSchema = new Schema({
  dueDate: {
    type: Date,
    required: true
  },
  group: {
    type: String,
    required: true,
    trim: true
  },
  task: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const TaskListSchema = new Schema({
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
  highlightDate: {
    type: Date,
    required: true
  },
  importantDates: [ImportantDateSchema],
  tasks: [TaskItemSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'AdminEmail',
    required: true
  },
  createdByName: String
}, {
  timestamps: true
});

TaskListSchema.index({ employee: 1, highlightDate: 1 });

export const TaskList = models?.TaskList || mongoose.model('TaskList', TaskListSchema);
