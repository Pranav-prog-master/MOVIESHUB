/* Database connection helper.
 * Connects to MONGODB_URI when provided, otherwise spins up an in-memory
 * MongoDB server (via mongodb-memory-server) so the app runs with zero setup. */
const mongoose = require('mongoose');

// Fail fast instead of buffering queries forever when the DB is unreachable.
mongoose.set('bufferCommands', false);

function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  console.log('[db] USE_MEMORY_DB =', process.env.USE_MEMORY_DB);
  console.log('[db] MONGODB_URI =', uri || '(not set)');

  if (uri) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('[db] ✓ Connected to MongoDB at', uri);
      return;
    } catch (err) {
      console.warn('[db] ✗ Could not connect to MONGODB_URI:', err.message);
    }
  }

  if (process.env.USE_MEMORY_DB === 'false') {
    console.warn('[db] USE_MEMORY_DB=false and no MONGODB_URI — database features disabled.');
    return;
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    const memUri = mem.getUri();
    await mongoose.connect(memUri);
    console.log('[db] ✓ Connected to in-memory MongoDB (ephemeral — data lost on restart)');
    console.log('[db]   URI:', memUri);
  } catch (err) {
    console.warn('[db] ✗ In-memory MongoDB unavailable:', err.message);
  }
}

module.exports = connectDB;
module.exports.isConnected = isConnected;
