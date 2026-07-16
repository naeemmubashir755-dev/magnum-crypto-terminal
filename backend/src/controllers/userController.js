const userService = require('../services/userService');

// Controllers only translate HTTP input/output; persistence belongs to services.
const createUser = async (request, response, next) => {
  try {
    const user = await userService.createUser(request.body);
    response.status(201).json(user);
  } catch (error) { next(error); }
};

const getUser = async (request, response, next) => {
  try {
    response.status(200).json(await userService.getUserById(request.params.id));
  } catch (error) { next(error); }
};

const getCurrentUser = async (request, response, next) => {
  try {
    response.status(200).json(await userService.getUserById(request.auth.userId));
  } catch (error) { next(error); }
};

module.exports = { createUser, getUser, getCurrentUser };
