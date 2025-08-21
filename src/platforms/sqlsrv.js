import { GENERAL_TYPES, SQLITE_MAP, SQLSRV_TYPES } from './types.js';

async function listDatabases(knex) {
  // throw not supported database
  throw new Error('listDatabases not implemented for platform sqlsrv');
}

async function listTables(knex, schema = 'dbo') {
  const rows = await knex('INFORMATION_SCHEMA.TABLES as t')
    .select('t.table_name')
    .where('t.table_schema', schema || 'dbo')
    .whereIn('t.table_type', ['BASE TABLE'])
    .orderBy('t.table_name');

  return rows.map((row) => row.table_name);
}

async function listViews(knex, schema = 'dbo') {
  const rows = await knex('INFORMATION_SCHEMA.TABLES as t')
    .select('t.table_name')
    .where('t.table_schema', schema || 'dbo')
    .whereIn('t.table_type', ['VIEW'])
    .orderBy('t.table_name');

  return rows.map((row) => row.table_name);
}

async function listColumns(knex, table, schema) {
  const pkRows = await knex
    .select('kcu.column_name AS field_name')
    .from({ kcu: 'INFORMATION_SCHEMA.KEY_COLUMN_USAGE' })
    .leftJoin({ tc: 'INFORMATION_SCHEMA.TABLE_CONSTRAINTS' }, function () {
      this.on('kcu.table_schema', '=', 'tc.table_schema')
        .andOn('kcu.table_name', '=', 'tc.table_name')
        .andOn('kcu.constraint_name', '=', 'tc.constraint_name');
    })
    .where('kcu.table_name', table)
    .andWhere('kcu.table_schema', schema || 'dbo')
    .andWhere('tc.CONSTRAINT_TYPE', 'PRIMARY KEY');

  var primaryKeys = pkRows.map((col) => {
    return col.field_name;
  });

  const rows = await knex.raw(
    `SELECT
      [t1].[column_name],
      [t1].[is_nullable],
      CASE WHEN [t1].[data_type] IN ('char','varchar','nchar','nvarchar','binary','varbinary') THEN
          CASE WHEN [t1].[character_maximum_length] = NULL OR [t1].[character_maximum_length] = -1 THEN
              [t1].[data_type]
          ELSE
              [t1].[data_type] + '(' + LTRIM(RTRIM(CONVERT(CHAR,[t1].[character_maximum_length]))) + ')'
          END
      ELSE
          [t1].[data_type]
      END AS 'data_type',
      [t1].[column_default],
      COLUMNPROPERTY(OBJECT_ID([t1].[table_schema] + '.' + [t1].[table_name]), [t1].[column_name], 'IsIdentity') AS is_identity,
      COLUMNPROPERTY(OBJECT_ID([t1].[table_schema] + '.' + [t1].[table_name]), [t1].[column_name], 'IsComputed') AS is_computed,
      (
          SELECT CONVERT(VARCHAR, [t2].[value])
          FROM [sys].[extended_properties] AS [t2]
          WHERE
            [t2].[class] = 1 AND
            [t2].[class_desc] = 'OBJECT_OR_COLUMN' AND
            [t2].[name] = 'MS_Description' AND
            [t2].[major_id] = OBJECT_ID([t1].[TABLE_SCHEMA] + '.' + [t1].[table_name]) AND
            [t2].[minor_id] = COLUMNPROPERTY(OBJECT_ID([t1].[TABLE_SCHEMA] + '.' + [t1].[TABLE_NAME]), [t1].[COLUMN_NAME], 'ColumnID')
      ) as comment
      FROM [INFORMATION_SCHEMA].[COLUMNS] AS [t1]
      WHERE [t1].[table_name] = ? AND [t1].[table_schema] = ?`,
    [table, schema || 'dbo']
  );

  return rows.map((col) => {
    const dbTypeRaw = col.type ? col.type.toLowerCase().split('(')[0] : 'text';
    const dbType = SQLSRV_TYPES[dbTypeRaw] || 'STRING';
    const type = GENERAL_TYPES[dbType.toUpperCase()] || 'string';

    return {
      name: col.column_name,
      allowNull: col.is_nullable == 'YES',
      autoIncrement: col.is_identity == 1,
      comment: col.comment || '',
      rawType: col.type,
      dbType,
      type,
      defaultValue: col.column_default || null,
      enumValues: [], // SQLite tidak punya enum
      isPrimaryKey: primaryKeys.indexOf(col.column_name) !== -1,
      precision: null,
      scale: null,
      size: null,
      unsigned: false,
    };
  });
}

async function listIndexes(knex, table, schema) {
  const rows = await knex('sys.indexes as i')
    .join('sys.index_columns as ic', function () {
      this.on('ic.object_id', '=', 'i.object_id').andOn(
        'ic.index_id',
        '=',
        'i.index_id'
      );
    })
    .join('sys.columns as iccol', function () {
      this.on('iccol.object_id', '=', 'ic.object_id').andOn(
        'iccol.column_id',
        '=',
        'ic.column_id'
      );
    })
    .select({
      name: 'i.name',
      column_name: 'iccol.name',
      index_is_unique: 'i.is_unique',
      index_is_primary: 'i.is_primary_key',
    })
    .whereRaw('i.object_id = OBJECT_ID(?)', [table])
    .orderBy('ic.key_ordinal', 'asc');

  return rows.map((row) => ({
    column_name: row.column_name,
    name: row.name,
    index_is_unique: row.index_is_unique == 1,
    index_is_primary: row.index_is_primary == 1,
  }));
}

async function listConstraints(knex, table, schema) {
  const rows = await knex.raw(
    `
      SELECT
        [fk].[name] AS [fk_name],
        [cp].[name] AS [fk_column_name],
        OBJECT_NAME([fk].[referenced_object_id]) AS [uq_table_name],
        [cr].[name] AS [uq_column_name]
      FROM [sys].[foreign_keys] AS [fk]
      INNER JOIN [sys].[foreign_key_columns] AS [fkc]
        ON [fk].[object_id] = [fkc].[constraint_object_id]
      INNER JOIN [sys].[columns] AS [cp]
        ON [fk].[parent_object_id] = [cp].[object_id]
        AND [fkc].[parent_column_id] = [cp].[column_id]
      INNER JOIN [sys].[columns] AS [cr]
        ON [fk].[referenced_object_id] = [cr].[object_id]
        AND [fkc].[referenced_column_id] = [cr].[column_id]
      WHERE [fk].[parent_object_id] = OBJECT_ID(?)
    `,
    [table]
  );

  return rows.map((row) => ({
    constraint_name: row.fk_name, // SQLite tidak punya nama constraint FK
    column_name: row.fk_column_name,
    referenced_table_name: row.uq_table_name,
    referenced_column_name: row.uq_column_name,
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
    .filter((idx) => idx.index_is_primary)
    .map((idx) => idx.column_name);

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
    indexes: indexes.filter((idx) => !idx.index_is_primary),
    columns,
  };
}

async function getDatabaseVersion(knex) {
  const rows = await knex.raw(
    `SELECT SERVERPROPERTY('ProductVersion') AS ProductVersion`
  );
  return rows[0].ProductVersion;
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
