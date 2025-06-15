import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/user-model.js';
import Transaction from '../models/transaction-model.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const walletController = {};

walletController.create = async (req, res) => {
    let { amount } = req.body;
    const userId = req.userId || (req.user && req.user._id);
  
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });
  
    amount = Number(amount);
  
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }
  
    try {
      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: 'INR',
        receipt: `wallet_deposit_${Date.now()}`,
        notes: { userId: userId.toString() },
      });
  
      return res.status(200).json({ order });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
  };
  
  walletController.deposit = async (req, res) => {
    let { payment_id, order_id, signature, amount } = req.body;
    const userId = req.userId || (req.user && req.user._id);
  
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });
  
    amount = Number(amount);
  
    try {
      const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(order_id + '|' + payment_id)
        .digest('hex');
 
  
      if (generatedSignature !== signature) {
        return res.status(400).json({ message: 'Payment verification failed' });
      }
  
      if (isNaN(amount)) {
        return res.status(400).json({ message: 'Invalid amount format' });
      }
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const amountInINR = amount

      user.walletBalance = Number(user.walletBalance) + amountInINR;
      await user.save();
  
      const transaction = new Transaction({
        userId,
        type: 'deposit',
        amount: amountInINR,
        status: 'success',
        method: 'razorpay', 
        razorpayPaymentId: payment_id,
        razorpayOrderId: order_id,
      });
  
      await transaction.save();
      return res.status(200).json({ updatedWalletBalance: user.walletBalance });
    } catch (error) {
      console.error( error);
      return res.status(500).json({ message: 'Failed to deposit money', error: error.message });
    }
  };
  
walletController.getWalletBalance = async (req, res) => {
    const userId = req.userId || (req.user && req.user._id);
  
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });
  
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      return res.status(200).json({ walletBalance: user.walletBalance });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to fetch wallet balance', error: error.message });
    }
  };
  
walletController.withdraw = async (req, res) => {
  let { amount } = req.body;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'User not authenticated' });

  amount = Number(amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than zero' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    user.walletBalance -= amount;
    await user.save();

    const transaction = new Transaction({
      userId,
      type: 'withdraw',
      amount,
      status: 'success',
      method: 'wallet'
    });

    await transaction.save();

    return res.status(200).json({
      message: 'Withdrawal successful',
      updatedWalletBalance: user.walletBalance
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to withdraw money', error: error.message });
  }
};

export default walletController;