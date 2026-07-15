const authService = require('../services/authService');

// Authentication HTTP handlers stay thin; validation and hashing are service concerns.
const register = async (request, response, next) => {
  try {
    const user = await authService.register(request.body);
    response.status(201).json({
      message: 'User registered successfully.',
      user,
    });
  } catch (error) { next(error); }
};

module.exports = { register };
