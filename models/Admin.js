const { Schema, models, model } = require("mongoose");
const bcrypt = require("bcrypt");

const AdminSchema = new Schema({
  email: { type: String, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
});
AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
export const AdminEmail = models.AdminEmail || model("AdminEmail", AdminSchema);
