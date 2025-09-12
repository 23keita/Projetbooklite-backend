const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/booklite');
    
    const adminData = {
      name: 'Admin BookLite',
      email: 'admin@booklite.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    };

    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    const admin = new User(adminData);
    await admin.save();
    
    console.log('Admin created successfully:');
    console.log('Email: admin@booklite.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.disconnect();
  }
};

createAdmin();