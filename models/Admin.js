const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const bcrypt = require("bcryptjs");

const ROLES = {
  SUPER_ADMIN: "super_admin",
  EDITOR: "editor",
  PUBLISHER: "publisher",
};

const PERMISSIONS = {
  EDIT: "edit",
  DELETE: "delete",
  PUBLISH: "publish",
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [PERMISSIONS.EDIT, PERMISSIONS.DELETE, PERMISSIONS.PUBLISH],
  [ROLES.EDITOR]: [PERMISSIONS.EDIT],
  [ROLES.PUBLISHER]: [PERMISSIONS.PUBLISH],
};

const AdminSchema = new Schema({
  email: { type: String, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.EDITOR, required: true },
});

AdminSchema.methods.hasPermission = function (permission) {
  if (this.role === ROLES.SUPER_ADMIN) return true;
  return ROLE_PERMISSIONS[this.role]?.includes(permission);
};

AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Check if model exists before compiling it
let AdminEmail;
try {
  AdminEmail = mongoose.model('AdminEmail');
} catch {
  AdminEmail = model('AdminEmail', AdminSchema, 'adminemails');
}

module.exports = {
  AdminEmail,
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS
};