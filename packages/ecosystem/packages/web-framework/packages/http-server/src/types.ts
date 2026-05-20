export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface Request {
  method: HttpMethod;
  url: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  ip?: string;
}

export interface Response {
  status: number;
  headers: Record<string, string | string[]>;
  body?: unknown;
}

export interface Context {
  request: Request;
  response: Response;
  [key: string]: unknown;
}

export type Handler = (ctx: Context) => Promise<void> | void;

export interface Route {
  method: HttpMethod;
  path: string;
  handler: Handler;
}
