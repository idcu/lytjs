/**
 * 覆盖率口径的**单一真相源**（N01 / ADR 0028）。
 *
 * ## 为什么需要这个文件
 *
 * 仓内长期存在两个都叫「覆盖率」但分母不同的数字：
 *
 *   · `vitest.config.ts` 的棘轮阈值（lines 66.5 / functions 72.2 / branches 86.2）——
 *     分母是 `coverage.include` 展开后的**全部源码文件**，包含未被任何测试加载的文件。
 *   · `coverage/index.html` 显示的 87.91%——分母只含**已被插桩/加载的文件**。
 *
 * 两者相差约 21 个百分点，都不是错的，但混用会让「全仓覆盖率」变成假结论。
 * 本模块把「哪个数字对外有效」写成可被门禁校验的常量，生成侧与校验侧共用，
 * 避免再出现两处各写一遍口径说明而漂移。
 */

export const COVERAGE_BASIS = Object.freeze({
  // 对外唯一有效的口径：vitest 棘轮阈值
  authoritative: 'vitest-thresholds',
  authoritativeLabel:
    'coverage.include 全分母（棘轮 lines/statements 66.5、functions 72.2、branches 86.2）',
  // 仅用于本地排查，引用时必须显式标注口径
  auxiliary: 'instrumented-files',
  auxiliaryLabel: 'coverage/index.html 已插桩文件口径（如 87.91%，分母更窄，不可当作全仓覆盖率）',
  rule: '对外文档/报告只引用 authoritative；引用 auxiliary 必须逐处标注「已插桩文件口径」',
});

export const VALID_AUTHORITATIVE = Object.freeze(['vitest-thresholds']);
