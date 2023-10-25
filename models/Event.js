const { Schema, model, models } = require("mongoose");

const EventSchema = new Schema({
    
    title: {type:String,required:true},
    description: {type:String,required:true},
    date:{type:Date,required:true},
    images:{type:[String]}

});
export const Event = models.Event||model('Event', EventSchema);