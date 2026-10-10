require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lingualink').then(async () => {
  const users = await User.find();
  console.log('USERS IN DB:', users.map(u => u.identifier));
  if (users.length > 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin123!', salt);
    // Force the first user to be unconditionally an admin and have Admin123!
    await User.updateOne({ _id: users[0]._id }, { $set: { password: hash, role: 'admin' } });
    console.log('--- SUCCESS ---');
    console.log('USE THIS EMAIL TO LOGIN:', users[0].identifier);
    console.log('PASSSWORD: Admin123!');
  } else {
    console.log('NO USERS FOUND IN DATABASE');
  }
  process.exit();
}).catch(console.error);
