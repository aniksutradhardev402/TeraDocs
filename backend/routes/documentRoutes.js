const express = require('express');
const { 
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  shareDocument,
  removeCollaborator,
  updateVisibility,
  getVersionHistory,
  getVersionContent,
  restoreVersion
} = require('../controllers/documentController');
const { isAuthenticated } = require('../middleware/isAuthenticated');

const router = express.Router();

// Apply authentication middleware to all document routes
router.use(isAuthenticated);

// Basic CRUD operations
router.route('/')
  .post(createDocument)
  .get(getDocuments);

router.route('/:id')
  .get(getDocumentById)
  .put(updateDocument)
  .delete(deleteDocument);

// Sharing and collaborator management
router.post('/:id/share', shareDocument);
router.delete('/:id/collaborators/:userId', removeCollaborator);
router.put('/:id/visibility', updateVisibility);

// Version history
router.get('/:id/versions', getVersionHistory);
router.get('/:id/versions/:versionId', getVersionContent);
router.post('/:id/versions/:versionId/restore', restoreVersion);

module.exports = router;