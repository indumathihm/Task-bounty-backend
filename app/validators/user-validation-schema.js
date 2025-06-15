import User from "../models/user-model.js";

export const userRegisterSchema = {
  name: {
    exists: { errorMessage: "name field is required" },
    notEmpty: { errorMessage: "name cannot be empty" },
    isLength: {
      options: { min: 5 },
      errorMessage: "Name must be at least 5 characters long"
    },
    trim: true,
    custom: {
      options: async (value) => {
        const user = await User.findOne({ name: value });
        if (user) throw new Error("Name is already taken");
        return true;
      }
    }
  },
  email: {
    exists: { errorMessage: "email field is required" },
    notEmpty: { errorMessage: "email cannot be empty" },
    isEmail: { errorMessage: "email should be valid format" },
    trim: true,
    normalizeEmail: true,
    custom: {
      options: async (value) => {
        const user = await User.findOne({ email: value });
        if (user) throw new Error("Email is already taken");
        return true;
      }
    }
  },
  password: {
    exists: { errorMessage: "password field is required" },
    notEmpty: { errorMessage: "password cannot be empty" },
    isStrongPassword: {
      options: {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumber: 1,
        minSymbol: 1
      },
      errorMessage:
        "password must contain at least one lowercase, one uppercase, one number, one symbol and be at least 8 characters long"
    },
    trim: true
  },
  role: {
    exists: { errorMessage: "role field is required" },
    notEmpty: { errorMessage: "role cannot be empty" }
  },
  phone: {
    optional: true,
    matches: {
      options: [/^\+91[6-9]\d{9}$/],
      errorMessage: "Phone number must be a valid number starting with +91"
    },
    trim: true
  }
};

export const userLoginSchema = {
  email: {
    exists: { errorMessage: "email field is required" },
    notEmpty: { errorMessage: "email cannot be empty" },
    isEmail: { errorMessage: "email should be valid format" },
    trim: true,
    normalizeEmail: true
  },
  password: {
    exists: { errorMessage: "password field is required" },
    notEmpty: { errorMessage: "password cannot be empty" },
    isStrongPassword: {
      options: {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumber: 1,
        minSymbol: 1
      },
      errorMessage:
        "password must contain at least one lowercase, one uppercase, one number, one symbol and be at least 8 characters long"
    },
    trim: true
  }
};
