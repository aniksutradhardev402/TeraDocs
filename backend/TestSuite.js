const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./app');
const User = require('./model/User');
const Document = require('./model/Document');

// Test database connection URI (use a test database, not your production one)
const testMongoURI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/docs-clone-test';

// Global variables to store test data
let userToken;
let userId;
let testDocumentId;
let secondUserToken;
let secondUserId;
let versionId;

// Setup before all tests
beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(testMongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  // Clear test database collections
  await User.deleteMany({});
  await Document.deleteMany({});
  
  console.log('Connected to test database');
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from test database
  await mongoose.connection.close();
  console.log('Disconnected from test database');
});

// AUTH TESTS
describe('Authentication Endpoints', () => {
  // Test user registration
  test('POST /api/auth/register - Register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('_id');
    expect(res.body.email).toEqual('test@example.com');
    
    // Save user ID and token for later tests
    userId = res.body._id;
    userToken = res.body.token;
    
    console.log('✅ User registration successful');
  });
  
  // Test registration with missing field
  test('POST /api/auth/register - Should fail with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Incomplete User',
        // Missing email
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message');
    
    console.log('✅ Registration validation works');
  });
  
  // Test registration with existing email
  test('POST /api/auth/register - Should fail with existing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        email: 'test@example.com', // Same email as first user
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('exists');
    
    console.log('✅ Duplicate email detection works');
  });
  
  // Register a second user for collaboration tests
  test('POST /api/auth/register - Register a second user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second User',
        email: 'second@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    
    // Save second user ID and token
    secondUserId = res.body._id;
    secondUserToken = res.body.token;
    
    console.log('✅ Second user registration successful');
  });
  
  // Test user login
  test('POST /api/auth/login - Login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toEqual('test@example.com');
    
    // Update token in case it changed
    userToken = res.body.token;
    
    console.log('✅ User login successful');
  });
  
  // Test login with invalid credentials
  test('POST /api/auth/login - Should fail with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message');
    
    console.log('✅ Login security validation works');
  });
});

// DOCUMENT TESTS
describe('Document Endpoints', () => {
  // Test document creation
  test('POST /api/documents - Create a new document', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Document',
        content: 'This is a test document content.'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toEqual('Test Document');
    expect(res.body.content).toEqual('This is a test document content.');
    expect(res.body.owner.toString()).toEqual(userId);
    
    // Save document ID for later tests
    testDocumentId = res.body._id;
    
    console.log('✅ Document creation successful');
  });
  
  // Test getting all documents
  test('GET /api/documents - Get all user documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('owned');
    expect(res.body).toHaveProperty('shared');
    expect(res.body.owned.length).toBeGreaterThan(0);
    expect(res.body.owned[0].title).toEqual('Test Document');
    
    console.log('✅ Get all documents successful');
  });
  
  // Test getting a single document by ID
  test('GET /api/documents/:id - Get document by ID', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id');
    expect(res.body._id).toEqual(testDocumentId);
    expect(res.body.title).toEqual('Test Document');
    expect(res.body.content).toEqual('This is a test document content.');
    
    console.log('✅ Get document by ID successful');
  });
  
  // Test updating a document
  test('PUT /api/documents/:id - Update document', async () => {
    const res = await request(app)
      .put(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Updated Document Title',
        content: 'This is the updated content.'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toEqual('Updated Document Title');
    expect(res.body.content).toEqual('This is the updated content.');
    
    console.log('✅ Document update successful');
  });
  
  // Test access control - second user shouldn't be able to access the document yet
  test('GET /api/documents/:id - Access control test', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${secondUserToken}`);
    
    expect(res.statusCode).toEqual(403); // Forbidden
    
    console.log('✅ Document access control works');
  });
  
  // Test document sharing
  test('POST /api/documents/:id/share - Share document with another user', async () => {
    const res = await request(app)
      .post(`/api/documents/${testDocumentId}/share`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        email: 'second@example.com',
        accessLevel: 'editor'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('shared');
    
    console.log('✅ Document sharing successful');
  });
  
  // Test that second user can now access the document
  test('GET /api/documents/:id - Second user can access shared document', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${secondUserToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body._id).toEqual(testDocumentId);
    
    console.log('✅ Shared access works');
  });
  
  // Test that second user can now edit the document
  test('PUT /api/documents/:id - Second user can edit shared document', async () => {
    const res = await request(app)
      .put(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .send({
        content: 'This content was edited by the second user.'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.content).toEqual('This content was edited by the second user.');
    
    console.log('✅ Shared editing works');
  });
  
  // Test changing document visibility
  test('PUT /api/documents/:id/visibility - Make document public', async () => {
    const res = await request(app)
      .put(`/api/documents/${testDocumentId}/visibility`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        isPublic: true
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.isPublic).toBe(true);
    
    console.log('✅ Document visibility changed to public');
  });
});

// VERSION HISTORY TESTS
describe('Version History Endpoints', () => {
  // Test getting version history
  test('GET /api/documents/:id/versions - Get document version history', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDocumentId}/versions`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('versions');
    expect(Array.isArray(res.body.versions)).toBe(true);
    expect(res.body.versions.length).toBeGreaterThan(0);
    
    // Save first version ID for later test
    versionId = res.body.versions[0].versionId;
    
    console.log('✅ Get version history successful');
  });
  
  // Test getting specific version content
  test('GET /api/documents/:id/versions/:versionId - Get specific version content', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDocumentId}/versions/${versionId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('content');
    expect(res.body).toHaveProperty('versionId');
    expect(res.body.versionId).toEqual(versionId);
    
    console.log('✅ Get version content successful');
  });
  
  // Test restoring a version
  test('POST /api/documents/:id/versions/:versionId/restore - Restore a specific version', async () => {
    const res = await request(app)
      .post(`/api/documents/${testDocumentId}/versions/${versionId}/restore`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('restored');
    
    console.log('✅ Version restoration successful');
  });
});

