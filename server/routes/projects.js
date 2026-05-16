import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import auth from '../middleware/auth.js';

const router = Router();

// Get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.userId })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create project (Global Admin only)
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Only global Admins can create projects
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can create projects' });
    }

    const project = await Project.create({
      name: req.body.name,
      description: req.body.description || '',
      createdBy: req.userId,
      members: [{ user: req.userId, role: 'Admin' }],
    });
    const populated = await project.populate('members.user', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.some(m => m.user._id.toString() === req.userId);
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project (Admin only)
router.post('/:id/members', auth, [
  body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const adminMember = project.members.find(m => m.user.toString() === req.userId && m.role === 'Admin');
    if (!adminMember) return res.status(403).json({ message: 'Only admins can add members' });

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'User not found with that email' });

    const alreadyMember = project.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'User is already a member' });

    project.members.push({ user: user._id, role: 'Member' });
    await project.save();

    const populated = await project.populate('members.user', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from project (Admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const adminMember = project.members.find(m => m.user.toString() === req.userId && m.role === 'Admin');
    if (!adminMember) return res.status(403).json({ message: 'Only admins can remove members' });

    if (req.params.userId === req.userId) {
      return res.status(400).json({ message: 'Cannot remove yourself' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();

    // Unassign tasks from removed member
    await Task.updateMany(
      { project: project._id, assignedTo: req.params.userId },
      { $unset: { assignedTo: '' } }
    );

    const populated = await project.populate('members.user', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const adminMember = project.members.find(m => m.user.toString() === req.userId && m.role === 'Admin');
    if (!adminMember) return res.status(403).json({ message: 'Only admins can delete projects' });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
