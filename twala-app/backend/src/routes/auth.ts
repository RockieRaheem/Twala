import { Router } from 'express';
import { createHash } from 'crypto';
import * as db from '../services/database.js';
import type { UserProfile } from '../types/index.js';

const router = Router();

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

function sanitize(profile: UserProfile): Omit<UserProfile, 'pinHash'> {
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    createdAt: profile.createdAt,
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register — create a new user profile
// ---------------------------------------------------------------------------

router.post('/register', async (req, res) => {
  try {
    const { name, phone, pin } = req.body;

    const errors: string[] = [];
    if (!name || !name.trim()) errors.push('Full name is required');
    if (!phone || !phone.trim()) errors.push('Phone number is required');
    if (!pin || pin.length < 4 || pin.length > 6) errors.push('PIN must be 4-6 digits');
    if (!/^\d+$/.test(pin)) errors.push('PIN must contain only digits');
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const existing = await db.getProfileByPhone(formattedPhone);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this phone number already exists' });
    }

    const profile = await db.createProfile({
      name: name.trim(),
      phone: formattedPhone,
      pinHash: hashPin(pin),
    });

    res.status(201).json({ success: true, data: sanitize(profile), message: 'Account created successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: `Registration failed: ${msg}` });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login — verify PIN and return profile
// ---------------------------------------------------------------------------

router.post('/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: 'Phone and PIN are required' });
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const profile = await db.getProfileByPhone(formattedPhone);

    if (!profile) {
      return res.status(401).json({ success: false, message: 'No account found with this phone number' });
    }

    if (profile.pinHash !== hashPin(pin)) {
      return res.status(401).json({ success: false, message: 'Incorrect PIN' });
    }

    res.json({ success: true, data: sanitize(profile), message: 'Login successful' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: `Login failed: ${msg}` });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/profile/:id — get profile by ID (for re-fetch after app restart)
// ---------------------------------------------------------------------------

router.get('/profile/:id', async (req, res) => {
  try {
    const profile = await db.getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, data: sanitize(profile) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/check/:phone — check if a phone is registered (for onboarding flow)
// ---------------------------------------------------------------------------

router.get('/check/:phone', async (req, res) => {
  try {
    const formattedPhone = req.params.phone.startsWith('+') ? req.params.phone : `+${req.params.phone}`;
    const profile = await db.getProfileByPhone(formattedPhone);
    res.json({ success: true, data: { exists: !!profile } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
