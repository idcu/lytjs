export interface AuthUser {
  id: string | number;
  [key: string]: unknown;
}

export interface AuthOptions {
  authenticate: (token: string) => Promise<AuthUser | null>;
  headerName?: string;
}
