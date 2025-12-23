const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://stjosephcckswebsite:qRgA1pkH0vAa5WOC@cluster0.adxeabf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const AdminSchema = new mongoose.Schema({
  email: String,
  name: String,
  password: String,
  role: String,
  employeeNumber: String,
  mobileNumber: String,
  department: String,
  position: String,
  dateOfJoining: Date,
  status: String,
  totalAbsenceDays: Number
}, {
  timestamps: true
});

const AdminEmail = mongoose.model('AdminEmail', AdminSchema, 'adminemails');

async function addEmployeeNumbers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const usersWithoutNumbers = await AdminEmail.find({ 
      $or: [
        { employeeNumber: { $exists: false } },
        { employeeNumber: null },
        { employeeNumber: '' }
      ]
    });

    console.log(`Found ${usersWithoutNumbers.length} users without employee numbers`);

    let counter = await AdminEmail.countDocuments({ 
      employeeNumber: { $exists: true, $ne: null, $ne: '' } 
    });

    for (const user of usersWithoutNumbers) {
      counter++;
      const paddedNumber = String(counter).padStart(4, '0');
      const employeeNumber = `SJCCKS-${paddedNumber}`;
      
      await AdminEmail.findByIdAndUpdate(user._id, { employeeNumber });
      console.log(`✓ Updated ${user.name} with employee number: ${employeeNumber}`);
    }

    console.log('\n✅ All employee numbers generated successfully!');
    
    const allUsers = await AdminEmail.find({}).select('name email employeeNumber');
    console.log('\nAll users:');
    allUsers.forEach(user => {
      console.log(`  ${user.name} (${user.email}): ${user.employeeNumber || 'N/A'}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addEmployeeNumbers();
