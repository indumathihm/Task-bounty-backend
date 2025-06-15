import express from "express";
import dotenv from "dotenv";
dotenv.config()
import cors from "cors";
import morgan from "morgan";
import configureDB from "./config/db.js"
import { checkSchema } from "express-validator";
import "./cronJobs.js";

const app = express()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"))
app.use(cors())
configureDB()
const port = process.env.PORT || 3636

import userController from "./app/controllers/user.js";
import bidController from "./app/controllers/bid.js";
import caterogyController from "./app/controllers/category.js";
import subscriptionController from "./app/controllers/subscription.js";
import taskController from "./app/controllers/tasks.js";
import walletController from "./app/controllers/wallet.js";
import leaderboardController from "./app/controllers/leaderboard .js";
import transactionController from "./app/controllers/transaction.js";

import authenticateUser from "./app/middlewares/authenticateUser.js";
import authorizeUser from "./app/middlewares/authorizeUser.js";
import uploads from "./config/multer.js";

import {userRegisterSchema,userLoginSchema} from "./app/validators/user-validation-schema.js";
import categoryValidationSchema from "./app/validators/category-validation-schema.js";
import taskValidationSchema from "./app/validators/task-validation-schema.js";

app.post("/users/register", checkSchema(userRegisterSchema), userController.register);
app.post("/users/login", checkSchema(userLoginSchema), userController.login);
app.get("/users/myProfile", authenticateUser, userController.account);
app.get("/users", authenticateUser, authorizeUser(["admin"]), userController.list);
app.put("/users/activateUser/:id", authenticateUser, authorizeUser(["admin"]), userController.activateUser);
app.put("/users/updateUserProfile",authenticateUser, uploads.single('avatar'),userController.updateUserProfile);
app.post("/users/forgotPassword", userController.forgotPassword);
app.post("/users/resetPassword", userController.resetPassword);

app.get("/categories",caterogyController.list)
app.get("/categories/:id",caterogyController.show)
app.post("/categories",authenticateUser,checkSchema(categoryValidationSchema),authorizeUser(["admin"]),caterogyController.create)
app.put("/categories/:id",authenticateUser,authorizeUser(["admin"]),caterogyController.update)
app.delete("/categories/:id",authenticateUser,authorizeUser(["admin"]),caterogyController.delete)

app.post("/wallet",authenticateUser,authorizeUser(["poster"]), walletController.create);
app.post("/wallet/deposit",authenticateUser,authorizeUser(["poster"]), walletController.deposit);
app.post("/wallet/withdraw",authenticateUser,authorizeUser(["hunter"]), walletController.withdraw);
app.get("/wallet/balance/:userId",authenticateUser,authorizeUser(["poster"]), walletController.getWalletBalance);

app.get("/tasks/my-work",authenticateUser,authorizeUser(["hunter"]),taskController.getHunterSummary)
app.get("/tasks",taskController.list)
app.get("/tasks/all-tasks",taskController.allTasks)
app.get("/tasks/:id",taskController.show)
app.get("/tasks/my-tasks/:id",authenticateUser,authorizeUser(["poster"]),taskController.mytasks)
app.post("/tasks",authenticateUser,authorizeUser(["poster"]),checkSchema(taskValidationSchema),taskController.createTaskWithWallet)
app.put("/tasks/:id",authenticateUser,authorizeUser(["poster"]),taskController.updateTask)
app.delete("/tasks/:id",authenticateUser,authorizeUser(["admin","poster"]),taskController.deleteTask)
app.put("/tasks/:id/submit",authenticateUser,uploads.single('file'),taskController.submitTask)
app.put("/tasks/:id/complete",authenticateUser,authorizeUser(["poster"]),taskController.markTaskCompleted);

app.get("/tasks/:taskId/bids", authenticateUser, bidController.getBidsForTask);
app.post("/tasks/:taskId/bids", authenticateUser,authorizeUser(["hunter"]), bidController.createBid);
app.put("/bids/:bidId", authenticateUser,authorizeUser(["hunter"]), bidController.updateBid);
app.put("/bids/:bidId/status", authenticateUser,authorizeUser(["poster"]), bidController.updateBidStatus);
app.delete("/bids/:bidId", authenticateUser,authorizeUser(["hunter"]), bidController.deleteBid);

app.post("/subscription",authenticateUser,authorizeUser(["poster"]),subscriptionController.create);
app.post("/subscription/verify",authenticateUser,authorizeUser(["poster"]),subscriptionController.verify);
app.get("/subscription",authenticateUser,subscriptionController.show);

app.get("/leaderboard", leaderboardController.getLeaderboard);
app.get("/transactions",authenticateUser,authorizeUser(["admin"]),transactionController.getTransactions)

app.listen(port,()=>{
    console.log(`Server running on port ${port}`)
})