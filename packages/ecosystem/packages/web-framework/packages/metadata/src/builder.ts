import type { Metadata, OpenGraphMetadata, TwitterMetadata } from './types';

export class MetadataBuilder {
  private metadata: Metadata = {};

  title(title: string): this {
    this.metadata.title = title;
    return this;
  }

  description(description: string): this {
    this.metadata.description = description;
    return this;
  }

  keywords(keywords: string[]): this {
    this.metadata.keywords = keywords;
    return this;
  }

  openGraph(og: OpenGraphMetadata): this {
    this.metadata.openGraph = { ...this.metadata.openGraph, ...og };
    return this;
  }

  twitter(twitter: TwitterMetadata): this {
    this.metadata.twitter = { ...this.metadata.twitter, ...twitter };
    return this;
  }

  set(key: string, value: unknown): this {
    this.metadata[key] = value;
    return this;
  }

  build(): Metadata {
    return { ...this.metadata };
  }
}

export function createMetadataBuilder(): MetadataBuilder {
  return new MetadataBuilder();
}
