import { TestDataSeeder } from '../utils/test-data-seeder';

async function seedTestDatabase() {
  try {
    console.log('🌱 Seeding test database...');
    await TestDataSeeder.seedDatabase();
    console.log('✅ Test database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test database:', error);
    process.exit(1);
  }
}

seedTestDatabase();