const { pool } = require('../config/db');

async function initDB() {
  const client = await pool.connect();
  try {
    console.log("🛠  Initializing Database...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(res.rows[0].count) === 0) {
      console.log("🌱 Seeding products...");
      for (let i = 1; i <= 1000; i++) {
        await client.query(
          'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3)',
          [`Product ${i}`, (Math.random() * 100).toFixed(2), 5000]
        );
      }
      console.log("✅ Seeding complete.");
    } else {
      console.log("⏩ Products already seeded.");
    }

    console.log("🎉 Database Initialized Successfully.");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  } finally {
    client.release();
    process.exit();
  }
}

initDB();
