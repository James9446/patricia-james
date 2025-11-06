#!/usr/bin/env node

/**
 * Photo Seeding Script
 * Seeds the database with initial photos across all categories
 */

require('dotenv').config();
const { query } = require('../src/config/db');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Photo data structure for seeding
const photoSeeds = [
  // Engagement Photos
  {
    category: 'engagement',
    photos: [
      {
        filename: 'engagement_01_proposal.jpg',
        caption: 'The moment James got down on one knee',
        is_featured: true,
        display_order: 1
      },
      {
        filename: 'engagement_02_ring_closeup.jpg',
        caption: 'The beautiful ring that started it all',
        is_featured: true,
        display_order: 2
      },
      {
        filename: 'engagement_03_celebration.jpg',
        caption: 'Celebrating with family and friends',
        is_featured: false,
        display_order: 3
      },
      {
        filename: 'engagement_04_sunset.jpg',
        caption: 'Golden hour engagement photos',
        is_featured: true,
        display_order: 4
      },
      {
        filename: 'engagement_05_candid.jpg',
        caption: 'Candid moments of pure joy',
        is_featured: false,
        display_order: 5
      }
    ]
  },
  
  // Relationship Timeline
  {
    category: 'timeline',
    photos: [
      {
        filename: 'timeline_01_first_date.jpg',
        caption: 'Our very first date at the coffee shop',
        is_featured: true,
        display_order: 1
      },
      {
        filename: 'timeline_02_anniversary_1.jpg',
        caption: 'Celebrating our first anniversary',
        is_featured: false,
        display_order: 2
      },
      {
        filename: 'timeline_03_vacation.jpg',
        caption: 'Our first vacation together',
        is_featured: true,
        display_order: 3
      },
      {
        filename: 'timeline_04_moving_in.jpg',
        caption: 'Moving in together - a new chapter',
        is_featured: false,
        display_order: 4
      },
      {
        filename: 'timeline_05_holidays.jpg',
        caption: 'Holiday traditions we created together',
        is_featured: false,
        display_order: 5
      }
    ]
  },
  
  // Childhood Photos
  {
    category: 'childhood',
    photos: [
      {
        filename: 'childhood_01_patricia_baby.jpg',
        caption: 'Patricia as a baby - so adorable!',
        is_featured: true,
        display_order: 1
      },
      {
        filename: 'childhood_02_james_kid.jpg',
        caption: 'James as a little boy',
        is_featured: true,
        display_order: 2
      },
      {
        filename: 'childhood_03_family_photos.jpg',
        caption: 'Family photos from our childhoods',
        is_featured: false,
        display_order: 3
      },
      {
        filename: 'childhood_04_school_days.jpg',
        caption: 'School photos and memories',
        is_featured: false,
        display_order: 4
      }
    ]
  },
  
  // Family Photos
  {
    category: 'family',
    photos: [
      {
        filename: 'family_01_parents_meeting.jpg',
        caption: 'When our families first met',
        is_featured: true,
        display_order: 1
      },
      {
        filename: 'family_02_holiday_gathering.jpg',
        caption: 'Holiday gatherings with both families',
        is_featured: false,
        display_order: 2
      },
      {
        filename: 'family_03_siblings.jpg',
        caption: 'With our siblings and extended family',
        is_featured: false,
        display_order: 3
      },
      {
        filename: 'family_04_grandparents.jpg',
        caption: 'Special moments with grandparents',
        is_featured: true,
        display_order: 4
      }
    ]
  },
  
  // Adventures
  {
    category: 'adventures',
    photos: [
      {
        filename: 'adventures_01_hiking.jpg',
        caption: 'Hiking adventures in the mountains',
        is_featured: true,
        display_order: 1
      },
      {
        filename: 'adventures_02_beach_trip.jpg',
        caption: 'Beach trips and ocean views',
        is_featured: false,
        display_order: 2
      },
      {
        filename: 'adventures_03_city_exploring.jpg',
        caption: 'Exploring new cities together',
        is_featured: false,
        display_order: 3
      },
      {
        filename: 'adventures_04_food_tours.jpg',
        caption: 'Food tours and culinary adventures',
        is_featured: true,
        display_order: 4
      },
      {
        filename: 'adventures_05_concerts.jpg',
        caption: 'Concerts and live music experiences',
        is_featured: false,
        display_order: 5
      }
    ]
  },
  
  // Wedding Preparation
  {
    category: 'prep',
    photos: [
      {
        filename: 'prep_01_venue_visit.jpg',
        caption: 'First visit to our wedding venue',
        is_featured: true,
        display_order: 1
      },
      {
        filename: 'prep_02_dress_shopping.jpg',
        caption: 'Wedding dress shopping adventures',
        is_featured: true,
        display_order: 2
      },
      {
        filename: 'prep_03_cake_tasting.jpg',
        caption: 'Cake tasting - the best part of planning!',
        is_featured: false,
        display_order: 3
      },
      {
        filename: 'prep_04_flowers.jpg',
        caption: 'Choosing our wedding flowers',
        is_featured: false,
        display_order: 4
      },
      {
        filename: 'prep_05_invitations.jpg',
        caption: 'Designing and sending invitations',
        is_featured: false,
        display_order: 5
      }
    ]
  },
  
  // Wedding Day
  {
    category: 'wedding',
    photos: [
      {
        filename: 'wedding_01_ceremony.jpg',
        caption: 'The beautiful ceremony',
        is_featured: true,
        display_order: 1
      },
      {
        filename: 'wedding_02_first_kiss.jpg',
        caption: 'Our first kiss as husband and wife',
        is_featured: true,
        display_order: 2
      },
      {
        filename: 'wedding_03_reception.jpg',
        caption: 'Celebrating at the reception',
        is_featured: false,
        display_order: 3
      },
      {
        filename: 'wedding_04_dancing.jpg',
        caption: 'Our first dance together',
        is_featured: true,
        display_order: 4
      },
      {
        filename: 'wedding_05_cake_cutting.jpg',
        caption: 'Cutting the wedding cake',
        is_featured: false,
        display_order: 5
      }
    ]
  },
  
  // Guest Memories
  {
    category: 'memories',
    photos: [
      {
        filename: 'memories_01_friends_gathering.jpg',
        caption: 'With our closest friends',
        is_featured: false,
        display_order: 1
      },
      {
        filename: 'memories_02_college_days.jpg',
        caption: 'College memories and friendships',
        is_featured: false,
        display_order: 2
      },
      {
        filename: 'memories_03_work_colleagues.jpg',
        caption: 'Work colleagues who became family',
        is_featured: false,
        display_order: 3
      },
      {
        filename: 'memories_04_community_events.jpg',
        caption: 'Community events and celebrations',
        is_featured: false,
        display_order: 4
      }
    ]
  }
];

