// makeAdmin.js (Run this with: node makeAdmin.js youremail@example.com)
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const emailToPromote = process.argv[2];

if (!emailToPromote) {
  console.log('❌ Please provide an email: node makeAdmin.js youremail@example.com');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lingualink');
    console.log('✅ Connected to MongoDB');

    const result = await User.findOneAndUpdate(
      { identifier: emailToPromote.toLowerCase() },
      { $set: { role: 'admin' } },
      { new: true }
    );

    if (result) {
      console.log(`✅ Success! ${result.name} is now an ADMIN.`);
      console.log(`   You can now log in at /auth and go to /admin`);
    } else {
      console.log(`❌ Could not find a user with the email: ${emailToPromote}`);
      console.log(`   Check if the spelling is correct and the user has signed up.`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
};

run();
