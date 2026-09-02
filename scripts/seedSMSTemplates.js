// Seed default SMS templates
const mongoose = require('mongoose');
const { SmsTemplate } = require('../models/SmsTemplate');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://stjosephcckswebsite_db_user:wHvcjGnjfQPSdE9p@cluster0.nqbmp6n.mongodb.net/?appName=Cluster0';

const defaultTemplates = [
  {
    name: 'M-Pesa Confirmation',
    type: 'mpesa_confirmation',
    template: 'Thank you {fullName}! We have received your zaka payment of KES {amount} for {month} {year}. Receipt: {receipt}. Paybill: {paybill}. God bless you!',
    variables: ['fullName', 'zakaNumber', 'month', 'year', 'amount', 'receipt', 'paybill'],
    isActive: true
  },
  {
    name: 'Payment Confirmation',
    type: 'payment_confirmation',
    template: 'Thank you {fullName}! We have received your zaka payment for {month} {year}. Your payment has been recorded successfully. God bless you!',
    variables: ['fullName', 'zakaNumber', 'month', 'year', 'amount'],
    isActive: true
  },
  {
    name: 'Custom Template',
    type: 'custom',
    template: 'Dear {fullName}, {customMessage}.',
    variables: ['fullName', 'zakaNumber', 'month', 'year', 'amount'],
    isActive: true
  }
];

async function seedTemplates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    let createdCount = 0;
    let updatedCount = 0;

    for (const template of defaultTemplates) {
      // Check if template with same name exists
      const existing = await SmsTemplate.findOne({ name: template.name });
      
      if (existing) {
        // Update existing template
        await SmsTemplate.findByIdAndUpdate(existing._id, template);
        console.log(`Updated template: ${template.name}`);
        updatedCount++;
      } else {
        // Create new template
        await SmsTemplate.create(template);
        console.log(`Created template: ${template.name}`);
        createdCount++;
      }
    }

    console.log(`\nSummary: ${createdCount} templates created, ${updatedCount} templates updated`);
    
    // Display all templates
    const allTemplates = await SmsTemplate.find({}).sort({ type: 1, name: 1 });
    console.log('\nAll SMS Templates:');
    console.log('==================');
    allTemplates.forEach(t => {
      console.log(`- ${t.name} (${t.type})`);
      console.log(`  ${t.template.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Error seeding templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedTemplates();
