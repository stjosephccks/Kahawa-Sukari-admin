const { Schema, models, model } = require("mongoose");

const AdminShema = new Schema({
    email:{type:String, unique:true},
    name: {type:String,required:true}
});
export const AdminEmail = models.AdminEmail||model('AdminEmail', AdminShema)
