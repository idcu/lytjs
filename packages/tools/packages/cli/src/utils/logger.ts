/**
 * @lytjs/cli - Logger utilities
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  if (!isColorSupported()) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

export const logger = {
  info(message: string): void {
    // eslint-disable-next-line no-console
    console.log(colorize('ℹ ', 'blue') + message);
  },

  success(message: string): void {
    // eslint-disable-next-line no-console
    console.log(colorize('✔ ', 'green') + message);
  },

  warning(message: string): void {
    // eslint-disable-next-line no-console
    console.log(colorize('⚠ ', 'yellow') + message);
  },

  error(message: string): void {
    console.error(colorize('✖ ', 'red') + message);
  },

  dim(message: string): void {
    // eslint-disable-next-line no-console
    console.log(colorize(message, 'dim'));
  },

  bold(message: string): string {
    return colorize(message, 'bright');
  },

  /**
   * 打印加粗标题。
   *
   * 注意：`bold()` 只**返回**字符串、不打印。此前 create.ts / plugin.ts 有 4 处
   * 直接写 `logger.bold('Next steps:')`，等于什么都没输出（小标题长期静默丢失）。
   * 需要打印标题请用本方法。
   */
  heading(message: string): void {
    // eslint-disable-next-line no-console
    console.log(colorize(message, 'bright'));
  },
};

/**
 * Check if terminal supports colors
 */
export function isColorSupported(): boolean {
  return process.stdout.isTTY && process.env.NO_COLOR !== '1';
}