// Helper function to get category ID
async function getCategoryId(slug) {
  const result = await query(
    'SELECT id FROM photo_categories WHERE slug = $1',
    [slug]
  );
  return result.rows[0]?.id;
}

// Helper function to get a random user ID (for attribution)
async function getRandomUserId() {
  const result = await query(
    'SELECT id FROM users WHERE deleted_at IS NULL ORDER BY RANDOM() LIMIT 1'
  );
  return result.rows[0]?.id;
}

// Helper function to create a placeholder photo file
async function createPlaceholderPhoto(filename, category) {
  const uploadsDir = path.join(__dirname, '../uploads/photos');
  await fs.mkdir(uploadsDir, { recursive: true });
  
  const filePath = path.join(uploadsDir, filename);
  
  // Create a simple placeholder image (1x1 pixel PNG)
  const placeholderBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  await fs.writeFile(filePath, placeholderBuffer);
  return filePath;
}

// Main seeding function
async function seedPhotos() {
  try {
    console.log('🌱 Starting photo seeding process...');
    
    // Get a random user for attribution
    const userId = await getRandomUserId();
    if (!userId) {
      throw new Error('No users found in database. Please seed users first.');
    }
    
    console.log(`👤 Using user ${userId} for photo attribution`);
    
    let totalPhotos = 0;
    
    for (const categoryData of photoSeeds) {
      console.log(`\n📸 Seeding ${categoryData.category} category...`);
      
      const categoryId = await getCategoryId(categoryData.category);
      if (!categoryId) {
        console.log(`⚠️  Category ${categoryData.category} not found, skipping...`);
        continue;
      }
      
      for (const photoData of categoryData.photos) {
        try {
          // Create placeholder file
          const filePath = await createPlaceholderPhoto(photoData.filename, categoryData.category);
          
          // Insert photo record
          const result = await query(`
            INSERT INTO photos (
              user_id, filename, original_filename, file_path, file_size, 
              mime_type, caption, category_id, is_approved, is_featured, 
              display_order, original_file_size
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `, [
            userId,
            photoData.filename,
            photoData.filename,
            filePath,
            100, // Placeholder size
            'image/png',
            photoData.caption,
            categoryId,
            true, // Auto-approve
            photoData.is_featured,
            photoData.display_order,
            100
          ]);
          
          console.log(`  ✅ Added: ${photoData.filename}`);
          totalPhotos++;
          
        } catch (error) {
          console.log(`  ❌ Failed to add ${photoData.filename}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n🎉 Photo seeding completed! Added ${totalPhotos} photos.`);
    
    // Show summary by category
    console.log('\n📊 Summary by category:');
    const summaryResult = await query(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as photo_count,
        COUNT(CASE WHEN p.is_featured = true THEN 1 END) as featured_count
      FROM photo_categories c
      LEFT JOIN photos p ON c.id = p.category_id
      GROUP BY c.id, c.name, c.display_order
      ORDER BY c.display_order
    `);
    
    summaryResult.rows.forEach(row => {
      console.log(`  ${row.category_name}: ${row.photo_count} photos (${row.featured_count} featured)`);
    });
    
  } catch (error) {
    console.error('❌ Photo seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding if called directly
if (require.main === module) {
  seedPhotos()
    .then(() => {
      console.log('✅ Photo seeding script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Photo seeding script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedPhotos };

