// Keep controller logic focused on translating HTTP requests into responses.
const getHealth = (request, response) => {
  response.status(200).json({
    status: 'ok',
    message: 'Magnum Backend Running',
  });
};

module.exports = { getHealth };
