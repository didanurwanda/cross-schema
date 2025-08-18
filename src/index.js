import mysql from './platforms/mysql.js';
import postgres from './platforms/postgres.js';
import sqlite from './platforms/sqlite.js';
import sqlsrv from './platforms/sqlsrv.js';

class CrossSchema {
  /**
   * Constructs a new CrossSchema instance.
   *
   * @param {Object} config - The configuration object.
   * @param {'mysql'|'pgsql'|'sqlite'|'sqlsrv'} config.platform - The platform to use.
   * @param {Knex} config.client - The Knex client instance.
   */
  constructor(platform, client) {
    const platformMap = {
      mysql2: 'mysql',
      mariadb: 'mysql',
      pg: 'postgres',
      pgsql: 'postgres',
      'pg-native': 'postgres',
      mssql: 'sqlsrv',
      sqlserver: 'sqlsrv',
      tedious: 'sqlsrv',
      sqlsrv: 'sqlsrv',
      sqlite3: 'sqlite',
      'better-sqlite3': 'sqlite',
    };

    this.platform = platformMap[platform] || platform;
    this.client = client;
    this.driver = null;
  }

  /**
   * Internal method to load the driver for the given platform
   * @private
   * @throws {Error} if the platform is unsupported
   */
  async _loadDriver() {
    if (!this.driver) {
      try {
        if (!this.platform) {
          throw new Error('No platform specified');
        } else if (this.platform === 'mysql') {
          this.driver = mysql;
        } else if (this.platform === 'postgres') {
          this.driver = postgres;
        } else if (this.platform === 'sqlite') {
          this.driver = sqlite;
        } else if (this.platform === 'sqlsrv') {
          this.driver = sqlsrv;
        } else {
          throw new Error(`Unsupported platform: ${this.platform}`);
        }
      } catch {
        throw new Error(`Unsupported platform: ${this.platform}`);
      }
    }
  }

  /**
   * Get a list of databases in the given connection
   * @return {Promise<string[]>} a list of database names
   * @throws {Error} if `listDatabases` is not implemented for the given platform
   */
  async listDatabases() {
    await this._loadDriver();
    return (
      this.driver.listDatabases?.(this.client) ??
      Promise.reject(
        new Error(`listDatabases not implemented for ${this.platform}`)
      )
    );
  }

  /**
   * Get a list of tables in the specified schema
   * @param {string} schema - The schema name to list tables from
   * @return {Promise<string[]>} a list of table names
   * @throws {Error} if the driver fails to load
   */
  async listTables(schema) {
    await this._loadDriver();
    return this.driver.listTables(this.client, schema);
  }

  /**
   * Get a list of views in the specified schema
   * @param {string} schema - The schema name to list views from
   * @return {Promise<string[]>} a list of view names
   * @throws {Error} if the driver fails to load or listViews is not implemented for the given platform
   */
  async listViews(schema) {
    await this._loadDriver();
    return (
      this.driver.listViews?.(this.client, schema) ??
      Promise.reject(
        new Error(`listViews not implemented for ${this.platform}`)
      )
    );
  }

  /**
   * Retrieves detailed information about all columns in a given table.
   *
   * This method queries the underlying database driver for the column definitions of a table
   * and returns a normalized array of column metadata. The output format is unified across different
   * database platforms (MySQL, PostgreSQL, SQLite, SQL Server) to make schema inspection easier.
   *
   * @param {string} table - The name of the table whose columns should be listed.
   * @param {string} [schema] - Optional schema name (useful for PostgreSQL or SQL Server).
   * @returns {Promise<Array<{
   *   name: string,
   *   allowNull: boolean,
   *   autoIncrement: boolean,
   *   comment: string,
   *   rawType: string,
   *   dbType: string,
   *   defaultValue: any,
   *   enumValues: string[],
   *   isPrimaryKey: boolean,
   *   type: string,
   *   precision: number|null,
   *   scale: number|null,
   *   size: number|null,
   *   unsigned: boolean
   * }>>} A promise that resolves to an array of column metadata objects.
   *
   * @example
   * const columns = await cs.listColumns('users');
   * console.log(columns[0].name); // e.g., "id"
   */
  async listColumns(table, schema) {
    await this._loadDriver();
    return this.driver.listColumns(this.client, table, schema);
  }

