// Seed default SMS templates
const mongoose = require('mongoose');
const { SMSTemplate } = require('../models/SMSTemplate');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://stjosephcckswebsite_db_user:wHvcjGnjfQPSdE9p@cluster0.nqbmp6n.mongodb.net/?appName=Cluster0';

const defaultTemplates = [
  {
    name: 'Payment Reminder - Monthly',
    category: 'payment_reminder',
    content: 'Dear {{name}}, this is a friendly reminder that your zaka payment for {{month}} {{year}} is pending. Please make your payment of KES {{amount}} at your earliest convenience. Thank you.',
    description: 'Monthly payment reminder for unpaid members',
    isDefault: true
  },
  {
    name: 'Payment Reminder - Urgent',
    category: 'payment_reminder',
    content: 'URGENT: Dear {{name}}, your zaka payment for {{month}} {{year}} is overdue. Please pay KES {{amount}} immediately to avoid any issues. Contact us if you have questions.',
    description: 'Urgent payment reminder for overdue payments',
    isDefault: false
  },
  {
    name: 'Payment Confirmation',
    category: 'payment_confirmation',
    content: 'Thank you {{name}}! We have received your zaka payment of KES {{amount}} for {{month}} {{year}}. Your payment has been recorded successfully. God bless you!',
    description: 'Payment confirmation message',
    isDefault: true
  },
  {
    name: 'Payment Receipt',
    category: 'payment_confirmation',
    content: 'PAYMENT RECEIPT: {{name}} - Zaka #{{zakaNumber}}. Amount: KES {{amount}} for {{month}} {{year}}. Payment Method: {{paymentMethod}}. Date: {{paymentDate}}.',
    description: 'Detailed payment receipt',
    isDefault: false
  },
  {
    name: 'General Announcement',
    category: 'announcement',
    content: 'Dear {{name}}, {{message}}. For more information, contact the parish office.',
    description: 'General announcement template',
    isDefault: true
  },
  {
    name: 'Meeting Reminder',
    category: 'announcement',
    content: 'Reminder: Dear {{name}}, you have a meeting scheduled for {{date}} at {{time}}. Location: {{location}}. Please attend.',
    description: 'Meeting reminder template',
    isDefault: false
  }
];

async function seedTemplates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing templates (optional - remove if you want to keep existing)
    // await SMSTemplate.deleteMany({});
    // console.log('Cleared existing templates');

    let createdCount = 0;
    let updatedCount = 0;

    for (const template of defaultTemplates) {
      // Check if template with same name exists
      const existing = await SMSTemplate.findOne({ name: template.name });
      
      if (existing) {
        // Update existing template
        await SMSTemplate.findByIdAndUpdate(existing._id, template);
        console.log(`Updated template: ${template.name}`);
        updatedCount++;
      } else {
        // Create new template
        await SMSTemplate.create(template);
        console.log(`Created template: ${template.name}`);
        createdCount++;
      }
    }

    console.log(`\nSummary: ${createdCount} templates created, ${updatedCount} templates updated`);
    
    // Display all templates
    const allTemplates = await SMSTemplate.find({}).sort({ category: 1, name: 1 });
    console.log('\nAll SMS Templates:');
    console.log('==================');
    allTemplates.forEach(t => {
      console.log(`- ${t.name} (${t.category})`);
      console.log(`  ${t.content.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Error seeding templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedTemplates();
