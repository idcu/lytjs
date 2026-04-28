/**
 * Tree 树形
 * Props: data, emptyText, nodeKey, props, renderAfterExpand, expandOnClickNode, defaultExpandAll, expandOnClickNode, checkOnClickNode, autoExpandParent, defaultExpandedKeys, defaultCheckedKeys, defaultCheckedKeys, currentNodeKey, accordion, indent, showCheckbox, nodeClass, highlightCurrent
 * Events: node-click, node-contextmenu, check-change, check, current-change, node-expand, node-collapse, node-drag-start, node-drag-enter, node-drag-leave, node-drag-over, node-drag-end, node-drop
 */

import { defineComponent } from '@lytjs/component'
import { reactive, watch, computed } from '@lytjs/reactivity'

export interface TreeData {
  id?: string | number
  label?: string
  children?: TreeData[]
  disabled?: boolean
  isLeaf?: boolean
  [key: string]: any
}

export interface TreeNode {
  id: string | number
  label: string
  children?: TreeNode[]
  expanded: boolean
  checked: boolean
  indeterminate: boolean
  disabled: boolean
  isLeaf: boolean
  level: number
  parent?: TreeNode
  data: any
}

export const Tree = defineComponent({
  name: 'LytTree',

  props: {
    data: {
      type: Array as () => TreeData[],
      default: () => [],
    },
    emptyText: {
      type: String,
      default: '暂无数据',
    },
    nodeKey: {
      type: String,
      default: 'id',
    },
    props: {
      type: Object as () => { label?: string; children?: string; disabled?: string; isLeaf?: string },
      default: () => ({}),
    },
    expandOnClickNode: {
      type: Boolean,
      default: true,
    },
    checkOnClickNode: {
      type: Boolean,
      default: false,
    },
    autoExpandParent: {
      type: Boolean,
      default: true,
    },
    defaultExpandAll: {
      type: Boolean,
      default: false,
    },
    defaultExpandedKeys: {
      type: Array as () => Array<string | number>,
      default: () => [],
    },
    defaultCheckedKeys: {
      type: Array as () => Array<string | number>,
      default: () => [],
    },
    currentNodeKey: {
      type: [String, Number],
      default: undefined,
    },
    accordion: {
      type: Boolean,
      default: false,
    },
    indent: {
      type: Number,
      default: 16,
    },
    showCheckbox: {
      type: Boolean,
      default: false,
    },
    highlightCurrent: {
      type: Boolean,
      default: false,
    },
    filterNodeMethod: {
      type: Function as unknown as () => (value: string, data: any, node: TreeNode) => boolean,
      default: undefined,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      treeNodes: [] as TreeNode[],
      expandedKeys: new Set(props.defaultExpandedKeys),
      checkedKeys: new Set(props.defaultCheckedKeys),
      currentKey: props.currentNodeKey as string | number | undefined,
      levelCounter: 0,
    })

    const getLabelKey = () => props.props.label || 'label'
    const getChildrenKey = () => props.props.children || 'children'
    const getDisabledKey = () => props.props.disabled || 'disabled'
    const getIsLeafKey = () => props.props.isLeaf || 'isLeaf'

    const buildTreeNode = (data: TreeData, parent?: TreeNode, level = 0): TreeNode => {
      const nodeKey = data[props.nodeKey] || `node-${state.levelCounter++}`
      const hasChildren = !!data[getChildrenKey()]?.length
      const isLeaf = data[getIsLeafKey()] ?? !hasChildren

      const node: TreeNode = {
        id: nodeKey,
        label: data[getLabelKey()],
        children: hasChildren ? [] : undefined,
        expanded: state.expandedKeys.has(nodeKey) || props.defaultExpandAll || !!parent?.expanded,
        checked: state.checkedKeys.has(nodeKey),
        indeterminate: false,
        disabled: !!data[getDisabledKey()],
        isLeaf,
        level,
        parent,
        data,
      }

      if (hasChildren) {
        data[getChildrenKey()].forEach((childData: TreeData) => {
          const childNode = buildTreeNode(childData, node, level + 1)
          node.children?.push(childNode)
        })
      }

      return node
    }

    const buildTree = () => {
      state.treeNodes = props.data.map((item: TreeData) => buildTreeNode(item))
      updateCheckStatus()
    }

    const getAllDescendantKeys = (node: TreeNode): Array<string | number> => {
      const keys: Array<string | number> = []
      const collect = (n: TreeNode) => {
        keys.push(n.id)
        if (n.children) {
          n.children.forEach(collect)
        }
      }
      if (node.children) {
        node.children.forEach(collect)
      }
      return keys
    }

    const updateCheckStatus = () => {
      const updateNode = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            updateNode(node.children)
            const checkedCount = node.children.filter((c) => c.checked).length
            const indeterminateCount = node.children.filter((c) => c.indeterminate).length
            node.checked = checkedCount === node.children.length
            node.indeterminate = checkedCount > 0 && checkedCount < node.children.length || indeterminateCount > 0
          }
        })
      }

      updateNode(state.treeNodes)
    }

    const findNode = (nodes: TreeNode[], key: string | number): TreeNode | undefined => {
      for (const node of nodes) {
        if (node.id === key) return node
        if (node.children) {
          const found = findNode(node.children, key)
          if (found) return found
        }
      }
      return undefined
    }

    const toggleExpand = (node: TreeNode) => {
      if (node.disabled) return

      if (props.accordion && node.parent) {
        const siblings = node.parent.children
        if (siblings) {
          siblings.forEach((s) => {
            if (s.id !== node.id) {
              s.expanded = false
              state.expandedKeys.delete(s.id)
            }
          })
        }
      }

      node.expanded = !node.expanded
      if (node.expanded) {
        state.expandedKeys.add(node.id)
        emit('node-expand', node.data, node)
      } else {
        state.expandedKeys.delete(node.id)
        emit('node-collapse', node.data, node)
      }
    }

    const toggleCheck = (node: TreeNode) => {
      if (node.disabled) return

      node.checked = !node.checked
      node.indeterminate = false

      if (node.checked) {
        state.checkedKeys.add(node.id)
        const setChildrenChecked = (nodes: TreeNode[]) => {
          nodes.forEach((n) => {
            if (!n.disabled) {
              n.checked = true
              n.indeterminate = false
              state.checkedKeys.add(n.id)
              if (n.children) setChildrenChecked(n.children)
            }
          })
        }
        if (node.children) setChildrenChecked(node.children)
      } else {
        state.checkedKeys.delete(node.id)
        const setChildrenUnchecked = (nodes: TreeNode[]) => {
          nodes.forEach((n) => {
            n.checked = false
            n.indeterminate = false
            state.checkedKeys.delete(n.id)
            if (n.children) setChildrenUnchecked(n.children)
          })
        }
        if (node.children) setChildrenUnchecked(node.children)
      }

      updateCheckStatus()

      const getCheckedKeys = (): Array<string | number> => {
        const keys: Array<string | number> = []
        const collect = (nodes: TreeNode[]) => {
          nodes.forEach((n) => {
            if (n.checked) keys.push(n.id)
            if (n.children) collect(n.children)
          })
        }
        collect(state.treeNodes)
        return keys
      }

      emit('check-change', node.data, node.checked, node.indeterminate)
      emit('check', node.data, { checkedKeys: getCheckedKeys(), halfCheckedKeys: [] })
    }

    const handleNodeClick = (node: TreeNode) => {
      state.currentKey = node.id
      emit('node-click', node.data, node)

      if (props.expandOnClickNode && !node.isLeaf) {
        toggleExpand(node)
      }

      if (props.checkOnClickNode && props.showCheckbox) {
        toggleCheck(node)
      }

      emit('current-change', node.data, node)
    }

    const setCurrentKey = (key: string | number) => {
      state.currentKey = key
      const node = findNode(state.treeNodes, key)
      if (node) {
        emit('current-change', node.data, node)
      }
    }

    const setCheckedKeys = (keys: Array<string | number>) => {
      state.checkedKeys = new Set(keys)
      const updateNodes = (nodes: TreeNode[]) => {
        nodes.forEach((n) => {
          n.checked = state.checkedKeys.has(n.id)
          n.indeterminate = false
          if (n.children) updateNodes(n.children)
        })
      }
      updateNodes(state.treeNodes)
      updateCheckStatus()
    }

    const setExpandedKeys = (keys: Array<string | number>) => {
      state.expandedKeys = new Set(keys)
      const updateNodes = (nodes: TreeNode[]) => {
        nodes.forEach((n) => {
          n.expanded = state.expandedKeys.has(n.id)
          if (n.children) updateNodes(n.children)
        })
      }
      updateNodes(state.treeNodes)
    }

    const filter = (query: string) => {
      if (!props.filterNodeMethod || !query) {
        buildTree()
        return
      }

      const filterNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.filter((node) => {
          const match = props.filterNodeMethod!(query, node.data, node)
          if (match) {
            if (node.children) {
              node.expanded = true
            }
            return true
          }
          if (node.children) {
            const filteredChildren = filterNode(node.children)
            if (filteredChildren.length > 0) {
              node.expanded = true
              return true
            }
          }
          return false
        })
      }

      state.treeNodes = filterNode(state.treeNodes)
    }

    /**
     * 递归渲染单个树节点的 HTML 字符串
     * 通过 v-html 渲染，配合事件委托处理交互
     */
    const renderTreeNode = (node: TreeNode): string => {
      const nodeId = String(node.id)
      const isCurrent = state.currentKey === node.id
      const paddingLeft = 8 + node.level * props.indent

      // 节点 class
      const nodeClasses = [
        'lyt-tree-node',
        isCurrent ? 'lyt-tree-node--current' : '',
      ].filter(Boolean).join(' ')

      // 内容区 class
      const contentClasses = 'lyt-tree-node-content'

      // 展开图标
      let expandHtml = ''
      if (!node.isLeaf) {
        const expandClasses = [
          'lyt-tree-node-expand',
          node.expanded ? 'lyt-tree-node-expand--expanded' : '',
        ].filter(Boolean).join(' ')
        expandHtml = `<span class="${expandClasses}" data-node-id="${nodeId}" data-action="expand">&#9654;</span>`
      } else {
        expandHtml = '<span class="lyt-tree-node-expand-placeholder"></span>'
      }

      // 复选框
      let checkboxHtml = ''
      if (props.showCheckbox) {
        const checkboxClasses = [
          'lyt-tree-node-checkbox',
          node.checked ? 'lyt-tree-node-checkbox--checked' : '',
          node.indeterminate ? 'lyt-tree-node-checkbox--indeterminate' : '',
          node.disabled ? 'lyt-tree-node-checkbox--disabled' : '',
        ].filter(Boolean).join(' ')

        let checkIcon = '&#9744;' // ☐
        if (node.checked) checkIcon = '&#9745;' // ☑
        else if (node.indeterminate) checkIcon = '&#9638;' // ▣

        checkboxHtml = `<span class="${checkboxClasses}" data-node-id="${nodeId}" data-action="check"><span>${checkIcon}</span></span>`
      }

      // 子节点 HTML（递归）
      let childrenHtml = ''
      if (node.children && node.children.length > 0 && node.expanded) {
        const childItems = node.children.map(child => renderTreeNode(child)).join('')
        childrenHtml = `<div class="lyt-tree-node-children">${childItems}</div>`
      }

      // 组装完整节点
      return `<div class="${nodeClasses}" data-node-id="${nodeId}">` +
        `<div class="${contentClasses}" style="padding-left: ${paddingLeft}px" data-node-id="${nodeId}" data-action="click">` +
          expandHtml +
          checkboxHtml +
          `<span class="lyt-tree-node-label">${node.label}</span>` +
        `</div>` +
        childrenHtml +
      `</div>`
    }

    /**
     * 计算整棵树的 HTML（computed，响应式更新）
     */
    const treeHtml = computed(() => {
      if (state.treeNodes.length === 0) return ''
      return state.treeNodes.map(node => renderTreeNode(node)).join('')
    })

    /**
     * 事件委托处理函数
     * 在根容器上统一监听 click 事件，通过 data-action 和 data-node-id 识别操作
     */
    const handleTreeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // 向上查找最近的带有 data-action 的元素
      const actionEl = target.closest('[data-action]') as HTMLElement | null
      if (!actionEl) return

      const action = actionEl.getAttribute('data-action')
      const nodeId = actionEl.getAttribute('data-node-id')
      if (!action || !nodeId) return

      const node = findNode(state.treeNodes, nodeId)
      if (!node) return

      switch (action) {
        case 'expand':
          e.stopPropagation()
          toggleExpand(node)
          break
        case 'check':
          e.stopPropagation()
          toggleCheck(node)
          break
        case 'click':
          handleNodeClick(node)
          break
      }
    }

    watch(() => props.data, buildTree, { deep: true, immediate: true })
    watch(() => props.defaultExpandedKeys, (val) => {
      state.expandedKeys = new Set(val)
    })
    watch(() => props.defaultCheckedKeys, (val) => {
      state.checkedKeys = new Set(val)
      buildTree()
    })
    watch(() => props.currentNodeKey, (val) => {
      state.currentKey = val
    })

    return {
      props, state,
      toggleExpand, toggleCheck, handleNodeClick,
      findNode, setCurrentKey, setCheckedKeys, setExpandedKeys, filter,
      getLabelKey, getChildrenKey,
      slots,
      treeHtml,
      handleTreeClick,
    }
  },

  template: `
    <div class="lyt-tree" @click="handleTreeClick">
      <div v-if="state.treeNodes.length === 0" class="lyt-tree-empty">{{ emptyText }}</div>
      <div v-else v-html="treeHtml"></div>
    </div>
  `,

  styles: `
    .lyt-tree {
      font-size: 14px;
      color: var(--lyt-color-muted);
      user-select: none;
    }
    .lyt-tree-empty {
      padding: 16px;
      color: var(--lyt-color-muted);
      text-align: center;
    }
    .lyt-tree-node {
      padding: 4px 0;
    }
    .lyt-tree-node-content {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .lyt-tree-node-content:hover {
      background-color: var(--lyt-color-bg);
    }
    .lyt-tree-node--current .lyt-tree-node-content {
      background-color: rgba(64, 158, 255, 0.1);
      color: var(--lyt-color-primary);
    }
    .lyt-tree-node-expand {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      font-size: 12px;
      color: var(--lyt-color-muted);
      cursor: pointer;
      transition: transform 0.2s;
    }
    .lyt-tree-node-expand:hover {
      color: var(--lyt-color-primary);
    }
    .lyt-tree-node-expand--expanded {
      transform: rotate(90deg);
    }
    .lyt-tree-node-expand-placeholder {
      width: 20px;
      height: 20px;
    }
    .lyt-tree-node-checkbox {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      font-size: 16px;
      color: var(--lyt-color-border);
      cursor: pointer;
      transition: color 0.2s;
    }
    .lyt-tree-node-checkbox:hover {
      color: var(--lyt-color-primary);
    }
    .lyt-tree-node-checkbox--checked {
      color: var(--lyt-color-primary);
    }
    .lyt-tree-node-checkbox--indeterminate {
      color: var(--lyt-color-primary);
    }
    .lyt-tree-node-checkbox--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lyt-tree-node-label {
      flex: 1;
    }
    .lyt-tree-node-children {
      padding-left: 0;
    }
  `,
})
