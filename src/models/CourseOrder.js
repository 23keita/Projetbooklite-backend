import mongoose from 'mongoose';

const courseOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'GNF'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  type: {
    type: String,
    default: 'course'
  }
}, {
  timestamps: true
});

export default mongoose.model('CourseOrder', courseOrderSchema);