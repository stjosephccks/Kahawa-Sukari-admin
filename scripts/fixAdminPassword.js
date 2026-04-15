/**
 * One-time fix script for admins whose passwords were double-hashed.
 * Usage: node scripts/fixAdminPassword.js <email> <newPassword>
 * Example: node scripts/fixAdminPassword.js franklinewax@gmail.com P@SSW0RD
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const [, , email, plainPassword] = process.argv;

if (!email || !plainPassword) {
  console.error("Usage: node scripts/fixAdminPassword.js <email> <newPassword>");
  process.exit(1);
}

async function fixPassword() {
  try {
    console.log(`🔌 Connecting to MongoDB…`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected.");

    const db = mongoose.connection.db;
    const collection = db.collection("adminemails");

    const admin = await collection.findOne({ email });
    if (!admin) {
      console.error(`❌ No admin found with email: ${email}`);
      process.exit(1);
    }

    // Single hash — the API fix ensures this is what gets stored going forward
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await collection.updateOne(
      { email },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    console.log(`✅ Password reset successfully for ${email}`);
    console.log("   They can now log in with the new password.");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixPassword();