// COLLABORATION TESTS
describe('Collaboration Endpoints', () => {
  // Test removing a collaborator
  test('DELETE /api/documents/:id/collaborators/:userId - Remove collaborator', async () => {
    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}/collaborators/${secondUserId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('removed');
    
    console.log('✅ Collaborator removal successful');
  });
  
  // Test that removed collaborator can no longer access the document
  test('GET /api/documents/:id - Removed collaborator cannot access document', async () => {
    // Document is still public, so we need to make it private first
    await request(app)
      .put(`/api/documents/${testDocumentId}/visibility`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        isPublic: false
      });
    
    const res = await request(app)
      .get(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${secondUserToken}`);
    
    expect(res.statusCode).toEqual(403); // Forbidden
    
    console.log('✅ Collaborator access removal works');
  });
});

// SEARCH TESTS
describe('Search Endpoints', () => {
  // Create another document for search testing
  test('Create a second document for search testing', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Searchable Document',
        content: 'This document contains searchable keywords like unicorn.'
      });
    
    expect(res.statusCode).toEqual(201);
    
    console.log('✅ Created document for search testing');
  });
  
  // Test document search
  test('GET /api/search - Search for documents', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ query: 'unicorn' })
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('documents');
    expect(Array.isArray(res.body.documents)).toBe(true);
    expect(res.body.documents.length).toBeGreaterThan(0);
    expect(res.body.documents[0].title).toEqual('Searchable Document');
    
    console.log('✅ Document search successful');
  });
  
  // Test recent documents
  test('GET /api/search/recent - Get recent documents', async () => {
    const res = await request(app)
      .get('/api/search/recent')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    
    console.log('✅ Recent documents retrieval successful');
  });
});

// ERROR HANDLING TESTS
describe('Error Handling', () => {
  // Test invalid document ID
  test('GET /api/documents/:id - Invalid document ID', async () => {
    const res = await request(app)
      .get('/api/documents/invalidid')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(500); // Internal Server Error for invalid MongoDB ID
    
    console.log('✅ Invalid ID error handling works');
  });
  
  // Test document not found
  test('GET /api/documents/:id - Document not found', async () => {
    const nonExistentId = '60b6e4a7e15d3c001fcf1234'; // Valid format but doesn't exist
    const res = await request(app)
      .get(`/api/documents/${nonExistentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('not found');
    
    console.log('✅ Document not found error handling works');
  });
  
  // Test authentication error
  test('GET /api/documents - Authentication required', async () => {
    const res = await request(app)
      .get('/api/documents');
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('not authorized');
    
    console.log('✅ Authentication required error handling works');
  });
  
  // Test invalid token
  test('GET /api/documents - Invalid token', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', 'Bearer invalidtoken');
    
    expect(res.statusCode).toEqual(401);
    
    console.log('✅ Invalid token error handling works');
  });
});

// DOCUMENT DELETION TEST (run last)
describe('Document Deletion', () => {
  // Test document deletion
  test('DELETE /api/documents/:id - Delete document', async () => {
    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('removed');
    
    console.log('✅ Document deletion successful');
  });
  
  // Verify document is actually deleted
  test('GET /api/documents/:id - Deleted document not found', async () => {
    const res = await request(app)
      .get(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toEqual(404);
    
    console.log('✅ Document deletion verification successful');
  });
});