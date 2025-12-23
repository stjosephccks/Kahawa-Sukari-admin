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
  email: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.EDITOR, required: true },
  employeeNumber: { 
    type: String, 
    sparse: true,
    trim: true
  },
  mobileNumber: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const flexibleFormat = /^[\+]?[0-9]{9,15}$/;
        return flexibleFormat.test(v.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please enter a valid mobile number (9-15 digits, + allowed)'
    }
  },
  department: { 
    type: String,
    trim: true
  },
  position: { 
    type: String,
    trim: true
  },
  dateOfJoining: { 
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active'
  },
  totalAbsenceDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

AdminSchema.methods.hasPermission = function (permission) {
  if (this.role === ROLES.SUPER_ADMIN) return true;
  return ROLE_PERMISSIONS[this.role]?.includes(permission);
};

AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password") && this.employeeNumber) return next();
  
  if (!this.employeeNumber) {
    const count = await mongoose.model('AdminEmail').countDocuments();
    const paddedNumber = String(count + 1).padStart(4, '0');
    this.employeeNumber = `SJCCKS-${paddedNumber}`;
  }
  
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
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