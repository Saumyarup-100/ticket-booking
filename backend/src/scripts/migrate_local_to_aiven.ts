process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
import { Pool } from 'pg';

const LOCAL_URL = process.env['LOCAL_DATABASE_URL'] ?? 'postgresql://user:password@localhost:5432/ticket_booking?schema=public';
const AIVEN_URL = process.env['DATABASE_URL'] ?? 'postgres://user:password@pg-host.aivencloud.com:10914/defaultdb?sslmode=no-verify';

async function migrate() {
  console.log('🚀 Starting data migration from Local PostgreSQL to Aiven Cloud PostgreSQL...');

  const localPool = new Pool({ connectionString: LOCAL_URL });
  const aivenPool = new Pool({ 
    connectionString: AIVEN_URL,
    ssl: { rejectUnauthorized: false }
  });

  const tables = [
    'User',
    'Venue',
    'VenueLayout',
    'SeatCategory',
    'Seat',
    'Event',
    'Show',
    'SeatStatus',
    'Booking',
    'BookingSeat',
    'Waitlist'
  ];

  try {
    for (const table of tables) {
      console.log(`\n📦 Reading table "${table}" from local database...`);
      let rows: any[] = [];
      try {
        const res = await localPool.query(`SELECT * FROM "${table}"`);
        rows = res.rows;
      } catch (err: any) {
        console.log(`⚠️ Could not read "${table}" from local db (might be empty or missing):`, err.message);
        continue;
      }

      console.log(`Found ${rows.length} rows in "${table}".`);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');
      
      let insertedCount = 0;
      for (const row of rows) {
        const values = columns.map(c => {
          const val = row[c];
          if (val && typeof val === 'object' && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
          INSERT INTO "${table}" (${colNames}) 
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        try {
          await aivenPool.query(query, values);
          insertedCount++;
        } catch (insertErr: any) {
          console.error(`Error inserting into "${table}" (ID: ${row.id}):`, insertErr.message);
        }
      }
      console.log(`✅ Transferred ${insertedCount}/${rows.length} rows into Aiven "${table}".`);
    }

    console.log('\n🎉 Data migration from local PostgreSQL to Aiven PostgreSQL completed successfully!');
  } catch (error) {
    console.error('Fatal error during migration:', error);
  } finally {
    await localPool.end();
    await aivenPool.end();
  }
}

migrate();
