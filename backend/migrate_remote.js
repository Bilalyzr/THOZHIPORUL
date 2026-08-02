const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const runMigration = async () => {
    // Check if the user passed the Render URL as an argument
    const connectionString = process.argv[2];
    
    if (!connectionString || !connectionString.startsWith('postgres')) {
        console.error("❌ Please provide your Render 'External Database URL' as an argument.");
        console.error("Example: node migrate_remote.js postgres://user:password@hostname.render.com/dbname?sslmode=require");
        process.exit(1);
    }

    console.log("Connecting to the live remote database...");
    
    // We need to append ?sslmode=require if it's not there, as Render requires SSL from outside
    let finalConnectionString = connectionString;
    if (!finalConnectionString.includes('sslmode=require')) {
        finalConnectionString += finalConnectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }

    const client = new Client({
        connectionString: finalConnectionString,
    });

    try {
        await client.connect();
        console.log("✅ Successfully connected to the live database!");

        // 1. Run schema_v2.sql
        console.log("⏳ Running schema_v2.sql (Creating tables)...");
        const schemaPath1 = path.join(__dirname, 'schema.sql'); await client.query(fs.readFileSync(schemaPath1, 'utf8')); const schemaPath = path.join(__dirname, 'schema_v2.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log("✅ Tables created successfully!");

        // 2. Run seed.sql
        console.log("⏳ Running seed.sql (Inserting dummy data and admin)...");
        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await client.query(seedSql);
        console.log("✅ Data inserted successfully!");

        console.log("🎉 ALL DONE! You can now log into your live site.");
    } catch (err) {
        console.error("❌ An error occurred during migration:", err.message);
    } finally {
        await client.end();
    }
};

runMigration();
