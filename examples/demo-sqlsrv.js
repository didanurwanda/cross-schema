import knex from 'knex';
import CrossSchema from '../src/index.js';

const db = knex({
  client: 'mssql',
  connection: {
    host: '127.0.0.1',
    port: 1433,
    user: 'sa',
    password: 'YourStrong!Passw0rd',
    database: 'sabilulhuromain',
    options: {
      encrypt: false, // jika tidak pakai enkripsi TLS
      enableArithAbort: true,
    },
  },
});

(async () => {
  const cs = new CrossSchema('mssql', db);

  try {
    // Uncomment sesuai kebutuhan:
    // console.log(await cs.listDatabases());
    // console.log(await cs.listTables());
    // console.log(await cs.listIndexes('users'));
    // console.log(await cs.listConstraints());
    // console.log(await cs.listColumns('role_has_permissions'));
    console.log(await cs.getTableSchema('role_has_permissions'));

    // console.log(await cs.getDatabaseVersion());
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await db.destroy(); // Tutup koneksi Knex
  }
})();
