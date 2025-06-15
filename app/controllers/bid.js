import Bid from "../models/bid-model.js";
import Task from "../models/task-model.js";
import sendEmail from "../../utils/sendEmail.js";

const bidController = {};

bidController.createBid = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { bidAmount, comment } = req.body;
    const userId = req.userId;

    const task = await Task.findById(taskId).populate('postedBy', 'name email') ;
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.status !== "open")
      return res.status(400).json({ message: "Task is not open for bidding" });

    if (task.bidEndDate && new Date() > new Date(task.bidEndDate))
      return res.status(400).json({ message: "Bidding period is over" });

    const existingBid = await Bid.findOne({ task: taskId, userId });
    if (existingBid)
      return res.status(400).json({ message: "You have already bid on this task" });

    const bid = await Bid.create({
      task: taskId,
      userId,
      bidAmount,
      comment,
      status: "pending",
    });
    await bid.save();
    await bid.populate("userId", "name email");
    if (task.postedBy?.email) {
      sendEmail(
        task.postedBy.email,
        '🔔 New Bid Received on Your Task',
        `Hi ${task.postedBy.name},\n\nA new bid has been placed on your task "${task.title}" by ${bid.userId.name}.\nBid Amount: ₹${bidAmount}\n\nCheck it out on TaskBounty!\n\n- TaskBounty Team`
      )
    }
    res.status(201).json(bid);
  } catch (error) {
    console.error("CreateBid error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

bidController.updateBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { bidAmount, comment } = req.body;

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    if (bidAmount !== undefined) bid.bidAmount = bidAmount;
    if (comment !== undefined) bid.comment = comment;

    await bid.save();
    await bid.populate("userId", "name email");

    res.json(bid);
  } catch (error) {
    console.error("UpdateBid error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

bidController.getBidsForTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const bids = await Bid.find({ task: taskId })
      .populate("userId", "name")
      .populate("task", "title")

    res.json(bids);
  } catch (error) {
    console.error("GetBids error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

bidController.updateBidStatus = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    bid.status = status;
    await bid.save();

    if (status === "accepted") {
      const task = await Task.findByIdAndUpdate(
        bid.task,
        {
          assignedTo: bid.userId,
          status: "in_progress",
          bidEndDate: new Date(),
        },
        { new: true }
      );

      await Bid.updateMany(
        { task: task._id, _id: { $ne: bid._id }, status: "pending" },
        { status: "rejected" }
      );
    }

    await bid.populate("userId", "name");
    res.json(bid);
  } catch (error) {
    console.error("UpdateBidStatus error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


bidController.deleteBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.userId;

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    const task = await Task.findById(bid.task);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await Bid.findByIdAndDelete(bidId);

    res.json({ message: "Bid deleted successfully" });
  } catch (error) {
    console.error("DeleteBid error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default bidController;