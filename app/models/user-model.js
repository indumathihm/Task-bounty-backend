import mongoose from "mongoose";
const {Schema,model} = mongoose

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  password: {
    type: String,
    required: true
  },
  resetOTP: { 
    type: String 
  },
  otpExpires: { 
    type: Date 
  },
  isActive:{
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['poster', 'hunter', 'admin'],
    default: 'hunter'
  },
  bio: {
    type: String,
    default: ''
  },
  avatar: {
    type: String, 
    default: ''
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
  type: Number,
  default: 0,
  },
  subscription: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  badges: {
  type: [String],
  default: []
  },
  totalTasksCompleted: {
    type: Number,
    default: 0
  },
  streakCount: {
  type: Number,
  default: 0
},
  lastLoginDate : {
  type: Date,
  default: null 
}
}, { timestamps: true });

const User = model("User" , userSchema)
export default User