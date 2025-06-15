import cron from 'node-cron';
import User from './app/models/user-model.js';
import Task from './app/models/task-model.js';
import Subscription from './app/models/subscription-model.js';
import sendEmail from './utils/sendEmail.js';

cron.schedule('0 9 * * *', async () => {
  const today = new Date();
  const in2Days = new Date(today);
  in2Days.setDate(today.getDate() + 2);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  try {
    const users = await User.find();
    for (const user of users) {
      if (!user.lastLoginDate || new Date(user.lastLoginDate) < yesterday) {
        if (user.streakCount > 0) {
          user.streakCount = 0;
          await user.save();
        }
      }
    }

    const expiringSubs = await Subscription.find({
      endDate: { $lte: in2Days },
      isActive: true
    }).populate('userId');

    for (const sub of expiringSubs) {
      if (sub.userId?.role === 'poster') {
        await sendEmail(
          sub.userId.email,
          '📅 Your TaskBounty Subscription is Expiring Soon',
          `Hi ${sub.userId.name},\n\nYour ${sub.planType} subscription will expire on ${sub.endDate.toDateString()}.\nPlease renew to continue posting tasks without interruption.\n\n- TaskBounty Team`
        );
      }
    }

    const biddingTasks = await Task.find({
      bidEndDate: { $lte: in2Days }
    });

    if (biddingTasks.length > 0) {
      const taskTitles = biddingTasks.map(task => `- ${task.title}`).join('\n');

      const hunters = await User.find({ role: 'hunter', isActive: true });

      for (const hunter of hunters) {
        await sendEmail(
          hunter.email,
          '⏳ Many Tasks Are Closing Bidding Soon – Grab Your Opportunity!',
          `Hi ${hunter.name},\n\nHere are some tasks whose bidding period is ending soon:\n\n${taskTitles}\n\nDon't miss your chance to place your bids!\n\n- TaskBounty Team`
        );
      }
    } 

    const assignedTasks = await Task.find({
      deadline: { $lte: in2Days },
      assignedTo: { $ne: null }
    }).populate('assignedTo');

    for (const task of assignedTasks) {
      if (task.assignedTo) {
        await sendEmail(
          task.assignedTo.email,
          '🚨 Task Deadline Approaching!',
          `Hi ${task.assignedTo.name},\n\nReminder: Your assigned task "${task.title}" is due on ${task.deadline.toDateString()}.\nPlease complete and submit it on time.\n\n- TaskBounty Team`
        );
        console.log(`📬 Sent deadline reminder to hunter: ${task.assignedTo.email}`);
      }
    }
  } catch (error) {
    console.error(error.message);
  }
});