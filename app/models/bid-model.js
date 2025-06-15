import mongoose from "mongoose";
const { Schema, model } = mongoose;

const bidSchema = new Schema({
  task: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bidAmount: {
    type: Number,
    required: true,
  },
  comment: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending',
  },
}, { timestamps: true });

const Bid = model('Bid', bidSchema);
export default Bid;
