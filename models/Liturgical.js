const { Schema, model, models } = require("mongoose");

// Liturgical Schedule Schema
const liturgicalScheduleSchema = new Schema({
    time: { type: String, required: false },
    service: { type: String, required: false },
    language: { 
        type: String, 
        enum: ['EN', 'SW', null],
        required: false 
    },
    location: { type: String, required: false },
    highlight: { type: Boolean, default: false },
    serviceType: {
        type: String,
        enum: ['Mass', 'Adoration', 'Rosary', 'Confession', 'Worship', 'Other'],
        default: 'Other'
    },
    originalText: { type: String, required: false }
});

// Liturgical Day Schema
const liturgicalDaySchema = new Schema({
    date: { type: String, required: false },
    day: { 
        type: String, 
        enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
        required: false 
    },
    saint: { type: String, required: false },
    saintType: { type: String, required: false },
    liturgicalRank: {
        type: String,
        enum: ['SOLEMNITY', 'FEAST', 'MEMORIAL', 'OPTIONAL MEMORIAL', ''],
        required: false
    },
    specialCelebration: { type: String, required: false },
    schedule: [liturgicalScheduleSchema]
});

// Liturgical Program Schema
const LiturgicalProgramSchema = new Schema({
    // Basic document info
    originalFileName: { type: String, required: false },
    fileName: { type: String, required: false },
    uploadedDate: { type: Date, default: Date.now },
    
    // Liturgical information
    weekTitle: { type: String, required: false },
    period: { type: String, required: false },
    year: { type: String, required: false },
    liturgicalSeason: {
        type: String,
        enum: ['EASTER', 'ORDINARY TIME', 'ADVENT', 'LENT', 'CHRISTMAS'],
        default: 'ORDINARY TIME'
    },
    weekNumber: { type: String, required: false },
    liturgicalYear: {
        type: String,
        enum: ['A', 'B', 'C'],
        default: 'C'
    },
    weekStartDate: { type: Date, required: false },
    
    // Daily schedules
    days: [liturgicalDaySchema],
    
    // File storage
    s3Url: { type: String, required: false },
    awsS3Key: { type: String, required: false },
    fileUrl: { type: String, required: false },
    
    // Processing metadata
    parsedAt: { type: Date, default: Date.now },
    processingStatus: {
        type: String,
        enum: ['uploaded', 'processing', 'parsed', 'error'],
        default: 'uploaded'
    },
    isActive: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    
    // Statistics
    stats: {
        totalDays: { type: Number, default: 0 },
        totalServices: { type: Number, default: 0 },
        specialCelebrations: { type: Number, default: 0 },
        saints: { type: Number, default: 0 }
    },
    
    // Validation warnings
    warnings: [{ type: String }]
}, 
{ timestamps: true });

// Pre-save middleware to calculate stats
LiturgicalProgramSchema.pre('save', function(next) {
    if (this.days && this.days.length > 0) {
        this.stats.totalDays = this.days.length;
        this.stats.totalServices = this.days.reduce((sum, day) => sum + (day.schedule ? day.schedule.length : 0), 0);
        this.stats.specialCelebrations = this.days.filter(day => day.specialCelebration && day.specialCelebration.trim() !== '').length;
        this.stats.saints = this.days.filter(day => day.saint && day.saint.trim() !== '' && !day.saint.toLowerCase().includes('weekday')).length;
    }
    next();
});

// Indexes for better query performance
LiturgicalProgramSchema.index({ liturgicalSeason: 1, weekStartDate: 1 });
LiturgicalProgramSchema.index({ isActive: 1 });
LiturgicalProgramSchema.index({ processingStatus: 1 });
LiturgicalProgramSchema.index({ year: 1, weekNumber: 1 });

// Export model
export const LiturgicalProgram = models.LiturgicalProgram || model('LiturgicalProgram', LiturgicalProgramSchema);