import Task from "../models/task-model.js";
import User from "../models/user-model.js";
import Transaction from "../models/transaction-model.js";
import Subscription from "../models/subscription-model.js";
import Bid from "../models/bid-model.js";
import { validationResult } from "express-validator";
import { BADGES } from "../../badges.js";
import {sendSMS} from "../../utils/twilio.js"
import sendEmail from "../../utils/sendEmail.js";

const taskController = {};

taskController.createTaskWithWallet = async (req, res) => {
  try {
    const { title, description, category, budget, deadline, bidEndDate } = req.body;
    const userId = req.userId;

    const budgetNum = Number(budget);
    const deadlineDate = new Date(deadline);
    const bidEndDateDate = new Date(bidEndDate);

    if (isNaN(budgetNum) || isNaN(deadlineDate.getTime()) || isNaN(bidEndDateDate.getTime())) {
      return res.status(400).json({ message: "Invalid input for budget or dates" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "poster") {
      return res.status(403).json({ message: "Only posters can create tasks" });
    }

    const now = new Date();
    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      isActive: true,
      endDate: { $gte: now },
    });

    let platformFee = 0;
    if (!activeSubscription) {
      platformFee = budgetNum * 0.1; 
    }

    const totalAmount = budgetNum + platformFee;

    if (user.walletBalance < totalAmount) {
      return res.status(400).json({
        message: `Insufficient wallet balance. Required: ₹${totalAmount.toFixed(2)}, Available: ₹${user.walletBalance.toFixed(2)}`
      });
    }

    user.walletBalance -= totalAmount;
    await user.save();

    const task = await Task.create({
      title,
      description,
      category,
      budget: budgetNum,
      bidEndDate: bidEndDateDate,
      deadline: deadlineDate,
      postedBy: userId,
      status: "open",
    });

    await Transaction.create({
      userId,
      task: task._id,
      amount: totalAmount,
      type: "task_posting",
      method: "wallet",
      status: "success",
    });

    res.status(201).json({ message: "Task created using wallet (including platform fee)", task });

     User.find({ role: 'hunter', isActive: true })
      .then(hunters => {
        hunters.forEach(hunter => {
          sendEmail(
            hunter.email,
            '🆕 New Task Posted on TaskBounty!',
            `Hi ${hunter.name},\n\nA new task titled "${task.title}" has just been posted.\nCheck it out and place your bids soon!\n\n- TaskBounty Team`
          ).catch(console.error);
        });
      })
      .catch(console.error);
  } catch (error) {
    console.error("createTaskWithWallet error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


taskController.allTasks=async(req,res)=>{
    try{
        const task=await Task.find()
        .populate("postedBy", "name avatar email role")
        .populate("assignedTo", "name")
        .populate("category", "name");
        res.json(task)
    } catch(err){
        console.log(err)
        res.status(500).json({error:"Something went wrong!!!"})
    }
};

taskController.list = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, sortBy = "createdAt", sortOrder = "desc", category,endingSoon } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const filter = {};
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }
    if (category) {
      filter.category = category;
    }
    if (endingSoon === "true") {
      filter.status = "open";
      filter.bidEndDate = { $gte: new Date() }; 
      sortBy = "bidEndDate"; 
      sortOrder = "asc";
    }
    const skip = (page - 1) * limit;
    const validSortOrders = ["asc", "desc"];
    sortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : "desc";

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const tasks = await Task.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("category")
      .populate("postedBy", "name avatar  email role")
      .populate("assignedTo", "name")
      .populate("category", "name");

    const totalCount = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({ tasks, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

taskController.show = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const task = await Task.findById(req.params.id)
      .populate("postedBy", "name avatar email role")
      .populate("assignedTo", "name")
      .populate("category", "name");

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(task);
  } catch (error) {
    console.error("show error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

taskController.mytasks = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const tasks = await Task.find({ postedBy: req.params.id })
      .populate("postedBy", "name email")
      .populate("assignedTo", "name")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    if (!tasks.length) return res.status(404).json({ message: "No tasks found for this user" });
    res.status(200).json(tasks);
  } catch (error) {
    console.error("mytasks error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

taskController.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, bidEndDate, deadline } = req.body;
    const userId = req.userId;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.postedBy.toString() !== userId)
      return res.status(403).json({ message: "Unauthorized: Only task owner can update" });

    if (description) task.description = description;
    if (bidEndDate) task.bidEndDate = new Date(bidEndDate);
    if (deadline) task.deadline = new Date(deadline);


    await task.save();

    res.status(200).json({ message: "Task updated", task });
  } catch (error) {
    console.error("updateTask error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

taskController.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const user = await User.findById(userId);
    const isOwner = task.postedBy.toString() === userId;
    const isAdmin = user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to delete this task" });
    }

    await task.deleteOne();
    res.status(200).json({ message: `Task "${task.title}" deleted`, task });
  } catch (error) {
    console.error("deleteTask error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

taskController.getHunterSummary = async (req, res) => {
  try {
    const hunterId = req.userId;
    const totalBids = await Bid.countDocuments({ userId: hunterId });
    const acceptedBids = await Bid.countDocuments({ userId: hunterId, status: "accepted" });
    const rejectedBids = await Bid.countDocuments({ userId: hunterId, status: "rejected" });
    const completedTasks = await Task.countDocuments({ assignedTo: hunterId, status: "completed" });
    const rejectedTasks = await Task.countDocuments({ assignedTo: hunterId, status: "rejected" });
    const assignedTasks = await Task.find({ assignedTo: hunterId });
    return res.json({data: {
        totalBids,
        acceptedBids,
        rejectedBids,
        completedTasks,
        rejectedTasks,
        assignedTasks, 
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

taskController.submitTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.assignedTo || task.assignedTo.toString() !== userId) {
      return res.status(403).json({ message: "Only the assigned hunter can submit this task" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "No file uploaded or Cloudinary path missing" });
    }

    task.submissionFiles.push({
      fileUrl: req.file.path,
      submittedAt: new Date(),
    });

    task.status = "submitted";
    await task.save();

    res.status(200).json({ message: "Task submitted successfully, awaiting owner approval", task });
  } catch (error) {
    console.error("submitTask error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

taskController.markTaskCompleted = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const userId = req.userId;

    if (!["completed", "incomplete"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'completed' or 'incomplete'" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.status = status;
    await task.save();

    if (status === "completed") {
      const hunter = await User.findById(task.assignedTo);
      if (hunter) {
        const winningBid = await Bid.findOne({
          task: task._id,
          userId: hunter._id,
          status: "accepted"
        });

        const bidAmount = Number(winningBid.bidAmount);
        const platformFee = bidAmount * 0.1;
        const amountToAdd = bidAmount - platformFee;

        hunter.walletBalance = Number(hunter.walletBalance) + amountToAdd;
        hunter.totalEarnings = (hunter.totalEarnings || 0) + amountToAdd; 
        hunter.totalTasksCompleted = (hunter.totalTasksCompleted || 0) + 1;

        if (hunter.totalTasksCompleted >= 25 && !hunter.badges.includes(BADGES.BOUNTY_CHAMPION.key)) {
          hunter.badges.push(BADGES.BOUNTY_CHAMPION.key);
        }
        await hunter.save();

        await Transaction.create({
          userId: hunter._id,
          task: task._id,
          amount: amountToAdd,
          type: "task_payment",
          method: "wallet",
          status: "success",
          description: `Payment received for task completion: ${task.title}`,
        });

        if (hunter.phone) {  
          const message = `Hi ${hunter.name}, your task "${task.title}" has  completed and payment of ₹${amountToAdd} added to your wallet. Keep up the great work! - TaskBounty`;
          try {
            console.log(hunter.phone,message)
            await sendSMS(hunter.phone, message);
          } catch (smsError) {
            console.error('Error sending SMS:', smsError);
          }
        }
      }
    }
    res.status(200).json({ message: `Task marked as ${status}`, task });
  } catch (error) {
    console.error("markTaskCompleted error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export default taskController;