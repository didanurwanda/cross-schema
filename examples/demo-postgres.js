import knex from 'knex';
import CrossSchema from '../src/index.js';

const db = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: 'postgres',
    database: 'sabilulhuromain', // Ganti dengan nama database yang ingin digunakan
  },
});

(async () => {
  const cs = new CrossSchema('postgres', db);

  try {
    // Uncomment sesuai kebutuhan:
    // console.log(await cs.listDatabases());
    // console.log(await cs.listTables('public')); // PostgreSQL default schema biasanya 'public'
    // console.log(await cs.listViews('public'));
    // console.log(await cs.
    //   Version());
    // console.log(await cs.listIndexes('roles', 'public'));
    console.log(await cs.getTableSchema('roles', 'public'));
    // console.log(await cs.listIndexes('public', 'users'));
    // console.log(await cs.listConstraints('role_has_permissions', 'public'));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await db.destroy(); // Tutup koneksi Knex
  }
})();
