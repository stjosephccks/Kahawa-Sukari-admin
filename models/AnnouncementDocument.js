const { Schema, model, models } = require("mongoose");

const massScheduleSchema = new Schema({
    time: { type: String, required: false },
    group: { type: String, required: false }

});

const listAnnouncementsSchema = new Schema({
    title: { type: String, required: false },
    content: { type: String, required: false },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Medium'
    },
    createdAt: { type: Date, default: Date.now }


});
const matrimonyNoticeSchema = new Schema({
    groomName: { type: String, required: false },
    groomParents: { type: String, required: false },
    brideName: { type: String, required: false },
    brideParents: { type: String, required: false },
    weddingDate: { type: Date, required: false },
    venue: { type: String, required: false }

});

const AnnouncementDocumentSchema = new Schema({
    originalFileName: { type: String, required: false },
    uploadeddate: { type: Date, default: Date.now },
    documentDate: { type: Date, required: false },
    liturgicalSeason: { type: String, required: false },
    massAnimation: { type: String, required: false },
    occasion: { type: String, required: false },

    //Mass Schedule
    currentWeekMass: [massScheduleSchema],
    nextWeekMasses: [massScheduleSchema],
    nextWeekOccasion: { type: String },
    nextWeekDate: { type: Date },

    //Announcements

    announcements: [listAnnouncementsSchema],
    matrimonyNotices: [matrimonyNoticeSchema],

    awsS3Key: { type: String }, // If storing in AWS S3
    fileUrl: { type: String },

    // Processing status
    processingStatus: {
        type: String,
        enum: ['uploaded', 'processing', 'parsed', 'error'],
        default: 'uploaded'
    }
},

    { timestamps: true },


);
export const AnnouncementDocument = models.AnnouncementDocument || model('AnnouncementDocument', AnnouncementDocumentSchema);