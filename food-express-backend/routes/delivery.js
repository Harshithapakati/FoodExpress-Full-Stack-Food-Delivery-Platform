// routes/delivery.js
const express = require('express');
const router = express.Router();

// Example: POST /api/delivery/update
router.post('/update', (req, res) => {
  const { partnerId, location, status } = req.body;

  if (!partnerId) {
    return res.status(400).json({ success: false, message: 'Missing partnerId' });
  }

  // Just return success for now (mock)
  return res.status(200).json({
    success: true,
    message: `Partner ${partnerId} status updated`,
    location,
    status,
  });
});

module.exports = router;
