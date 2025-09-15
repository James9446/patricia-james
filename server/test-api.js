const { query } = require('./src/config/db');

async function testDatabase() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', result.rows[0].current_time);
    
    // Test guests table
    const guestCount = await query('SELECT COUNT(*) as count FROM guests');
    console.log(`📊 Guests in database: ${guestCount.rows[0].count}`);
    
    // Test sample guest creation
    const testGuest = await query(`
      INSERT INTO guests (first_name, last_name, email, party_size) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, ['Test', 'User', 'test@example.com', 1]);
    
    console.log('✅ Test guest created:', testGuest.rows[0]);
    
    // Clean up test guest
    await query('DELETE FROM guests WHERE email = $1', ['test@example.com']);
    console.log('🧹 Test guest cleaned up');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();
