import { GENERAL_TYPES, SQLITE_MAP } from './types.js';

function parseEnumValues(columnType) {
  // SQLite tidak mendukung enum asli, jadi kosongkan
  return [];
}

async function listDatabases(knex) {
  // SQLite tidak mendukung banyak database seperti MySQL
  return ['main'];
}

async function listTables(knex, schema) {
  const rows = await knex
    .select('name')
    .from('sqlite_master')
    .where('type', 'table')
    .andWhereNot('name', 'like', 'sqlite_%');

  return rows.map((row) => row.name);
}

async function listViews(knex) {
  const rows = await knex
    .select('name')
    .from('sqlite_master')
    .where('type', 'view');
  return rows.map((row) => row.name);
}

async function listColumns(knex, table, schema) {
  const rows = await knex.raw(`PRAGMA table_info(${table})`);
  return rows.map((col) => {
    const dbTypeRaw = col.type ? col.type.toLowerCase().split('(')[0] : 'text';
    const dbType = SQLITE_MAP[dbTypeRaw] || 'STRING';
    const type = GENERAL_TYPES[dbType.toUpperCase()] || 'string';

    return {
      name: col.name,
      allowNull: col.notnull === 0,
      autoIncrement: col.pk === 1 && col.type?.toLowerCase() === 'integer',
      comment: '', // SQLite tidak punya komentar kolom
      rawType: col.type,
      dbType,
      type,
      defaultValue: col.dflt_value,
      enumValues: [], // SQLite tidak punya enum
      isPrimaryKey: col.pk === 1,
      precision: null,
      scale: null,
      size: null,
      unsigned: false,
    };
  });
}

async function listIndexes(knex, table, schema) {
  const rows = await knex.raw(`PRAGMA index_list(${table})`);
  const indexes = [];

  for (const idx of rows) {
    const indexInfo = await knex.raw(`PRAGMA index_info(${idx.name})`);
    for (const info of indexInfo) {
      indexes.push({
        columnName: info.name,
        name: idx.name,
        isUnique: idx.unique === 1,
        isPrimaryKey: idx.name === 'sqlite_autoindex_' + table + '_1',
        indexType: 'BTREE',
      });
    }
  }

  return indexes;
}

async function listConstraints(knex, table, schema) {
  const rows = await knex.raw(`PRAGMA foreign_key_list(${table})`);
  return rows.map((row) => ({
    constraintName: null, // SQLite tidak punya nama constraint FK
    columnName: row.from,
    referencedTableName: row.table,
    referencedColumnName: row.to,
    onUpdate: row.on_update,
    onDelete: row.on_delete,
  }));
}

async function getTableSchema(knex, table, schema) {
  const columns = await listColumns(knex, table, schema);
  const indexes = await listIndexes(knex, table, schema);
  const foreignKeys = await listConstraints(knex, table, schema);

  let sequenceName = null;
  for (const column of columns) {
    if (column.autoIncrement) {
      sequenceName = column.name;
      break;
    }
  }

  let primaryKeys = indexes
    .filter((idx) => idx.isPrimaryKey)
    .map((idx) => idx.columnName);

  if (primaryKeys.length === 0) {
    primaryKeys = columns
      .filter((col) => col.isPrimaryKey)
      .map((col) => col.name);
  }

  return {
    schemaName: 'main',
    tableName: table,
    primaryKeys,
    sequenceName,
    foreignKeys,
    indexes: indexes.filter((idx) => !idx.isPrimaryKey),
    columns,
  };
}

async function getDatabaseVersion(knex) {
  const rows = await knex.raw('SELECT sqlite_version() as version');
  return rows[0]['version'];
}

export default {
  listDatabases,
  listTables,
  listViews,
  listColumns,
  listIndexes,
  listConstraints,
  getTableSchema,
  getDatabaseVersion,
};
