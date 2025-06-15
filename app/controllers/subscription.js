import Razorpay from 'razorpay';
import crypto from 'crypto';
import Subscription from "../models/subscription-model.js";
import User from '../models/user-model.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const subscriptionController = {};

subscriptionController.create = async (req, res) => {
  const { planType } = req.body;
  const userId = req.userId || (req.user && req.user._id);

  if (!userId) return res.status(400).json({ message: 'User is not authenticated' });
  if (!planType || !['monthly', 'yearly'].includes(planType)) return res.status(400).json({ message: 'Invalid or missing plan type' });

  try {
    const price = planType === 'monthly' ? 299 : 2999;

    const order = await razorpay.orders.create({
      amount: price * 100, 
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { userId: userId.toString(), planType },
    });

    res.status(201).json({ order });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ message: 'Error creating Razorpay order' });
  }
};

subscriptionController.verify = async (req, res) => {
  const { payment_id, order_id, signature, planType } = req.body;
  const userId = req.userId || (req.user && req.user._id);

  if (!userId) return res.status(400).json({ message: 'User  is not authenticated' });
  if (!payment_id || !order_id || !signature) return res.status(400).json({ message: 'Missing payment details' });
  if (!planType || !['monthly', 'yearly'].includes(planType)) return res.status(400).json({ message: 'Plan type is required for verification' });

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User  not found' });
    }

    const subscriptionEndDate =
      planType === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 

    const subscription = new Subscription({
      userId: user._id,
      role: 'poster',
      planType,
      startDate: new Date(),
      endDate: subscriptionEndDate,
      price: planType === 'monthly' ? 299 : 2999,
      isActive: true,
      paymentDetails: {
        paymentId: payment_id,
        orderId: order_id,
        status: 'completed', 
      },
    });

    await subscription.save();

    user.subscription = subscription._id;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment successful and subscription activated',
      subscriptionId: subscription._id,
      subscriptionEndDate,
    });
  } catch (error) {
    console.error("Error in verify method:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

subscriptionController.show = async (req, res) => {
  const userId = req.userId || (req.user && req.user._id);
  if (!userId) return res.status(400).json({ message: 'User is not authenticated' });

  try {
    const subscription = await Subscription.findOne({ userId, isActive: true });
    if (!subscription) return res.status(404).json({ message: 'No active subscription found' });

    res.status(200).json(subscription);
  } catch (error) {
    console.error("Fetch subscription error:", error);
    res.status(500).json({ message: 'Server error fetching subscription' });
  }
};

export default subscriptionController;