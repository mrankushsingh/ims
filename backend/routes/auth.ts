import express from 'express';
import { auth } from '../utils/firebase.js';

const router = express.Router();

// Verify ID token and return user info
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Get user details
    const user = await auth.getUser(decodedToken.uid);

    res.json({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
});

// Middleware to verify token (for protecting routes)
export const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Attach user info to request
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default router;

