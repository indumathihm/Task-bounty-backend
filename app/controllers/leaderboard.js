import User from "../models/user-model.js";

const leaderboardController = {};

leaderboardController.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.aggregate([
      {
        $match: {
          isActive: true,
          role: "hunter",
        }
      },
      { $sort: { totalTasksCompleted: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          totalEarnings: 1, 
          totalTasksCompleted: 1,
        }
      }
    ]);

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("getLeaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export default leaderboardController;
