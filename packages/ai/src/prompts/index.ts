/**
 * Prompt 模板统一导出
 */

export {
  buttonComponentPrompt,
  inputComponentPrompt,
  selectComponentPrompt,
  basicComponentPrompt,
  formComponentPrompt,
  tableComponentPrompt,
  modalComponentPrompt,
  compositeComponentPrompt,
  customComponentPrompt,
  getComponentPrompt,
} from './component-prompts'

export {
  inlineCompletionPrompt,
  functionCompletionPrompt,
  componentCompletionPrompt,
  smartCompletionPrompt,
} from './code-prompts'

export {
  compileErrorFixPrompt,
  runtimeErrorFixPrompt,
  typeErrorFixPrompt,
  autoFixPrompt,
} from './fix-prompts'
