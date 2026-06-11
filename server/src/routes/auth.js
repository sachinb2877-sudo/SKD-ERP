import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Register a new user (Admin only)
router.post('/register', async (req, res) => {
  const { username, password, name, role } = req.body;
  const db = req.app.get('db');

  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are mandatory' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role, name',
      [username, hash, name, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username is already taken' });
    }
    res.status(500).json({ error: 'Database error registering user' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = req.app.get('db');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Insert login audit entry
    await db.query(
      'INSERT INTO audit_trail (username, role, action, ip_address, new_value) VALUES ($1, $2, $3, $4, $5)',
      [user.name, user.role, 'USER_LOGIN', req.ip || '127.0.0.1', `User ${user.name} logged in successfully.`]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error during login' });
  }
});

export default router;
