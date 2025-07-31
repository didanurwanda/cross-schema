import knex from 'knex';
import CrossSchema from '../src/index.js';

const db = knex({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'sabilulhuromain' // Tidak perlu ditentukan kalau ingin cek banyak database
  }
});

(async () => {
  const cs = new CrossSchema({ platform: 'mysql', client: db });

  try {
    // Uncomment sesuai kebutuhan:
    // console.log(await cs.listDatabases());
    // console.log(await cs.listTables());
    // console.log(await cs.listIndexes('users'));
    // console.log(await cs.listConstraints('role_has_permissions'));
    console.log(await cs.getTableSchema('roles'));

    // console.log(await cs.getDatabaseVersion());
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await db.destroy(); // Tutup koneksi Knex
  }
})();
