import mongoose from "mongoose";
const { Schema, model } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true, 
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true 
  }
}, { timestamps: true });

const Category = model("Category", categorySchema);
export default Category;
