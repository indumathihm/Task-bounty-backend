import mongoose from "mongoose";
const { Schema, model } = mongoose;

const taskSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  budget: {
    type: Number,
    required: true,
  },
  postedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'submitted', 'under_review', 'completed', 'incomplete'],
    default: 'open',
  },
  submissionFiles: [
    {
      fileUrl: { type: String, required: true },
      submittedAt: { type: Date, default: Date.now }
    }
  ],
  deadline: Date,
  bidEndDate: Date,        

}, { timestamps: true });

const Task = model('Task', taskSchema);
export default Task;