
const express = require('express');
const { searchDocuments, getRecentDocuments } = require('../controllers/searchControllers');
const { isAuthenticated } = require('../middleware/isAuthenticated');

const router = express.Router();

// Apply authentication middleware to all search routes
router.use(isAuthenticated);

// Search documents
router.get('/', searchDocuments);

// Get recent documents
router.get('/recent', getRecentDocuments);

module.exports = router;