/**
 * 元数据构建器
 */
import type { Metadata, OpenGraphMetadata, TwitterMetadata } from '@lytjs/shared-types';

/**
 * 元数据构建器类
 */
export class MetadataBuilder {
  /** 元数据对象 */
  private metadata: Metadata = {};

  /**
   * 设置标题
   * 
   * @param title - 标题
   * @returns 构建器实例
   */
  title(title: string): this {
    this.metadata.title = title;
    return this;
  }

  /**
   * 设置描述
   * 
   * @param description - 描述
   * @returns 构建器实例
   */
  description(description: string): this {
    this.metadata.description = description;
    return this;
  }

  /**
   * 设置关键词
   * 
   * @param keywords - 关键词数组
   * @returns 构建器实例
   */
  keywords(keywords: string[]): this {
    this.metadata.keywords = keywords;
    return this;
  }

  /**
   * 设置 Open Graph 元数据
   * 
   * @param og - Open Graph 元数据
   * @returns 构建器实例
   */
  openGraph(og: OpenGraphMetadata): this {
    this.metadata.openGraph = { ...this.metadata.openGraph, ...og };
    return this;
  }

  /**
   * 设置 Twitter 元数据
   * 
   * @param twitter - Twitter 元数据
   * @returns 构建器实例
   */
  twitter(twitter: TwitterMetadata): this {
    this.metadata.twitter = { ...this.metadata.twitter, ...twitter };
    return this;
  }

  /**
   * 设置自定义属性
   * 
   * @param key - 键
   * @param value - 值
   * @returns 构建器实例
   */
  set(key: string, value: unknown): this {
    this.metadata[key] = value;
    return this;
  }

  /**
   * 构建元数据
   * 
   * @returns 元数据对象
   */
  build(): Metadata {
    return { ...this.metadata };
  }
}

/**
 * 创建元数据构建器
 * 
 * @returns 构建器实例
 */
export function createMetadataBuilder(): MetadataBuilder {
  return new MetadataBuilder();
}
