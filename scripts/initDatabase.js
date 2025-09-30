// scripts/initDatabase.js - Database Initialization Script
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'task_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function initDatabase() {
  const client = await pool.connect();
  console.log('🔧 Starting database initialization...\n');

  try {
    await client.query('BEGIN');

    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating tasks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    console.log('✅ Database schema created successfully\n');

    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin@123456';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length === 0) {
      await client.query(
        `INSERT INTO users (username, email, password, role) 
         VALUES ($1, $2, $3, $4)`,
        ['admin', adminEmail, hashedPassword, 'admin']
      );
      console.log('✅ Default admin user created');
      console.log('   Email: admin@example.com');
      console.log('   Password: Admin@123456');
      console.log('   ⚠️  IMPORTANT: Change this password in production!\n');
    } else {
      console.log('ℹ️  Admin user already exists\n');
    }

    const userEmail = 'user@example.com';
    const userPassword = 'User@123456';
    const hashedUserPassword = await bcrypt.hash(userPassword, 10);

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );

    if (existingUser.rows.length === 0) {
      await client.query(
        `INSERT INTO users (username, email, password, role) 
         VALUES ($1, $2, $3, $4)`,
        ['testuser', userEmail, hashedUserPassword, 'user']
      );
      console.log('✅ Sample user created');
      console.log('   Email: user@example.com');
      console.log('   Password: User@123456\n');
    }

    const adminResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );
    const adminId = adminResult.rows[0]?.id;

    if (adminId) {
      const sampleTasks = [
        {
          title: 'Complete project documentation',
          description: 'Write comprehensive documentation for the API',
          priority: 'high',
          status: 'in_progress'
        },
        {
          title: 'Review pull requests',
          description: 'Review and merge pending pull requests',
          priority: 'medium',
          status: 'pending'
        },
        {
          title: 'Setup CI/CD pipeline',
          description: 'Configure GitHub Actions for automated testing',
          priority: 'high',
          status: 'completed'
        }
      ];

      for (const task of sampleTasks) {
        await client.query(
          `INSERT INTO tasks (title, description, priority, status, user_id) 
           VALUES ($1, $2, $3, $4, $5)`,
          [task.title, task.description, task.priority, task.status, adminId]
        );
      }
      console.log('✅ Sample tasks created\n');
    }

    await client.query('COMMIT');

    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Visit API docs: http://localhost:5000/api-docs');
    console.log('   3. Test the API with provided credentials\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });