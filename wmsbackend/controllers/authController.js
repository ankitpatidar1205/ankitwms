const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const result = await authService.login(email, password);
    if (!result) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const u = req.user.toJSON();
    delete u.passwordHash;
    res.json({ success: true, user: u });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
