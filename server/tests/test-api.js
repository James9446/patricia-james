const { query } = require('../src/config/db');

async function testDatabase() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', result.rows[0].current_time);
    
    // Test users table
    const userCount = await query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
    console.log(`📊 Users in database: ${userCount.rows[0].count}`);
    
    // Test sample user creation
    const testUser = await query(`
      INSERT INTO users (first_name, last_name, email, account_status) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, ['Test', 'User', 'test@example.com', 'guest']);
    
    console.log('✅ Test user created:', testUser.rows[0]);
    
    // Clean up test user
    await query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    console.log('🧹 Test user cleaned up');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();
