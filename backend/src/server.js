const express = require('express');
const cors = require('cors');
const { port } = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');
const { notFound } = require('./middleware/errorHandler');

const app = express();

// Shared HTTP middleware belongs at the application boundary.
app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use(notFound);

app.listen(port, () => {
  console.log(`Magnum backend listening on port ${port}.`);
});
