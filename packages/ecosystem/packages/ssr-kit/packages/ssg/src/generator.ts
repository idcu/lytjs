import type { SSGConfig, SSGResult } from './types';

export class SSGGenerator {
  constructor(private config: SSGConfig) {}

  async generate(): Promise<SSGResult[]> {
    const results: SSGResult[] = [];
    
    for (const route of this.config.routes) {
      results.push(await this.generateRoute(route));
    }
    
    return results;
  }

  private async generateRoute(route: string): Promise<SSGResult> {
    return {
      route,
      outputPath: '',
      success: true,
    };
  }
}
