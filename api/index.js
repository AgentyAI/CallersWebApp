// Vercel serverless function wrapper for Express backend
import app from '../backend/server.js';

// Export the Express app as a serverless function
// Vercel routes /api/* requests to this function
// The Express app already has routes mounted at /api/*, so paths match correctly
export default app;

