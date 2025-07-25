// scripts/migrateAdmins.js
const { AdminEmail, ROLES } = require('../models/Admin');
const { connectToDatabase } = require('../lib/mongoose');
const bcrypt = require('bcryptjs');

async function migrateAdmins() {
  try {
    console.log('Starting admin migration...');
    const mongoose = await connectToDatabase();
    
    // Get all existing admins
    const existingAdmins = await AdminEmail.find({});
    console.log(`Found ${existingAdmins.length} admins to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const admin of existingAdmins) {
      try {
        // Skip if already migrated (has role field)
        if (admin.role) {
          console.log(`Skipping already migrated admin: ${admin.email}`);
          skippedCount++;
          continue;
        }

        console.log(`Migrating admin: ${admin.email}`);
        
        // Set role (first admin becomes SUPER_ADMIN, others become EDITOR)
        const role = migratedCount === 0 ? ROLES.SUPER_ADMIN : ROLES.EDITOR;
        
        // Hash password if it's not already hashed
        let hashedPassword = admin.password;
        if (!admin.password.startsWith('$2a$')) {
          console.log(`Hashing password for ${admin.email}`);
          hashedPassword = await bcrypt.hash(admin.password, 10);
        }

        // Update the admin
        await AdminEmail.updateOne(
          { _id: admin._id },
          {
            role,
            password: hashedPassword,
            isActive: true,
            $unset: { __v: 1 } // Remove version key if it exists
          }
        );

        console.log(`Successfully migrated admin: ${admin.email} (${role})`);
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating admin ${admin.email}:`, error.message);
      }
    }

    console.log('\nMigration Summary:');
    console.log(`- Total admins: ${existingAdmins.length}`);
    console.log(`- Migrated: ${migratedCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Failed: ${existingAdmins.length - migratedCount - skippedCount}`);

    if (migratedCount > 0) {
      console.log('\nMigration completed successfully!');
    } else {
      console.log('\nNo admins needed migration.');
    }

    // Close the connection
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrateAdmins();