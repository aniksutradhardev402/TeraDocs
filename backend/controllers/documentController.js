const Document = require('../model/Document');

// @desc    Create a new document
// @route   POST /api/documents
// @access  Private
const createDocument = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    
    if (!title) {
      res.status(400);
      throw new Error('Please provide a document title');
    }
    
    const document = await Document.create({
      title,
      content: content || '',
      owner: req.user._id,
    });
    
    if (document) {
      // Add first version to history
      document.addVersion(content || '', req.user._id);
      await document.save();
      
      res.status(201).json(document);
    } else {
      res.status(400);
      throw new Error('Invalid document data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all documents accessible by user
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res, next) => {
  try {
    // Get user's own documents
    const ownDocuments = await Document.find({ owner: req.user._id })
      .select('-versions') // Exclude version history for list view
      .sort({ lastModified: -1 });
    
    // Get documents where user is a collaborator
    const sharedDocuments = await Document.find({
      'collaborators.user': req.user._id,
    })
      .select('-versions')
      .sort({ lastModified: -1 });
      
    res.status(200).json({
      owned: ownDocuments,
      shared: sharedDocuments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single document by ID
// @route   GET /api/documents/:id
// @access  Private (accessible by owner and collaborators)
const getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');
      
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Check if user has access to this document
    if (!document.isPublic && !document.hasAccess(req.user._id)) {
      res.status(403);
      throw new Error('You do not have permission to access this document');
    }
    
    res.status(200).json(document);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a document
// @route   PUT /api/documents/:id
// @access  Private (accessible by owner and editor collaborators)
const updateDocument = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Check if user can edit this document
    if (!document.canEdit(req.user._id)) {
      res.status(403);
      throw new Error('You do not have permission to edit this document');
    }
    
    // Update document fields if provided
    if (title) document.title = title;
    if (content !== undefined) {
      // Add new version to history before updating
      document.addVersion(document.content, req.user._id);
      document.content = content;
    }
    
    document.lastModified = Date.now();
    const updatedDocument = await document.save();
    
    res.status(200).json(updatedDocument);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private (owner only)
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Only the owner can delete a document
    if (document.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the document owner can delete it');
    }
    
    await document.remove();
    
    res.status(200).json({ message: 'Document removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Share document with a user
// @route   POST /api/documents/:id/share
// @access  Private (owner only)
const shareDocument = async (req, res, next) => {
  try {
    const { email, accessLevel } = req.body;
    
    if (!email || !accessLevel) {
      res.status(400);
      throw new Error('Please provide user email and access level');
    }
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Only the owner can share a document
    if (document.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the document owner can share it');
    }
    
    // Find the user to share with
    const User = require('../model/User');
    const userToShare = await User.findOne({ email });
    
    if (!userToShare) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Don't allow sharing with yourself
    if (userToShare._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('You cannot share a document with yourself');
    }
    
    // Check if user is already a collaborator
    const existingCollaborator = document.collaborators.find(
      (c) => c.user.toString() === userToShare._id.toString()
    );
    
    if (existingCollaborator) {
      // Update access level
      existingCollaborator.accessLevel = accessLevel;
    } else {
      // Add new collaborator
      document.collaborators.push({
        user: userToShare._id,
        accessLevel,
      });
    }
    
    await document.save();
    
    res.status(200).json({
      message: `Document shared with ${userToShare.email} as ${accessLevel}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a collaborator
// @route   DELETE /api/documents/:id/collaborators/:userId
// @access  Private (owner only)
const removeCollaborator = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Only the owner can remove collaborators
    if (document.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the document owner can remove collaborators');
    }
    
    // Filter out the collaborator
    document.collaborators = document.collaborators.filter(
      (c) => c.user.toString() !== req.params.userId
    );
    
    await document.save();
    
    res.status(200).json({ message: 'Collaborator removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Make document public/private
// @route   PUT /api/documents/:id/visibility
// @access  Private (owner only)
const updateVisibility = async (req, res, next) => {
  try {
    const { isPublic } = req.body;
    
    if (isPublic === undefined) {
      res.status(400);
      throw new Error('Please specify isPublic value');
    }
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Only the owner can change visibility
    if (document.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the document owner can change visibility');
    }
    
    document.isPublic = isPublic;
    await document.save();
    
    res.status(200).json({
      message: `Document is now ${isPublic ? 'public' : 'private'}`,
      isPublic: document.isPublic,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get document version history
// @route   GET /api/documents/:id/versions
// @access  Private (accessible by owner and collaborators)
const getVersionHistory = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('versions.savedBy', 'name email')
      .select('versions title owner');
      
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Check if user has access to this document
    if (!document.hasAccess(req.user._id)) {
      res.status(403);
      throw new Error('You do not have permission to access this document');
    }
    
    res.status(200).json({
      documentId: document._id,
      title: document.title,
      versions: document.versions.map(v => ({
        versionId: v._id,
        timestamp: v.timestamp,
        savedBy: v.savedBy,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific version content
// @route   GET /api/documents/:id/versions/:versionId
// @access  Private (accessible by owner and collaborators)
const getVersionContent = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
      
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Check if user has access to this document
    if (!document.hasAccess(req.user._id)) {
      res.status(403);
      throw new Error('You do not have permission to access this document');
    }
    
    const version = document.versions.id(req.params.versionId);
    
    if (!version) {
      res.status(404);
      throw new Error('Version not found');
    }
    
    res.status(200).json({
      documentId: document._id,
      versionId: version._id,
      content: version.content,
      timestamp: version.timestamp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore a specific version
// @route   POST /api/documents/:id/versions/:versionId/restore
// @access  Private (editor or owner only)
const restoreVersion = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
      
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
    
    // Check if user can edit this document
    if (!document.canEdit(req.user._id)) {
      res.status(403);
      throw new Error('You do not have permission to edit this document');
    }
    
    const version = document.versions.id(req.params.versionId);
    
    if (!version) {
      res.status(404);
      throw new Error('Version not found');
    }
    
    // Add current content as a version before restoring
    document.addVersion(document.content, req.user._id);
    
    // Restore the content from the version
    document.content = version.content;
    document.lastModified = Date.now();
    
    await document.save();
    
    res.status(200).json({
      message: 'Version restored successfully',
      documentId: document._id,
      content: document.content,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
  restoreVersion,
};