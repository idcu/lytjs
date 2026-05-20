export interface Metadata {
  title?: string;
  description?: string;
  keywords?: string[];
  openGraph?: OpenGraphMetadata;
  twitter?: TwitterMetadata;
  [key: string]: unknown;
}

export interface OpenGraphMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
}

export interface TwitterMetadata {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
}
