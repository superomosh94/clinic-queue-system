module.exports = {
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
};