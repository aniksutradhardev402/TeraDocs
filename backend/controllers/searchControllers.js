const Document = require('../model/Document');

// @desc    Search for documents
// @route   GET /api/search
// @access  Private
const searchDocuments = async (req, res, next) => {
  try {
    const { query, filter } = req.query;
    
    if (!query) {
      return res.status(400).json({
        message: 'Search query is required'
      });
    }
    
    // Base query - documents user has access to
    const baseQuery = {
      $or: [
        { owner: req.user._id }, // User's own documents
        { 'collaborators.user': req.user._id }, // Shared with user
        { isPublic: true } // Public documents
      ]
    };
    
    // Add text search
    const searchQuery = {
      ...baseQuery,
      $text: { $search: query }
    };
    
    // Apply filter if provided
    if (filter === 'owned') {
      searchQuery.$or = [{ owner: req.user._id }];
    } else if (filter === 'shared') {
      searchQuery.$or = [{ 'collaborators.user': req.user._id }];
    } else if (filter === 'public') {
      searchQuery.$or = [{ isPublic: true }];
    }
    
    // Execute search with text score for sorting
    const documents = await Document.find(searchQuery, {
      score: { $meta: 'textScore' }
    })
      .sort({ score: { $meta: 'textScore' } })
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email')
      .select('-versions') // Exclude versions from results
      .limit(20); // Limit results
    
    res.status(200).json({
      count: documents.length,
      documents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent documents
// @route   GET /api/search/recent
// @access  Private
const getRecentDocuments = async (req, res, next) => {
  try {
    // Find documents the user has access to
    const query = {
      $or: [
        { owner: req.user._id }, // User's own documents
        { 'collaborators.user': req.user._id } // Shared with user
      ]
    };
    
    const documents = await Document.find(query)
      .sort({ lastModified: -1 }) // Sort by most recently modified
      .populate('owner', 'name email')
      .select('-versions') // Exclude versions from results
      .limit(10); // Limit to 10 most recent
    
    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchDocuments,
  getRecentDocuments
};