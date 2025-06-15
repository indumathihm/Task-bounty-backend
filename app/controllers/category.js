import { validationResult } from 'express-validator';
import Category from '../models/category-model.js';
import Task from "../models/task-model.js";
const categoryController = {};

categoryController.list = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong!' });
  }
};

categoryController.show = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const id = req.params.id;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong!' });
  }
};

categoryController.create = async (req, res) => {
  try {
    const { name } = req.body;

    const category = new Category({
      name,
      userId: req.userId,
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: ['Something went wrong!'] });
  }
};

categoryController.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;
  const id = req.params.id;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to update this category' });
    }

    const updateData = {};
    if (name) updateData.name = name;

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: ['Something went wrong!'] });
  }
};


categoryController.delete = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const id = req.params.id;
  try {
    // Check if tasks exist under this category
    const taskCount = await Task.countDocuments({ category: id });

    if (taskCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete category because tasks are associated with it.',
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      message: `Successfully deleted ${category.name}`,
      category,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong!' });
  }
};


export default categoryController;