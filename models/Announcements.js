import mongoose, { model, Schema, models } from "mongoose";

const AnnouncementSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  sunday: { type: mongoose.Types.ObjectId, ref: "Sunday" },
  massScheduleAssignments: [{ name: String, time: String }],
  published:{type:Boolean, default:false, required:true}
});

export const Announcement =
  models.Announcement || model("Announcement", AnnouncementSchema);
