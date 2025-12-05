module.exports = {
  secret: process.env.JWT_SECRET || 'fallback_secret_key_change_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieName: 'clinic_token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
};