
// 简单的测试文件来验证测试运行器

// 注意：不需要导入任何东西，测试函数已经全局暴露

describe('测试运行器', () => {
  it('基础算术', () => {
    expect(1 + 1).toBe(2)
  })

  it('数组操作', () => {
    const arr = [1, 2, 3]
    expect(arr).toContain(2)
    expect(arr).toHaveLength(3)
  })
})

