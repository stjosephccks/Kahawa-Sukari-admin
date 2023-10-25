import mongoose, {model,Schema, models} from "mongoose";
//const { Schema, model, models } = require("mongoose");

const AnnouncementSchema = new Schema({  
    title: {type:String,required:true},
    description: {type:String,required:true},
    sunday:{type:mongoose.Types.ObjectId,ref:'Sunday'}

});
export const Announcement = models.Announcement||model('Announcement', AnnouncementSchema);