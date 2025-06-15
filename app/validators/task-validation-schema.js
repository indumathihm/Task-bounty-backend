import Task from "../models/task-model.js";

const taskValidationSchema = {
  title: {
    in: ["body"],
    exists: {
      errorMessage: "Title is required"
    },
    notEmpty: {
      errorMessage: "Title cannot be empty"
    },
    trim: true,
    custom: {
      options: async (value) => {
        const task = await Task.findOne({ title: { $regex: value, $options: "i" } });
        if (task) throw new Error("Title is already taken");
        return true;
      }
    }
  },
  description: {
    in: ["body"],
    exists: {
      errorMessage: "Description is required"
    },
    notEmpty: {
      errorMessage: "Description cannot be empty"
    },
    trim: true
  },
  budget: {
    in: ["body"],
    exists: {
      errorMessage: "Budget amount is required"
    },
    notEmpty: {
      errorMessage: "Budget amount cannot be empty"
    },
    isFloat: {
      options: { min: 100 },
      errorMessage: "Budget should be at least 100"
    }
  },
  category: {
    in: ["body"],
    exists: {
      errorMessage: "Category is required"
    },
    notEmpty: {
      errorMessage: "Category cannot be empty"
    },
    trim: true
  },
  deadline: {
    in: ["body"],
    exists: {
      errorMessage: "Deadline is required"
    },
    notEmpty: {
      errorMessage: "Deadline cannot be empty"
    }
  },
  bidEndDate: {
    in: ["body"],
    exists: {
      errorMessage: "Bid end date is required"
    },
    notEmpty: {
      errorMessage: "Bid end date cannot be empty"
    },    
    custom: {
      options: (value, { req }) => {
        const deadline = new Date(req.body.deadline);
        const bidEnd = new Date(value);
        if (bidEnd >= deadline) {
          throw new Error("Bid end date must be before the task deadline");
        }
        return true;
      }
    }
  }
};

export default taskValidationSchema;