  /**
   * Retrieves index definitions from the specified table and schema.
   *
   * This function returns metadata about the indexes available in a given table,
   * including information such as the index name, the column it refers to,
   * and whether it is unique or a primary key.
   *
   * The structure is normalized to be consistent across supported platforms
   * such as MySQL, PostgreSQL, SQLite, and SQL Server.
   *
   * @param {string} table - The name of the table to inspect.
   * @param {string} [schema] - The optional schema name (relevant for some databases like PostgreSQL).
   * @returns {Promise<Array<{
   *   name: string,              // Index name defined in the database
   *   column_name: string,       // Column name the index refers to
   *   index_is_unique: boolean,  // Whether the index enforces uniqueness
   *   index_is_primary: boolean  // Whether the index is the primary key
   * }>>} A promise resolving to an array of index definitions.
   *
   * @example
   * const indexes = await crossSchema.listIndexes('users');
   * indexes.forEach(i => console.log(i.name));
   */
  async listIndexes(table, schema) {
    await this._loadDriver();
    return (
      this.driver.listIndexes?.(this.client, table, schema) ??
      Promise.reject(
        new Error(`listIndexes not implemented for ${this.platform}`)
      )
    );
  }

  /**
   * Retrieves foreign key constraints from a specific table.
   *
   * This method returns an array of foreign key definitions for a given table,
   * including the local column name, the name of the foreign table, and the foreign column name.
   * It is especially useful when analyzing or generating relationships across tables,
   * such as when building ER diagrams or generating ORM models.
   *
   * The structure of each constraint object includes:
   *
   * - `constraintName` (string): The name of the foreign key constraint in the database.
   * - `columnName` (string): The column in the current table that holds the foreign key.
   * - `referencedTableName` (string): The name of the table being referenced.
   * - `referencedColumnName` (string): The specific column in the foreign table being referenced.
   *
   * If the current database platform or driver does not support foreign key inspection,
   * this method will throw a descriptive error instead of returning a result.
   *
   * Example output:
   * ```json
   * [
   *   {
   *     constraintName: "fk_role_has_permissions_permission_id",
   *     columnName: "permission_id",
   *     referencedTableName: "permissions",
   *     referencedColumnName: "id"
   *   },
   *   {
   *     constraintName: "fk_role_has_permissions_role_id",
   *     columnName: "role_id",
   *     referencedTableName: "roles",
   *     referencedColumnName: "id"
   *   }
   * ]
   * ```
   *
   * @param {string} table - The name of the table to inspect.
   * @param {string} [schema] - Optional schema name (used in databases like PostgreSQL or SQL Server).
   * @returns {Promise<Array<{
   *   constraintName: string,
   *   columnName: string,
   *   referencedTableName: string,
   *   referencedColumnName: string
   * }>>}
   */
  async listConstraints(table, schema) {
    await this._loadDriver();
    return (
      this.driver.listConstraints?.(this.client, table, schema) ??
      Promise.reject(
        new Error(`listConstraints not implemented for ${this.platform}`)
      )
    );
  }

  /**
   * Retrieves the complete schema definition for a specific table, including:
   * - Column metadata (name, type, size, nullability, default, enum, etc.)
   * - Primary key(s)
   * - Auto-increment column
   * - Foreign keys (if any)
   *
   * This is a comprehensive introspection function that gives a structured overview
   * of a table’s layout in the connected database platform.
   *
   * @param {string} table - The name of the table whose schema will be retrieved.
   * @param {string} [schema] - Optional schema name. Used in platforms that support multiple schemas (e.g., PostgreSQL).
   * @returns {Promise<{
   *   schemaName: string,
   *   tableName: string,
   *   primaryKeys: string[],
   *   sequenceName?: string,
   *   foreignKeys: Array<any>,
   *   columns: Array<{
   *     name: string,
   *     allowNull: boolean,
   *     autoIncrement: boolean,
   *     comment: string,
   *     rawType: string,
   *     dbType: string,
   *     defaultValue: any,
   *     enumValues: string[],
   *     isPrimaryKey: boolean,
   *     type: string,
   *     precision: number|null,
   *     scale: number|null,
   *     size: number|null,
   *     unsigned: boolean
   *   }>
   * }>} - A promise that resolves to the schema structure of the specified table.
   * @throws {Error} If the method is not implemented for the current platform.
   */
  async getTableSchema(table, schema) {
    await this._loadDriver();
    return (
      this.driver.getTableSchema?.(this.client, table, schema) ??
      Promise.reject(
        new Error(`getTableSchema not implemented for ${this.platform}`)
      )
    );
  }

  /**
   * Get the version of the connected database
   * @return {Promise<string>} the database version
   * @throws {Error} if the driver fails to load or getDatabaseVersion is not implemented for the given platform
   */
  async getDatabaseVersion() {
    await this._loadDriver();
    return (
      this.driver.getDatabaseVersion?.(this.client) ??
      Promise.reject(
        new Error(`getDatabaseVersion not implemented for ${this.platform}`)
      )
    );
  }
}

export default CrossSchema;
