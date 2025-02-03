const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, 'your_jwt_secret', { expiresIn: '30d' });
};

module.exports = generateToken;
