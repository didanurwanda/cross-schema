import { GENERAL_TYPES, MYSQL_MAP } from './types.js';

function parseEnumValues(columnType) {
  if (!/^enum|set/i.test(columnType)) return [];
  return columnType
    .replace(/(enum|set)\((.*)\)/i, '$2')
    .split(',')
    .map((v) => v.trim().replace(/^'(.*)'$/, '$1'));
}

async function listDatabases(knex) {
  const rows = await knex('information_schema.schemata').select('schema_name');
  return rows.map((row) => row.SCHEMA_NAME || row.schema_name);
}

async function listTables(knex, schema) {
  const rows = await knex('information_schema.tables')
    .select('table_name')
    .where('table_type', 'BASE TABLE')
    .andWhere('table_schema', schema || knex.raw('DATABASE()'));
  return rows.map((row) => row.TABLE_NAME || row.table_name);
}

async function listViews(knex, schema) {
  const rows = await knex('information_schema.views')
    .select('table_name')
    .where('table_schema', schema || knex.raw('DATABASE()'));
  return rows.map((row) => row.TABLE_NAME || row.table_name);
}

async function listColumns(knex, table, schema) {
  const rows = await knex('information_schema.columns')
    .select(
      'COLUMN_NAME',
      'COLUMN_TYPE',
      'DATA_TYPE',
      'IS_NULLABLE',
      'COLUMN_DEFAULT',
      'COLUMN_KEY',
      'EXTRA',
      'COLUMN_COMMENT',
      'CHARACTER_MAXIMUM_LENGTH',
      'NUMERIC_PRECISION',
      'NUMERIC_SCALE',
      'COLUMN_TYPE'
    )
    .where('table_schema', schema || knex.raw('DATABASE()'))
    .andWhere('table_name', table)
    .orderBy('ORDINAL_POSITION', 'ASC');

  return rows.map((col) => {
    const dbTypeRaw = col.DATA_TYPE.toLowerCase();
    const dbType = MYSQL_MAP[dbTypeRaw] || 'STRING';
    const type = GENERAL_TYPES[dbType.toUpperCase()] || 'string';

    return {
      name: col.COLUMN_NAME,
      allowNull: col.IS_NULLABLE === 'YES',
      autoIncrement: col.EXTRA.includes('auto_increment'),
      comment: col.COLUMN_COMMENT || '',
      rawType: col.DATA_TYPE,
      dbType,
      type,
      defaultValue: col.COLUMN_DEFAULT,
      enumValues: parseEnumValues(col.COLUMN_TYPE),
      isPrimaryKey: col.COLUMN_KEY === 'PRI',
      precision: col.NUMERIC_PRECISION || null,
      scale: col.NUMERIC_SCALE || null,
      size: col.CHARACTER_MAXIMUM_LENGTH || null,
      unsigned: /unsigned/i.test(col.COLUMN_TYPE),
    };
  });
}

async function listIndexes(knex, table, schema) {
  const rows = await knex('information_schema.statistics')
    .select(
      knex.raw('COLUMN_NAME as column_name'),
      knex.raw('INDEX_NAME as index_name'),
      knex.raw('NOT non_unique AS index_is_unique'),
      knex.raw("index_name = 'PRIMARY' AS index_is_primary")
    )
    .where('table_schema', schema || knex.raw('DATABASE()'))
    .andWhere('index_schema', schema || knex.raw('DATABASE()'))
    .andWhere('table_name', table);

  return rows.map((row) => ({
    column_name: row.column_name,
    name: row.index_name,
    index_is_unique: !!row.index_is_unique,
    index_is_primary: !!row.index_is_primary,
  }));
}

async function listConstraints(knex, table, schema) {
  const rows = await knex
    .select([
      'kcu.constraint_name as constraint_name',
      'kcu.column_name as column_name',
      'kcu.referenced_table_name as referenced_table_name',
      'kcu.referenced_column_name as referenced_column_name',
    ])
    .from('information_schema.referential_constraints as rc')
    .join('information_schema.key_column_usage as kcu', function () {
      this.on('kcu.constraint_schema', '=', 'rc.constraint_schema')
        .andOn('kcu.constraint_name', '=', 'rc.constraint_name')
        .andOn(function () {
          this.on('kcu.constraint_catalog', '=', 'rc.constraint_catalog').orOn(
            knex.raw(
              'kcu.constraint_catalog IS NULL AND rc.constraint_catalog IS NULL'
            )
          );
        });
    })
    .where('rc.constraint_schema', '=', schema || knex.raw('DATABASE()'))
    .andWhere('kcu.table_schema', '=', schema || knex.raw('DATABASE()'))
    .andWhere('rc.table_name', '=', table)
    .andWhere('kcu.table_name', '=', table);

  return rows;
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

  const primaryKeys = indexes
    .filter((idx) => idx.index_is_primary)
    .map((idx) => idx.column_name);

  return {
    schemaName: schema || (await getDatabaseName(knex)),
    tableName: table,
    primaryKeys,
    sequenceName,
    foreignKeys,
    indexes: indexes.filter((idx) => !idx.index_is_primary),
    columns,
  };
}

async function getDatabaseVersion(knex) {
  const rows = await knex.raw('SELECT VERSION() as version');
  return rows[0][0].version;
}

async function getDatabaseName(knex) {
  const rows = await knex.raw('SELECT DATABASE() as db');
  return rows[0][0].db;
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
