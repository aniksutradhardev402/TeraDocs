const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../model/User');
const Document = require('../model/Document');

// Store active connections and document sessions
const connectedUsers = new Map(); // userId -> socket
const documentSessions = new Map(); // documentId -> Set of userIds

// Initialize Socket.io with the HTTP server
function initializeSocketIO(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*', // Update this to match your frontend URL in production
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Check if user exists
      const user = await User.findById(decoded.id).select('_id name email');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user info to socket
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error(`Authentication error: ${error.message}`));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user._id} connected`);
    
    // Add user to connected users
    connectedUsers.set(socket.user._id.toString(), socket);
    
    // Join document room
    socket.on('join-document', async ({ documentId }) => {
      try {
        // Verify that user has access to this document
        const document = await Document.findById(documentId);
        
        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }
        
        if (!document.isPublic && !document.hasAccess(socket.user._id)) {
          socket.emit('error', { message: 'You do not have permission to access this document' });
          return;
        }
        
        // Leave any previous document room
        Array.from(socket.rooms).forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        // Join new document room
        socket.join(documentId);
        
        // Update document sessions
        if (!documentSessions.has(documentId)) {
          documentSessions.set(documentId, new Set());
        }
        documentSessions.get(documentId).add(socket.user._id.toString());
        
        // Notify others that user joined
        socket.to(documentId).emit('user-joined', {
          userId: socket.user._id,
          name: socket.user.name,
          email: socket.user.email
        });
        
        // Send list of active users in this document
        const activeUsers = [];
        const userIds = documentSessions.get(documentId);
        
        if (userIds) {
          for (const userId of userIds) {
            const userSocket = connectedUsers.get(userId);
            if (userSocket && userSocket.user) {
              activeUsers.push({
                userId: userSocket.user._id,
                name: userSocket.user.name,
                email: userSocket.user.email
              });
            }
          }
        }
        
        socket.emit('active-users', { users: activeUsers });
        
        console.log(`User ${socket.user._id} joined document ${documentId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle document changes
    socket.on('document-change', async ({ documentId, changes, cursorPosition }) => {
      try {
        const document = await Document.findById(documentId);
        
        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }
        
        if (!document.canEdit(socket.user._id)) {
          socket.emit('error', { message: 'You do not have permission to edit this document' });
          return;
        }
        
        // Broadcast changes to all users in the document room except sender
        socket.to(documentId).emit('document-change', {
          userId: socket.user._id,
          name: socket.user.name,
          changes,
          cursorPosition
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle cursor position updates
    socket.on('cursor-position', ({ documentId, position }) => {
      socket.to(documentId).emit('cursor-position', {
        userId: socket.user._id,
        name: socket.user.name,
        position
      });
    });
    
    // Handle document save
    socket.on('save-document', async ({ documentId, content }) => {
      try {
        const document = await Document.findById(documentId);
        
        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }
        
        if (!document.canEdit(socket.user._id)) {
          socket.emit('error', { message: 'You do not have permission to edit this document' });
          return;
        }
        
        // Save previous version if content changed
        if (document.content !== content) {
          document.addVersion(document.content, socket.user._id);
          document.content = content;
          document.lastModified = Date.now();
          await document.save();
        }
        
        socket.emit('document-saved', {
          documentId,
          lastModified: document.lastModified
        });
        
        // Notify others that document was saved
        socket.to(documentId).emit('document-updated', {
          documentId,
          lastModified: document.lastModified,
          savedBy: {
            userId: socket.user._id,
            name: socket.user.name
          }
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle auto-save (less frequent updates)
    socket.on('auto-save', async ({ documentId, content }) => {
      try {
        const document = await Document.findById(documentId);
        
        if (!document || !document.canEdit(socket.user._id)) {
          return; // Silent failure for auto-save
        }
        
        // Update content without creating version history
        if (document.content !== content) {
          document.content = content;
          document.lastModified = Date.now();
          await document.save();
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    });
    
    // Handle leave document
    socket.on('leave-document', ({ documentId }) => {
      leaveDocument(socket, documentId);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user._id} disconnected`);
      
      // Remove user from connected users
      connectedUsers.delete(socket.user._id.toString());
      
      // Remove user from all document sessions
      for (const [documentId, users] of documentSessions.entries()) {
        if (users.has(socket.user._id.toString())) {
          users.delete(socket.user._id.toString());
          
          // Notify others in the document that user left
          socket.to(documentId).emit('user-left', {
            userId: socket.user._id
          });
          
          // Remove document session if empty
          if (users.size === 0) {
            documentSessions.delete(documentId);
          }
        }
      }
    });
  });

  return io;
}

// Helper function to handle a user leaving a document
function leaveDocument(socket, documentId) {
  socket.leave(documentId);
  
  // Update document sessions
  const users = documentSessions.get(documentId);
  if (users) {
    users.delete(socket.user._id.toString());
    
    // Remove document session if empty
    if (users.size === 0) {
      documentSessions.delete(documentId);
    }
  }
  
  // Notify others that user left
  socket.to(documentId).emit('user-left', {
    userId: socket.user._id
  });
  
  console.log(`User ${socket.user._id} left document ${documentId}`);
}

module.exports = { initializeSocketIO };