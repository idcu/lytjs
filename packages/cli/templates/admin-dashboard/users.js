/**
 * Admin Dashboard - 用户管理页面
 * 功能：数据表格、搜索筛选、分页、CRUD 操作、角色分配
 */

import { createApp, ref, reactive, computed, watch, onMounted, nextTick } from 'https://cdn.jsdelivr.net/npm/@lytjs/core@5.0.1/+esm'

// ========== 导航数据（所有页面共享） ==========
const mainNav = [
  { key: 'dashboard', icon: '&#9632;', label: '仪表盘', url: 'index.html' },
  { key: 'users', icon: '&#128100;', label: '用户管理', url: 'users.html' },
  { key: 'roles', icon: '&#128101;', label: '角色权限', url: 'roles.html' },
  { key: 'table', icon: '&#128203;', label: '数据表格', url: 'table.html' },
  { key: 'forms', icon: '&#9997;', label: '表单页面', url: 'forms.html' },
  { key: 'charts', icon: '&#128200;', label: '图表页面', url: 'charts.html' },
]
const systemNav = [
  { key: 'profile', icon: '&#128100;', label: '个人设置', url: 'profile.html' },
  { key: 'settings', icon: '&#9881;', label: '系统设置', url: 'settings.html' },
]
const otherNav = [
  { key: 'error', icon: '&#9888;', label: '错误页面', url: 'error.html' },
  { key: 'login', icon: '&#128274;', label: '退出登录', url: 'login.html' },
]
const mobileNav = [
  { key: 'dashboard', icon: '&#9632;', label: '首页', url: 'index.html' },
  { key: 'users', icon: '&#128100;', label: '用户', url: 'users.html' },
  { key: 'table', icon: '&#128203;', label: '表格', url: 'table.html' },
  { key: 'charts', icon: '&#128200;', label: '图表', url: 'charts.html' },
  { key: 'profile', icon: '&#9881;', label: '设置', url: 'profile.html' },
]

// ========== Toast ==========
const toasts = ref([])
let toastId = 0
function showToast(message, type = 'info') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3000)
}

// ========== 模拟用户数据 ==========
const ROLES = ['管理员', '编辑', '普通用户', '访客']
const STATUSES = [
  { key: 'active', label: '正常', class: 'success' },
  { key: 'inactive', label: '禁用', class: 'danger' },
  { key: 'pending', label: '待审核', class: 'warning' },
]
const DEPARTMENTS = ['技术部', '产品部', '市场部', '运营部', '财务部', '人事部']

function generateUsers(count) {
  const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十', '陈一', '林二', '黄三', '刘四', '杨五', '何六', '马七']
  const users = []
  for (let i = 0; i < count; i++) {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)]
    users.push({
      id: 1000 + i,
      name: names[i % names.length],
      email: `user${i + 1}@example.com`,
      role: ROLES[Math.floor(Math.random() * ROLES.length)],
      department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
      status: status.key,
      statusLabel: status.label,
      statusClass: status.class,
      createdAt: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      lastLogin: `${Math.floor(Math.random() * 24)}小时前`,
    })
  }
  return users
}

