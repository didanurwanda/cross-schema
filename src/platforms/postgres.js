import { versionCompare } from '../utils/helper.js';
import { GENERAL_TYPES, POSTGRES_MAP } from './types.js';

async function listDatabases(knex) {
  const result = await knex.raw(
    `SELECT datname FROM pg_database WHERE datistemplate = false;`
  );
  return result.rows.map((row) => row.datname);
}

async function listTables(knex, schema = 'public') {
  const rows = await knex('information_schema.tables')
    .select('table_name')
    .where('table_type', 'BASE TABLE')
    .andWhere('table_schema', schema);
  return rows.map((row) => row.table_name);
}

async function listViews(knex, schema = 'public') {
  const rows = await knex('information_schema.views')
    .select('table_name')
    .where('table_schema', schema);
  return rows.map((row) => row.table_name);
}

var sequenceName;
async function listColumns(knex, table, schema = 'public') {
  var orIdentity = '';
  if (versionCompare(await getDatabaseVersion(knex), '12.0', '>=')) {
    orIdentity = "OR attidentity != ''";
  }

  const result = await knex.raw(
    `SELECT
	d.nspname AS table_schema,
	C.relname AS table_name,
	A.attname AS column_name,
	COALESCE ( td.typname, tb.typname, T.typname ) AS data_type,
	COALESCE ( td.typtype, tb.typtype, T.typtype ) AS type_type,
	( SELECT nspname FROM pg_namespace WHERE OID = COALESCE ( td.typnamespace, tb.typnamespace, T.typnamespace ) ) AS type_scheme,
	A.attlen AS character_maximum_length,
	pg_catalog.col_description ( C.OID, A.attnum ) AS column_comment,
	A.atttypmod AS modifier,
	A.attnotnull = FALSE AS is_nullable,
	CAST ( pg_get_expr ( ad.adbin, ad.adrelid ) AS VARCHAR ) AS column_default,
	COALESCE ( pg_get_expr ( ad.adbin, ad.adrelid ) ~ 'nextval', FALSE ) ${orIdentity} AS is_autoinc,
	pg_get_serial_sequence ( quote_ident( d.nspname ) || '.' || quote_ident( C.relname ), A.attname ) AS sequence_name,
CASE
		
		WHEN COALESCE ( td.typtype, tb.typtype, T.typtype ) = 'e' :: CHAR THEN
		array_to_string( ( SELECT ARRAY_AGG ( enumlabel ) FROM pg_enum WHERE enumtypid = COALESCE ( td.OID, tb.OID, A.atttypid ) ) :: VARCHAR [], ',' ) ELSE NULL 
	END AS enum_values,
CASE
		atttypid 
		WHEN 21 /*int2*/
	THEN
			16 
			WHEN 23 /*int4*/
		THEN
				32 
				WHEN 20 /*int8*/
			THEN
					64 
					WHEN 1700 /*numeric*/
				THEN
					CASE
							
							WHEN atttypmod = - 1 THEN
							NULL ELSE ( ( atttypmod - 4 ) >> 16 ) & 65535 
						END 
							WHEN 700 /*float4*/
						THEN
								24 /*FLT_MANT_DIG*/
								
								WHEN 701 /*float8*/
							THEN
									53 /*DBL_MANT_DIG*/
								ELSE NULL 
								END AS numeric_precision,
							CASE
									
									WHEN atttypid IN ( 21, 23, 20 ) THEN
									0 
									WHEN atttypid IN ( 1700 ) THEN
								CASE
										
										WHEN atttypmod = - 1 THEN
										NULL ELSE ( atttypmod - 4 ) & 65535 
								END ELSE NULL 
								END AS numeric_scale,
								CAST ( information_schema._pg_char_max_length ( information_schema._pg_truetypid ( A, T ), information_schema._pg_truetypmod ( A, T ) ) AS NUMERIC ) AS size,
								A.attnum = ANY ( ct.conkey ) AS is_pkey,
								COALESCE ( NULLIF ( A.attndims, 0 ), NULLIF ( T.typndims, 0 ), ( T.typcategory = 'A' ) :: INT ) AS dimension 
							FROM
								pg_class
								C LEFT JOIN pg_attribute A ON A.attrelid = C.
								OID LEFT JOIN pg_attrdef ad ON A.attrelid = ad.adrelid 
								AND A.attnum = ad.adnum
								LEFT JOIN pg_type T ON A.atttypid = T.
								OID LEFT JOIN pg_type tb ON ( A.attndims > 0 OR T.typcategory = 'A' ) 
								AND T.typelem > 0 
								AND T.typelem = tb.OID 
								OR T.typbasetype > 0 
								AND T.typbasetype = tb.
								OID LEFT JOIN pg_type td ON T.typndims > 0 
								AND T.typbasetype > 0 
								AND tb.typelem = td.
								OID LEFT JOIN pg_namespace d ON d.OID = C.relnamespace
								LEFT JOIN pg_constraint ct ON ct.conrelid = C.OID 
								AND ct.contype = 'p' 
							WHERE
								A.attnum > 0 
								AND T.typname != '' 
								AND NOT A.attisdropped 
								AND C.relname = ?
								AND d.nspname = ?
                  ORDER BY
          	A.attnum`,
    [table, schema]
  );

  return result.rows.map((col) => {
    const dbTypeRaw = col.data_type.toLowerCase();
    const dbType = POSTGRES_MAP[dbTypeRaw] || 'STRING';
    const type = GENERAL_TYPES[dbType.toUpperCase()] || 'string';

    if (col.sequence_name != null) {
      sequenceName = col.sequence_name;
    }

    return {
      name: col.column_name,
      allowNull: !col.is_nullable,
      autoIncrement: col.is_autoinc || false,
      comment: col.column_comment || '',
      rawType: col.data_type,
      dbType,
      type,
      defaultValue: col.column_default || null,
      enumValues: col.enum_values ? col.enum_values.split(',') : null,
      isPrimaryKey: col.is_pkey || false,
      precision: col.numeric_precision || null,
      scale: col.numeric_scale || null,
      size: col.size || null,
      unsigned: false, // PostgreSQL doesn't support unsigned explicitly
    };
  });
}

