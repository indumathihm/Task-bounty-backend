import Transaction from "../models/transaction-model.js"; 
import User from "../models/user-model.js";

const transactionController = {};
transactionController.getTransactions = async (req, res) => {
  try {
    const { search = "", sortBy = "createdAt", order = "desc" } = req.query;

    const allowedTypes = ['task_posting', 'task_payment', 'subscription_payment', 'deposit', 'withdraw'];

    const query = {};

    if (search) {
      const user = await User.findOne({
        name: { $regex: search, $options: "i" }
      }).select("_id");

      if (allowedTypes.includes(search)) {
        query.type = search;
      } else {
        query.$or = [
          { type: { $regex: search, $options: "i" } },
          { method: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ];

        if (user) {
          query.$or.push({ userId: user._id });
        }
      }
    }

    const transactions = await Transaction.find(query)
      .populate("userId", "name email")
      .populate("task", "title")
      .populate("subscription", "plan")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 });

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Transaction fetch error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export default transactionController;