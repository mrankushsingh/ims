import { Router } from 'express';
import { db } from '../utils/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { getFirebaseAdmin } from '../utils/firebase.js';

const router = Router();
const memoryDb = db; // For backward compatibility

// All routes require authentication
router.use(authenticateToken);

// Get all users
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const users = await memoryDb.getUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Get current user
router.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let user = await memoryDb.getUserByFirebaseUid(req.user.uid);
    
    // If user doesn't exist in database, create one
    if (!user) {
      const firebaseAdmin = getFirebaseAdmin();
      if (firebaseAdmin) {
        try {
          const firebaseUser = await firebaseAdmin.auth().getUser(req.user.uid);
          user = await memoryDb.insertUser({
            firebase_uid: req.user.uid,
            email: req.user.email || firebaseUser.email || '',
            name: req.user.name || firebaseUser.displayName || undefined,
            role: 'user',
            active: true,
            created_by: req.user.uid,
          });
        } catch (error: any) {
          console.error('Error creating user:', error);
          return res.status(500).json({ error: 'Failed to create user record' });
        }
      } else {
        // Fallback: create user without Firebase admin
        user = await memoryDb.insertUser({
          firebase_uid: req.user.uid,
          email: req.user.email || '',
          name: req.user.name || undefined,
          role: 'user',
          active: true,
          created_by: req.user.uid,
        });
      }
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Get user by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await memoryDb.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Create user (admin only)
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    // Check if current user is admin
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await memoryDb.getUserByFirebaseUid(req.user.uid);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, name, role, firebase_uid } = req.body;

    if (!email || !firebase_uid) {
      return res.status(400).json({ error: 'Email and Firebase UID are required' });
    }

    // Check if user already exists
    const existingUser = await memoryDb.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const existingUserByUid = await memoryDb.getUserByFirebaseUid(firebase_uid);
    if (existingUserByUid) {
      return res.status(400).json({ error: 'User with this Firebase UID already exists' });
    }

    const user = await memoryDb.insertUser({
      firebase_uid,
      email,
      name: name || undefined,
      role: role || 'user',
      active: true,
      created_by: req.user.uid,
    });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await memoryDb.getUserByFirebaseUid(req.user.uid);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const targetUser = await memoryDb.getUser(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Users can only update themselves, unless they're admin
    if (currentUser.role !== 'admin' && targetUser.firebase_uid !== req.user.uid) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    // Only admins can change roles
    const { role, ...updateData } = req.body;
    if (role && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change user roles' });
    }

    const updated = await memoryDb.updateUser(req.params.id, {
      ...updateData,
      ...(role && { role }),
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await memoryDb.getUserByFirebaseUid(req.user.uid);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const targetUser = await memoryDb.getUser(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (targetUser.firebase_uid === req.user.uid) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const deleted = await memoryDb.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

export default router;