// ========== 创建应用 ==========
const app = createApp({
  setup() {
    // --- 布局 ---
    const sidebarCollapsed = ref(false)
    const mobileMenuOpen = ref(false)
    const isDark = ref(true)

    function toggleSidebar() {
      if (window.innerWidth <= 768) mobileMenuOpen.value = !mobileMenuOpen.value
      else sidebarCollapsed.value = !sidebarCollapsed.value
    }
    function toggleTheme() {
      isDark.value = !isDark.value
      localStorage.setItem('admin-theme', isDark.value ? 'dark' : 'light')
    }
    watch(isDark, (dark) => document.documentElement.classList.toggle('light', !dark))

    // --- 用户数据 ---
    const allUsers = ref(generateUsers(48))
    const searchQuery = ref('')
    const filterRole = ref('')
    const filterStatus = ref('')
    const currentPage = ref(1)
    const pageSize = ref(10)
    const selectedIds = ref(new Set())

    // 过滤后的用户
    const filteredUsers = computed(() => {
      let list = allUsers.value
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          String(u.id).includes(q)
        )
      }
      if (filterRole.value) list = list.filter(u => u.role === filterRole.value)
      if (filterStatus.value) list = list.filter(u => u.status === filterStatus.value)
      return list
    })

    // 分页
    const totalPages = computed(() => Math.ceil(filteredUsers.value.length / pageSize.value))
    const pagedUsers = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      return filteredUsers.value.slice(start, start + pageSize.value)
    })

    // 全选
    const allSelected = computed(() => pagedUsers.value.length > 0 && pagedUsers.value.every(u => selectedIds.value.has(u.id)))
    function toggleSelectAll() {
      if (allSelected.value) {
        pagedUsers.value.forEach(u => selectedIds.value.delete(u.id))
      } else {
        pagedUsers.value.forEach(u => selectedIds.value.add(u.id))
      }
      selectedIds.value = new Set(selectedIds.value) // 触发响应式更新
    }
    function toggleSelect(id) {
      if (selectedIds.value.has(id)) selectedIds.value.delete(id)
      else selectedIds.value.add(id)
      selectedIds.value = new Set(selectedIds.value)
    }

    // --- CRUD 操作 ---
    const showModal = ref(false)
    const modalTitle = ref('新增用户')
    const editingId = ref(null)
    const userForm = reactive({
      name: '', email: '', role: '普通用户', department: '技术部', status: 'active',
    })
    const formErrors = reactive({ name: '', email: '' })

    function openCreateModal() {
      modalTitle.value = '新增用户'
      editingId.value = null
      Object.assign(userForm, { name: '', email: '', role: '普通用户', department: '技术部', status: 'active' })
      Object.keys(formErrors).forEach(k => formErrors[k] = '')
      showModal.value = true
    }

    function openEditModal(user) {
      modalTitle.value = '编辑用户'
      editingId.value = user.id
      Object.assign(userForm, { name: user.name, email: user.email, role: user.role, department: user.department, status: user.status })
      Object.keys(formErrors).forEach(k => formErrors[k] = '')
      showModal.value = true
    }

    function validateForm() {
      let valid = true
      if (!userForm.name.trim()) { formErrors.name = '请输入用户名'; valid = false }
      else formErrors.name = ''
      if (!userForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) { formErrors.email = '请输入有效邮箱'; valid = false }
      else formErrors.email = ''
      return valid
    }

    function handleSave() {
      if (!validateForm()) return
      if (editingId.value) {
        const idx = allUsers.value.findIndex(u => u.id === editingId.value)
        if (idx > -1) {
          const status = STATUSES.find(s => s.key === userForm.status) || STATUSES[0]
          Object.assign(allUsers.value[idx], userForm, { statusLabel: status.label, statusClass: status.class })
        }
        showToast('用户信息已更新', 'success')
      } else {
        const status = STATUSES.find(s => s.key === userForm.status) || STATUSES[0]
        allUsers.value.unshift({
          id: 1000 + allUsers.value.length,
          ...userForm,
          statusLabel: status.label,
          statusClass: status.class,
          createdAt: new Date().toISOString().slice(0, 10),
          lastLogin: '刚刚',
        })
        showToast('用户创建成功', 'success')
      }
      showModal.value = false
    }

    function handleDelete(id) {
      allUsers.value = allUsers.value.filter(u => u.id !== id)
      selectedIds.value.delete(id)
      selectedIds.value = new Set(selectedIds.value)
      showToast('用户已删除', 'success')
    }

    function handleBatchDelete() {
      const count = selectedIds.value.size
      allUsers.value = allUsers.value.filter(u => !selectedIds.value.has(u.id))
      selectedIds.value = new Set()
      showToast(`已删除 ${count} 个用户`, 'success')
    }

    function handleToggleStatus(user) {
      const newStatus = user.status === 'active' ? 'inactive' : 'active'
      const statusInfo = STATUSES.find(s => s.key === newStatus)
      user.status = newStatus
      user.statusLabel = statusInfo.label
      user.statusClass = statusInfo.class
      showToast(`用户 "${user.name}" 已${newStatus === 'active' ? '启用' : '禁用'}`, 'success')
    }

    // --- 初始化 ---
    onMounted(() => {
      const savedTheme = localStorage.getItem('admin-theme')
      if (savedTheme === 'light') { isDark.value = false; document.documentElement.classList.add('light') }
    })

    return {
      sidebarCollapsed, mobileMenuOpen, isDark, toggleSidebar, toggleTheme,
      mainNav, systemNav, otherNav, mobileNav,
      allUsers, searchQuery, filterRole, filterStatus, currentPage, pageSize,
      filteredUsers, totalPages, pagedUsers,
      selectedIds, allSelected, toggleSelectAll, toggleSelect,
      showModal, modalTitle, userForm, formErrors,
      openCreateModal, openEditModal, handleSave, handleDelete, handleBatchDelete, handleToggleStatus,
      ROLES, STATUSES, DEPARTMENTS,
      toasts,
      toastIcons: { success: '&#10004;', error: '&#10008;', warning: '&#9888;', info: '&#8505;' },
    }
  },
})

app.mount('#app')
