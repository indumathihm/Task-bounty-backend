import mongoose from "mongoose";
const { Schema, model } = mongoose;

const transactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['task_posting', 'task_payment', 'subscription_payment','deposit','withdraw'],
    required: true
  },  
  amount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: 0
  },
  task: {
    type: Schema.Types.ObjectId,
    ref: 'Task'
  },
  subscription: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed','success'],
    default: 'pending'
  },
  method: {
  type: String,
  enum: ['wallet', 'razorpay'],
  required: true
},
razorpayOrderId: {
  type: String
},
razorpayPaymentId: {
  type: String
},


}, { timestamps: true });

const Transaction = model('Transaction', transactionSchema);
export default Transaction;