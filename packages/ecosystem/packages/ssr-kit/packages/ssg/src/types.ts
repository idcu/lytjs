export interface SSGConfig {
  routes: string[];
  outputDir: string;
  template?: string;
}

export interface SSGResult {
  route: string;
  outputPath: string;
  success: boolean;
  error?: Error;
}
