/**
 * One-time script to create the initial superadmin account.
 * Run with: node scripts/createSuperAdmin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in your .env file.");
  process.exit(1);
}

// ────────────────────────────────────────────────────────────
// Inline schema (mirrors models/Admin.js exactly)
// ────────────────────────────────────────────────────────────
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

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.EDITOR,
      required: true,
    },
    employeeNumber: { type: String, sparse: true, trim: true },
    mobileNumber: { type: String, trim: true },
    department: { type: String, trim: true },
    position: { type: String, trim: true },
    dateOfJoining: { type: Date },
    status: {
      type: String,
      enum: ["active", "inactive", "on_leave"],
      default: "active",
    },
    totalAbsenceDays: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ────────────────────────────────────────────────────────────
// Superadmin details — change password after first login!
// ────────────────────────────────────────────────────────────
const SUPERADMIN = {
  name: "Super Admin",
  email: "admin@sjccks.org",
  password: "Admin@SJCCKS2024!", // ← change this after first login
  role: ROLES.SUPER_ADMIN,
  department: "Administration",
  position: "System Administrator",
  status: "active",
  dateOfJoining: new Date(),
};

async function createSuperAdmin() {
  try {
    console.log("🔌 Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB.");

    const AdminEmail = mongoose.models.AdminEmail
      ? mongoose.model("AdminEmail")
      : mongoose.model("AdminEmail", AdminSchema, "adminemails");

    // Check if any superadmin already exists
    const existing = await AdminEmail.findOne({ email: SUPERADMIN.email });
    if (existing) {
      console.log(
        `⚠️  A superadmin with email "${SUPERADMIN.email}" already exists. Skipping creation.`
      );
      process.exit(0);
    }

    // Hash password & generate employee number
    const count = await AdminEmail.countDocuments();
    const paddedNumber = String(count + 1).padStart(4, "0");
    const employeeNumber = `SJCCKS-${paddedNumber}`;

    const hashedPassword = await bcrypt.hash(SUPERADMIN.password, 10);

    const admin = new AdminEmail({
      ...SUPERADMIN,
      password: hashedPassword,
      employeeNumber,
    });

    await admin.save();

    console.log("\n🎉 Superadmin created successfully!");
    console.log("────────────────────────────────────");
    console.log(`   Name            : ${admin.name}`);
    console.log(`   Email           : ${admin.email}`);
    console.log(`   Role            : ${admin.role}`);
    console.log(`   Employee Number : ${admin.employeeNumber}`);
    console.log(`   Status          : ${admin.status}`);
    console.log("────────────────────────────────────");
    console.log("⚠️  Please change the default password after first login!\n");
  } catch (err) {
    console.error("❌ Error creating superadmin:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
    process.exit(0);
  }
}

createSuperAdmin();
