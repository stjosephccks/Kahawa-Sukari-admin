const { Schema, models, model } = require("mongoose");

const BulletinScema = new Schema({
    title:{type:String,required:true},
    content:{type:String, required:true},
    description:{type:String},
    images:{type:[String]}
});
export const Bulletin = models.Bulletin||model('Bulletin', BulletinScema);