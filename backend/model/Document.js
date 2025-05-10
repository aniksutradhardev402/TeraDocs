const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a document title'],
    trim: true,
  },
  content: {
    type: String,
    default: '',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      accessLevel: {
        type: String,
        enum: ['viewer', 'editor', 'commenter'],
        default: 'viewer',
      },
    },
  ],
  isPublic: {
    type: Boolean,
    default: false,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // For document versioning
  versions: [
    {
      content: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      savedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  ],
});

// Index for faster searches
documentSchema.index({ title: 'text' });

// Pre-save middleware to update lastModified date
documentSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

// Method to check if a user has access to this document
documentSchema.methods.hasAccess = function(userId) {
  // Check if user is the owner
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check if user is a collaborator
  const collaborator = this.collaborators.find(
    (c) => c.user.toString() === userId.toString()
  );
  
  return !!collaborator;
};

// Method to check if a user can edit this document
documentSchema.methods.canEdit = function(userId) {
  // Owner can always edit
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check collaborator's access level
  const collaborator = this.collaborators.find(
    (c) => c.user.toString() === userId.toString()
  );
  
  return collaborator && collaborator.accessLevel === 'editor';
};

// Create version history entry
documentSchema.methods.addVersion = function(content, userId) {
  this.versions.push({
    content,
    savedBy: userId,
    timestamp: Date.now(),
  });
  
  // Keep only the last 50 versions (optional limit)
  if (this.versions.length > 50) {
    this.versions.shift();
  }
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;