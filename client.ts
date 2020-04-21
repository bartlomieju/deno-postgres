import { Connection } from "./connection.ts";
import { ConnectionParams, IConnectionParams } from "./connection_params.ts";
import { EncodedArg } from "./encode.ts";
import { Query, QueryConfig, QueryResult } from "./query.ts";

export class Client {
  protected _connection: Connection;

  constructor(config?: IConnectionParams | string) {
    const connectionParams = new ConnectionParams(config);
    this._connection = new Connection(connectionParams);
  }

  async connect(): Promise<void> {
    await this._connection.startup();
    await this._connection.initSQL();
  }

  // TODO: can we use more specific type for args?
  async query(
    text: string | QueryConfig,
    ...args: any[]
  ): Promise<QueryResult> {
    const query = new Query(text, ...args);
    return await this._connection.query(query);
  }

  async transaction(
    text: string | string[],
    args?: unknown[],
    name?: string,
    encoder?: (arg: unknown) => EncodedArg,
  ): Promise<QueryResult[]> {
    if (!Array.isArray(text)) text = text.split(";").map((el) => el.trim());
    const result: QueryResult[] = [];
    for (const queryString of text) {
      result.push(await this.query(queryString));
    }

    return result;
  }

  async end(): Promise<void> {
    await this._connection.end();
  }

  // Support `using` module
  _aenter = this.connect;
  _aexit = this.end;
}

export class PoolClient {
  protected _connection: Connection;
  private _releaseCallback: () => void;

  constructor(connection: Connection, releaseCallback: () => void) {
    this._connection = connection;
    this._releaseCallback = releaseCallback;
  }

  async query(
    text: string | QueryConfig,
    ...args: any[]
  ): Promise<QueryResult> {
    const query = new Query(text, ...args);
    return await this._connection.query(query);
  }

  async release(): Promise<void> {
    await this._releaseCallback();
  }
}