async function listIndexes(knex, table, schema = 'public') {
  const result = await knex.raw(
    `
    SELECT
      i.relname AS index_name,
      a.attname AS column_name,
      ix.indisunique AS index_is_unique,
      ix.indisprimary AS index_is_primary
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relname = ?
      AND t.relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = ?
      )
  `,
    [table, schema]
  );

  return result.rows.map((row) => ({
    column_name: row.column_name,
    name: row.index_name,
    index_is_unique: row.index_is_unique,
    index_is_primary: row.index_is_primary,
  }));
}

async function listConstraints(knex, table, schema = 'public') {
  const result = await knex.raw(
    `
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS referenced_table_name,
      ccu.column_name AS referenced_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = ?
      AND tc.table_schema = ?
  `,
    [table, schema]
  );

  return result.rows;
}

async function getTableSchema(knex, table, schema = 'public') {
  const columns = await listColumns(knex, table, schema);
  const indexes = await listIndexes(knex, table, schema);
  const foreignKeys = await listConstraints(knex, table, schema);

  const primaryKeys = indexes
    .filter((idx) => idx.index_is_primary)
    .map((idx) => idx.column_name);

  for (const col of columns) {
    if (primaryKeys.includes(col.name)) {
      col.isPrimaryKey = true;
    }
  }

  return {
    schemaName: schema,
    tableName: table,
    primaryKeys,
    sequenceName,
    foreignKeys,
    indexes: indexes.filter((idx) => !idx.index_is_primary),
    columns,
  };
}

async function getDatabaseVersion(knex) {
  const result = await knex.raw(
    "SELECT substring(version() from 'PostgreSQL ([0-9.]+)') AS version_number"
  );
  return result.rows[0].version_number;
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
