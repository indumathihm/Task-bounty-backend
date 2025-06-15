import mongoose from "mongoose";
const { Schema, model } = mongoose;

const subscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['poster'],
    required: true
  },
  planType: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  paymentDetails: { 
    paymentId: {
      type: String,
      required: true
    },
    orderId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      required: true
    }
  }
}, { timestamps: true });

const Subscription = model('Subscription', subscriptionSchema);
export default Subscription;