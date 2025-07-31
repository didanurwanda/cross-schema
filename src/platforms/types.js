// types.js
export const MYSQL_MAP = {
  tinyint: 'TINYINT',
  bool: 'TINYINT',
  boolean: 'TINYINT',
  bit: 'INTEGER',
  smallint: 'SMALLINT',
  mediumint: 'INTEGER',
  int: 'INTEGER',
  integer: 'INTEGER',
  bigint: 'BIGINT',
  float: 'FLOAT',
  double: 'DOUBLE',
  'double precision': 'DOUBLE',
  real: 'FLOAT',
  decimal: 'DECIMAL',
  numeric: 'DECIMAL',
  dec: 'DECIMAL',
  fixed: 'DECIMAL',
  tinytext: 'TEXT',
  mediumtext: 'TEXT',
  longtext: 'TEXT',
  longblob: 'BINARY',
  blob: 'BINARY',
  text: 'TEXT',
  varchar: 'STRING',
  string: 'STRING',
  char: 'CHAR',
  datetime: 'DATETIME',
  year: 'DATE',
  date: 'DATE',
  time: 'TIME',
  timestamp: 'TIMESTAMP',
  enum: 'STRING',
  set: 'STRING',
  binary: 'BINARY',
  varbinary: 'BINARY',
  json: 'JSON',
};
export const SQLITE_MAP = {
  text: 'TEXT',
  varchar: 'TEXT',
  char: 'TEXT',
  int: 'INTEGER',
  integer: 'INTEGER',
  real: 'REAL',
  blob: 'BLOB',
  numeric: 'NUMERIC',
};
export const POSTGRES_MAP = {
  bit: 'INTEGER',
  'bit varying': 'INTEGER',
  varbit: 'INTEGER',

  bool: 'BOOLEAN',
  boolean: 'BOOLEAN',

  box: 'STRING',
  circle: 'STRING',
  point: 'STRING',
  line: 'STRING',
  lseg: 'STRING',
  polygon: 'STRING',
  path: 'STRING',

  character: 'CHAR',
  char: 'CHAR',
  bpchar: 'CHAR',
  'character varying': 'STRING',
  varchar: 'STRING',
  text: 'TEXT',

  bytea: 'BINARY',

  cidr: 'STRING',
  inet: 'STRING',
  macaddr: 'STRING',

  real: 'FLOAT',
  float4: 'FLOAT',
  'double precision': 'DOUBLE',
  float8: 'DOUBLE',
  decimal: 'DECIMAL',
  numeric: 'DECIMAL',

  money: 'MONEY',

  smallint: 'SMALLINT',
  int2: 'SMALLINT',
  int4: 'INTEGER',
  int: 'INTEGER',
  integer: 'INTEGER',
  bigint: 'BIGINT',
  int8: 'BIGINT',
  oid: 'BIGINT',

  smallserial: 'SMALLINT',
  serial2: 'SMALLINT',
  serial4: 'INTEGER',
  serial: 'INTEGER',
  bigserial: 'BIGINT',
  serial8: 'BIGINT',
  pg_lsn: 'BIGINT',

  date: 'DATE',
  interval: 'STRING',
  'time without time zone': 'TIME',
  time: 'TIME',
  'time with time zone': 'TIME',
  timetz: 'TIME',
  'timestamp without time zone': 'TIMESTAMP',
  timestamp: 'TIMESTAMP',
  'timestamp with time zone': 'TIMESTAMP',
  timestamptz: 'TIMESTAMP',
  abstime: 'TIMESTAMP',

  tsquery: 'STRING',
  tsvector: 'STRING',
  txid_snapshot: 'STRING',

  unknown: 'STRING',

  uuid: 'STRING',
  json: 'JSON',
  jsonb: 'JSON',
  xml: 'STRING',
};
export const SQLSRV_TYPES = {
  // exact numbers
  BIGINT: 'BIGINT',
  numeric: 'DECIMAL',
  bit: 'SMALLINT',
  smallint: 'SMALLINT',
  decimal: 'DECIMAL',
  smallmoney: 'MONEY',
  int: 'INTEGER',
  tinyint: 'TINYINT',
  money: 'MONEY',

  // approximate numbers
  float: 'FLOAT',
  double: 'DOUBLE',
  real: 'FLOAT',

  // date and time
  date: 'DATE',
  datetimeoffset: 'DATETIME',
  datetime2: 'DATETIME',
  smalldatetime: 'DATETIME',
  datetime: 'DATETIME',
  time: 'TIME',

  // character strings
  char: 'CHAR',
  varchar: 'STRING',
  text: 'TEXT',

  // unicode character strings
  nchar: 'CHAR',
  nvarchar: 'STRING',
  ntext: 'TEXT',

  // binary strings
  binary: 'BINARY',
  varbinary: 'BINARY',
  image: 'BINARY',

  // other data types
  // 'cursor' type cannot be used with tables
  timestamp: 'TIMESTAMP',
  hierarchyid: 'STRING',
  uniqueidentifier: 'STRING',
  sql_variant: 'STRING',
  xml: 'STRING',
  table: 'STRING',
};
export const GENERAL_TYPES = {
  integer: ['TINYINT', 'SMALLINT', 'INTEGER', 'BIGINT'],
  boolean: ['BOOLEAN'],
  double: ['FLOAT', 'DOUBLE', 'DECIMAL'],
  string: ['STRING', 'TEXT', 'CHAR'],
  resource: ['BINARY'],
  array: ['JSON'],
};
