import Category from "../models/category-model.js";

const categoryValidationSchema = {
  name: {
    in: ["body"],
    exists: {
      errorMessage: "Name is required"
    },
    notEmpty: {
      errorMessage: "Name cannot be empty"
    },
    trim: true,
    custom: {
      options: async (value, { req }) => {
        const existingCategory = await Category.findOne({
          name: { $regex: `^${value}$`, $options: "i" },
          userId: req.user._id 
        });

        if (existingCategory) {
          throw new Error("Category name is already taken");
        }
        return true;
      }
    }
  }
};

export default categoryValidationSchema;
