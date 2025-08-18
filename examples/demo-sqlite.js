import knex from 'knex';
import CrossSchema from '../src/index.js';

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './examples/main.db', // ganti sesuai lokasi file SQLite kamu
  },
  useNullAsDefault: true,
});

(async () => {
  const cs = new CrossSchema('sqlite3', db);

  try {
    // Uncomment sesuai kebutuhan:
    // console.log(await cs.listDatabases());
    // console.log(await cs.listTables());
    // console.log(await cs.listIndexes('roles'));
    // console.log(await cs.listColumns('permissions'));
    console.log(await cs.listColumns('users'));
    // console.log(await cs.listTables());
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await db.destroy(); // Tutup koneksi Knex
  }
})();
