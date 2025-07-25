const { Schema, models, model } = require("mongoose");

const BulletinScema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    description: { type: String },
    images: { type: [String] },
    sections: {
        type: [String],
        enum: ["YCA", "YSC", "CJPD", "MATRIMONY", "CHATECHISIS"]
    },
    published:{
        type:Boolean,
        default:false,
        required:true
    }
});
export const Bulletin = models.Bulletin || model('Bulletin', BulletinScema);