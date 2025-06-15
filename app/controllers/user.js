import User from "../models/user-model.js"
import bcryptjs from "bcryptjs"
import _ from "lodash"
import dotenv from "dotenv"
dotenv.config()
import jwt from "jsonwebtoken"
import sendEmail from "../../utils/sendEmail.js"

import { validationResult } from "express-validator";
import { BADGES } from "../../badges.js";
const userController={}

userController.register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const body = _.pick(req.body, ['name', 'email', 'password', 'role', 'phone']);
    try {
      const salt = await bcryptjs.genSalt();
      const hash = await bcryptjs.hash(body.password, salt);
      const totalUsers = await User.countDocuments();
  
      const user = new User(body);
      user.password = hash;
      if (totalUsers === 0) {
        user.role = 'admin';
      } else {
        if (user.role === 'poster' || user.role === 'hunter') {
          user.role = body.role;
        } else {
          return res.status(400).json({ error: "Role must be either poster or hunter" });
        }
      }
      await user.save();
      res.status(201).json(user);
      await sendEmail(
      user.email,
      'Welcome to TaskBounty!',
      `Hi ${user.name},\n\nThank you for registering on TaskBounty.\nWe're excited to have you onboard!\n\n- TaskBounty Team`
    );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Something went wrong!!!" });
    }
};

userController.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Invalid email or password!!!" });
    }
    if (user.isActive !== true) {
      return res.status(403).json({ error: "Your account is not active. Please contact administrator." });
    }
    const isVerified = await bcryptjs.compare(password, user.password);
    if (!isVerified) {
      return res.status(404).json({ error: "Invalid email or password!!!" });
    }
    const today = new Date();
    const lastLoginDate = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
    if (lastLoginDate) {
      const todayMidnight = new Date(today.setHours(0, 0, 0, 0));
      const lastLoginMidnight = new Date(lastLoginDate.setHours(0, 0, 0, 0));

      const diffTime = todayMidnight - lastLoginMidnight;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        user.streakCount = (user.streakCount || 0) + 1;
      } else if (diffDays > 1) {
        user.streakCount = 1;
      }
    } else {
      user.streakCount = 1;
    }
    user.lastLoginDate = today;

    if (!user.badges.includes(BADGES.WELCOME_BOUNTY.key)) {
      user.badges.push(BADGES.WELCOME_BOUNTY.key);
      await user.save();
    }

    if (user.streakCount >= 30 && !user.badges.includes(BADGES.STREAK_MASTER.key)) {
      user.badges.push(BADGES.STREAK_MASTER.key);
      await user.save();
    }

    if (user.subscription && !user.badges.includes(BADGES.PREMIUM_POSTER.key)) {
      user.badges.push(BADGES.PREMIUM_POSTER.key);
      await user.save();
    }

    await user.save();
    const tokenData = { userId: user._id, role: user.role };
    const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token: `Bearer ${token}`,
      streakCount: user.streakCount, 
      badges: user.badges,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Something went wrong!!!" });
  }
};

userController.account=async(req,res)=>{
    try{
        const user=await User.findById(req.userId)
        res.json(user)
    } catch(err){
        console.log(err)
        res.status(500).json({error:"Something went wrong!!!"})
    }
};

userController.list=async(req,res)=>{
    try{
        const user=await User.find()
        res.json(user)
    } catch(err){
        console.log(err)
        res.status(500).json({error:"Something went wrong!!!"})
    }
};

userController.activateUser = async(req,res)=>{
    const id=req.params.id
    const body=req.body;
    try{
        const user=await User.findByIdAndUpdate(id,body,{new:true})
        if(!user){
            return res.status(404).json({error:"User not found"})
        }
        res.status(200).json(user)
    } catch(err){
        console.log(err)
        res.status(500).json({error:"Something went wrong!!!"})

    }
}

userController.updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { email } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email) user.email = email;

    if (req.file && req.file.path) {
      user.avatar = req.file.path; 
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,          
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        role: user.role,           
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

userController.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Email not registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;  
    await user.save();

    const htmlMessage = `
      <p>Dear ${user.name},</p>
      <p>You requested a password reset. Please use the following OTP:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, simply ignore this message.</p>
      <p>Yours,</p>
      <p>The Task Bounty Team</p>
    `;

    await sendEmail(email, 'Password Reset OTP', htmlMessage);

    res.json({ msg: 'OTP sent to email' });
  } catch (err) {
    console.error('Error in forgot password controller:', err);
    res.status(500).json({ msg: 'Something went wrong' });
  }
};

userController.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Email not registered' });

    if (user.resetOTP !== otp) return res.status(400).json({ msg: 'Invalid OTP' });
    if (user.otpExpires < Date.now()) return res.status(400).json({ msg: 'OTP has expired' });
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ msg: 'Something went wrong' });
  }
};

export default userController