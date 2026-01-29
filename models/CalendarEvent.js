// models/CalendarEvent.js
const { Schema, model, models } = require("mongoose");

const CalendarEventSchema = new Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    activityType: { type: String, required: true, 
        enum:['Parish', 'ADN','Deanery', 'Other']
    },
    venue: { type: String, required: true },
    group: { 
        type: String, 
        required: true,
        enum: ['All','St. JohnPaul II Outstation','PMC','YCA','CJPD','MYM','Mantle','Charistmatic','Liturgical Group','CL','Carovana','Emanuela Mazzola','St.Joseph Hospital', 'Choir',  'CWA', 'CMA', 'Parish Council', 'Other']
    },
    description: String
}, {
    timestamps: true
});

// Index for faster queries by group and date
CalendarEventSchema.index({ group: 1, date: 1 });

export const CalendarEvent = models?.CalendarEvent || model('CalendarEvent', CalendarEventSchema);