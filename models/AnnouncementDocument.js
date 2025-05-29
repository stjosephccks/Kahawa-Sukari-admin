const { Schema, model, models } = require("mongoose");

const massScheduleSchema =  new Schema({
    time:{type:String, required:true},
    group:{type:String, required:true}

});

const listAnnouncementsSchema = new Schema({
    title:{type:String, required:true},
    constent:{type:String, required:true},
    priority:{
        type:String,
        enum:['High','Medium','Low'],
        default:'Medium'
    },
    createdAt:{type:Date},default:Date.now


});
const matrimonyNoticeSchema = new Schema({
    groomName: { type: String, required: true },
    groomParents: { type: String, required: true },
    brideName: { type: String, required: true },
    brideParents: { type: String, required: true },
    weddingDate: { type: Date, required: true },
    venue: { type: String, required: true }

});

const AnnouncementDocumentSchema = new Schema({
originalFileName : {type:String, required:true},
uploadeddate: {type:Date, default: Date.now},
documentDate:{type:Date, required:true},
liturgicalSeason: {type:String, required:true},

//Mass Schedule
currentWeekMass:[massScheduleSchema],
nextWeekMasses: [massScheduleSchema],
nextWeekOccasion: { type: String },
nextWeekDate: { type: Date },

//Announcements

announcement:[listAnnouncementsSchema],
matrimonyNotice:[matrimonyNoticeSchema],

awsS3Key: { type: String }, // If storing in AWS S3
fileUrl: { type: String },

// Processing status
processingStatus: {
  type: String,
  enum: ['uploaded', 'processing', 'parsed', 'error'],
  default: 'uploaded'
}},

{timestamps:true},


);
export const AnnouncementDocument = models.AnnouncementDocument || model('AnnouncementDocument', AnnouncementDocumentSchema);