<template>
  <div class="notion-settings" v-if="visible">
    <div class="settings-header">
      <h3><i class="fas fa-book"></i> Notion 集成设置</h3>
      <button class="close-btn" @click="close">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- 连接状态 -->
    <div class="connection-section">
      <div class="status-card" :class="connectionStatus">
        <div class="status-icon">
          <i v-if="isConnected" class="fas fa-check-circle"></i>
          <i v-else class="fas fa-exclamation-circle"></i>
        </div>
        <div class="status-text">
          <h4>{{ connectionTitle }}</h4>
          <p>{{ connectionMessage }}</p>
        </div>
      </div>

      <!-- Integration Token 输入 -->
      <div v-if="!isConnected" class="token-input-section">
        <div class="form-group">
          <label>Integration Token</label>
          <input 
            type="password" 
            v-model="integrationToken" 
            placeholder="secret_..."
            :disabled="connecting"
          />
          <small class="help-text">
            在 Notion 设置页面创建集成后获取，格式为 secret_xxx
          </small>
        </div>
      </div>

      <div class="connection-actions">
        <button 
          v-if="!isConnected" 
          class="btn btn-primary" 
          @click="connectNotion"
          :disabled="connecting || !integrationToken"
        >
          <i v-if="connecting" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fab fa-notion"></i>
          {{ connecting ? '连接中...' : '连接 Notion' }}
        </button>
        
        <button 
          v-if="isConnected" 
          class="btn btn-danger" 
          @click="disconnectNotion"
        >
          <i class="fas fa-unlink"></i>
          断开连接
        </button>
        
        <button 
          class="btn btn-info" 
          @click="runDiagnostics"
          :disabled="debugging"
        >
          <i v-if="debugging" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-bug"></i>
          {{ debugging ? '诊断中...' : '运行诊断' }}
        </button>
      </div>
    </div>

    <!-- 数据库设置 -->
    <div v-if="isConnected" class="database-section">
      <h4><i class="fas fa-database"></i> 数据库设置</h4>
      
      <div v-if="!databaseId" class="database-setup">
        <div class="form-group">
          <label>选择父页面</label>
          <select v-model="selectedParentPage" :disabled="loadingPages">
            <option value="">选择父页面...</option>
            <option v-for="page in pages" :key="page.id" :value="page.id">
              {{ page.title }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>数据库名称</label>
          <input 
            type="text" 
            v-model="databaseName" 
            placeholder="Tweet Collection"
            :disabled="creatingDatabase"
          />
        </div>

        <button 
          class="btn btn-success" 
          @click="createDatabase"
          :disabled="!selectedParentPage || creatingDatabase"
        >
          <i v-if="creatingDatabase" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-plus"></i>
          {{ creatingDatabase ? '创建中...' : '创建数据库' }}
        </button>
      </div>

      <div v-else class="database-info">
        <div class="info-card">
          <h5>当前数据库</h5>
          <p><strong>名称:</strong> {{ databaseInfo.name }}</p>
          <p><strong>ID:</strong> {{ databaseId }}</p>
          <div class="database-actions">
            <button class="btn btn-secondary" @click="changeDatabase">
              <i class="fas fa-edit"></i>
              更换数据库
            </button>
            <button class="btn btn-info" @click="openNotion">
              <i class="fas fa-external-link-alt"></i>
              打开 Notion
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分类管理 -->
    <div v-if="isConnected && databaseId" class="category-section">
      <h4><i class="fas fa-tags"></i> 分类管理</h4>
      
      <div class="category-list">
        <div 
          v-for="(category, index) in categories" 
          :key="index"
          class="category-item"
          :style="{ borderColor: category.color + '40', backgroundColor: category.color + '10' }"
        >
          <div class="category-info">
            <div class="category-color" :style="{ backgroundColor: category.color }"></div>
            <span class="category-name">{{ category.name }}</span>
          </div>
          <div class="category-actions">
            <button 
              class="btn-icon edit" 
              @click="editCategory(index)"
              :title="'编辑分类'"
            >
              <i class="fas fa-edit"></i>
            </button>
            <button 
              class="btn-icon delete" 
              @click="deleteCategory(index)"
              :title="'删除分类'"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="add-category-item" @click="openAddCategoryDialog">
          <i class="fas fa-plus"></i>
          <span>添加新分类</span>
        </div>
      </div>
    </div>

    <!-- 保存设置 -->
    <div v-if="isConnected && databaseId" class="save-settings-section">
      <h4><i class="fas fa-cog"></i> 保存设置</h4>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="settings.autoTags"
            @change="saveSettings"
          />
          <span>自动添加标签</span>
        </label>
      </div>

      <div class="form-group">
        <label>默认标签 (逗号分隔)</label>
        <input 
          type="text" 
          v-model="settings.defaultTags"
          placeholder="技术,学习,资讯"
          @change="saveSettings"
        />
      </div>

      <div class="form-group">
        <label>默认分类</label>
        <select v-model="settings.defaultCategory" @change="saveSettings">
          <option value="">不设置</option>
          <option v-for="category in categories" :key="category.name" :value="category.name">
            {{ category.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>媒体处理</label>
        <select v-model="settings.saveMedia" @change="saveSettings">
          <option value="reference">仅保存引用</option>
          <option value="download">下载到Notion</option>
        </select>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="settings.checkDuplicates"
            @change="saveSettings"
          />
          <span>检查重复推文</span>
        </label>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="isConnected && databaseId" class="stats-section">
      <h4><i class="fas fa-chart-bar"></i> 统计信息</h4>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ stats.total || 0 }}</div>
          <div class="stat-label">已保存推文</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.thisMonth || 0 }}</div>
          <div class="stat-label">本月保存</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.unread || 0 }}</div>
          <div class="stat-label">未读推文</div>
        </div>
      </div>
    </div>

    <!-- 高级设置 -->
    <div v-if="isConnected" class="advanced-section">
      <h4><i class="fas fa-cogs"></i> 高级设置</h4>
      
      <div class="form-group">
        <label>同步间隔</label>
        <select v-model="settings.syncInterval" @change="saveSettings">
          <option :value="0">禁用自动同步</option>
          <option :value="5">5分钟</option>
          <option :value="15">15分钟</option>
          <option :value="30">30分钟</option>
          <option :value="60">1小时</option>
        </select>
      </div>

      <div class="form-actions">
        <button class="btn btn-secondary" @click="exportSettings">
          <i class="fas fa-download"></i>
          导出设置
        </button>
        <button class="btn btn-secondary" @click="importSettings">
          <i class="fas fa-upload"></i>
          导入设置
        </button>
        <input 
          ref="fileInput" 
          type="file" 
          accept=".json" 
          style="display: none;" 
          @change="handleFileImport"
        />
      </div>
    </div>

    <!-- 添加/编辑分类对话框 -->
    <div v-if="showAddCategoryDialog || editingCategory !== null" class="category-modal-backdrop" @click="closeCategoryDialog">
      <div class="category-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editingCategory !== null ? '编辑分类' : '添加分类' }}</h3>
          <button class="close-btn" @click="closeCategoryDialog">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>分类名称</label>
            <input 
              ref="categoryNameInput"
              type="text" 
              v-model="categoryForm.name" 
              placeholder="输入分类名称..."
              @keydown.enter="saveCategoryDialog"
              @keydown.escape="closeCategoryDialog"
            />
          </div>
          
          <div class="form-group">
            <label>颜色</label>
            <div class="color-picker">
              <div 
                v-for="color in predefinedColors" 
                :key="color"
                class="color-option"
                :class="{ active: categoryForm.color === color }"
                :style="{ backgroundColor: color }"
                @click="categoryForm.color = color"
              ></div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeCategoryDialog">取消</button>
          <button 
            class="btn btn-primary" 
            @click="saveCategoryDialog"
            :disabled="!categoryForm.name.trim()"
          >
            {{ editingCategory !== null ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

// Props
const props = defineProps<{
  visible: boolean
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// 响应式数据
const connecting = ref(false)
const loadingPages = ref(false)
const creatingDatabase = ref(false)
const debugging = ref(false)
const isConnected = ref(false)
const integrationToken = ref('')
const databaseId = ref('')
const selectedParentPage = ref('')
const databaseName = ref('Tweet Collection')
const pages = ref<Array<{ id: string; title: string }>>([])
const databaseInfo = ref({ name: '', id: '' })

const settings = reactive({
  autoTags: false,
  defaultTags: '',
  defaultCategory: '',
  saveMedia: 'reference',
  checkDuplicates: true,
  syncInterval: 0
})

const stats = reactive({
  total: 0,
  thisMonth: 0,
  unread: 0
})

const fileInput = ref<HTMLInputElement | null>(null)
const categoryNameInput = ref<HTMLInputElement | null>(null)

// 分类相关状态
const categories = ref([
  { name: '技术', color: '#0066CC' },
  { name: '资讯', color: '#00AA55' },
  { name: '学习', color: '#8B5CF6' },
  { name: '工作', color: '#DC2626' },
  { name: '生活', color: '#F59E0B' },
  { name: '其他', color: '#6B7280' }
])

const showAddCategoryDialog = ref(false)
const editingCategory = ref<number | null>(null)
const categoryForm = reactive({
  name: '',
  color: '#0066CC'
})

const predefinedColors = [
  '#0066CC', '#00AA55', '#8B5CF6', '#DC2626', '#F59E0B', '#6B7280',
  '#3B82F6', '#10B981', '#F97316', '#EF4444', '#84CC16', '#06B6D4',
  '#8B5A2B', '#6366F1', '#EC4899', '#14B8A6', '#F87171', '#A3A3A3'
]

// 计算属性
const connectionStatus = computed(() => isConnected.value ? 'connected' : 'disconnected')
const connectionTitle = computed(() => isConnected.value ? '已连接到 Notion' : '未连接到 Notion')
const connectionMessage = computed(() => {
  return isConnected.value 
    ? `工作空间: ${databaseInfo.value.name || 'Unknown'}`
    : '请连接您的 Notion 账户以开始使用推文保存功能'
})

// 方法
const close = () => {
  emit('close')
}

const connectNotion = async () => {
  console.log('connectNotion called')
  console.log('integrationToken.value:', integrationToken.value)
  
  if (!integrationToken.value) {
    console.log('No token provided')
    showNotification('请输入 Integration Token', 'error')
    return
  }

  connecting.value = true
  try {
    console.log('Saving token to storage...')
    // 先保存 token
    await chrome.storage.sync.set({
      notion_integration_token: integrationToken.value
    })
    console.log('Token saved to storage:', integrationToken.value)
    
    console.log('Sending authentication message to background...')
    const response = await chrome.runtime.sendMessage({
      type: 'NOTION_AUTHENTICATE'
    })
    console.log('Background response:', response)
    
    if (response.success) {
      console.log('Authentication successful')
      isConnected.value = true
      await loadPages()
      await loadSettings()
      showNotification('Notion 连接成功！', 'success')
    } else {
      console.log('Authentication failed:', response.error)
      showNotification('连接失败: ' + response.error, 'error')
    }
  } catch (error) {
    console.log('Connection error:', error)
    showNotification('连接失败: ' + error, 'error')
  } finally {
    connecting.value = false
  }
}

const disconnectNotion = async () => {
  if (!confirm('确定要断开 Notion 连接吗？这将清除所有设置。')) {
    return
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'NOTION_DISCONNECT'
    })

    if (response.success) {
      isConnected.value = false
      databaseId.value = ''
      pages.value = []
      resetSettings()
      showNotification('已断开连接', 'success')
    }
  } catch (error) {
    showNotification('断开连接失败: ' + error, 'error')
  }
}

const loadPages = async () => {
  loadingPages.value = true
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'NOTION_GET_USER_PAGES'
    })

    if (response.success) {
      pages.value = response.pages
    }
  } catch (error) {
    console.error('Failed to load pages:', error)
  } finally {
    loadingPages.value = false
  }
}

const createDatabase = async () => {
  if (!selectedParentPage.value) {
    showNotification('请选择一个父页面', 'error')
    return
  }

  creatingDatabase.value = true
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'NOTION_CREATE_DATABASE',
      parentPageId: selectedParentPage.value,
      title: databaseName.value
    })

    if (response.success) {
      databaseId.value = response.database.id
      databaseInfo.value = {
        name: databaseName.value,
        id: response.database.id
      }
      await loadStats()
      showNotification('数据库创建成功！', 'success')
    } else {
      showNotification('创建失败: ' + response.error, 'error')
    }
  } catch (error) {
    showNotification('创建失败: ' + error, 'error')
  } finally {
    creatingDatabase.value = false
  }
}

const changeDatabase = () => {
  const newId = prompt('请输入新的数据库ID:')
  if (newId) {
    databaseId.value = newId
    databaseInfo.value.id = newId
    saveSettings()
    showNotification('数据库已更换', 'success')
  }
}

const openNotion = () => {
  if (databaseId.value) {
    chrome.tabs.create({
      url: `https://www.notion.so/${databaseId.value.replace(/-/g, '')}`
    })
  }
}

const saveSettings = async () => {
  try {
    await chrome.storage.sync.set({
      notionSettings: settings,
      notionDatabaseId: databaseId.value
    })
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

const loadSettings = async () => {
  try {
    const result = await chrome.storage.sync.get(['notionSettings', 'notionDatabaseId'])
    
    if (result.notionSettings) {
      Object.assign(settings, result.notionSettings)
    }
    
    if (result.notionDatabaseId) {
      databaseId.value = result.notionDatabaseId
      databaseInfo.value.id = result.notionDatabaseId
      await loadStats()
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

const loadStats = async () => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'NOTION_GET_DATABASE_STATS'
    })

    if (response.success) {
      Object.assign(stats, response.stats)
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const exportSettings = () => {
  const data = {
    settings,
    databaseId: databaseId.value,
    databaseInfo: databaseInfo.value,
    exportTime: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notion-settings-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importSettings = () => {
  fileInput.value?.click()
}

const handleFileImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      
      if (data.settings) {
        Object.assign(settings, data.settings)
      }
      
      if (data.databaseId) {
        databaseId.value = data.databaseId
        databaseInfo.value = data.databaseInfo || { id: data.databaseId, name: 'Imported' }
      }
      
      saveSettings()
      showNotification('设置导入成功', 'success')
    } catch (error) {
      showNotification('导入失败: 无效的文件格式', 'error')
    }
  }
  reader.readAsText(file)
}

const resetSettings = () => {
  Object.assign(settings, {
    autoTags: false,
    defaultTags: '',
    defaultCategory: '',
    saveMedia: 'reference',
    checkDuplicates: true,
    syncInterval: 0
  })
  stats.total = 0
  stats.thisMonth = 0
  stats.unread = 0
}

// 分类管理方法
const openAddCategoryDialog = () => {
  showAddCategoryDialog.value = true
  editingCategory.value = null
  categoryForm.name = ''
  categoryForm.color = '#0066CC'
  
  // 延迟聚焦，确保对话框已渲染
  setTimeout(() => {
    categoryNameInput.value?.focus()
  }, 100)
}

const editCategory = (index: number) => {
  editingCategory.value = index
  const category = categories.value[index]
  categoryForm.name = category.name
  categoryForm.color = category.color
  showAddCategoryDialog.value = false
  
  // 延迟聚焦，确保对话框已渲染
  setTimeout(() => {
    categoryNameInput.value?.focus()
  }, 100)
}

const deleteCategory = (index: number) => {
  const category = categories.value[index]
  if (confirm(`确定要删除分类"${category.name}"吗？`)) {
    // 如果删除的分类是默认分类，清空默认分类设置
    if (settings.defaultCategory === category.name) {
      settings.defaultCategory = ''
    }
    categories.value.splice(index, 1)
    saveCategories()
    saveSettings()
  }
}

const closeCategoryDialog = () => {
  showAddCategoryDialog.value = false
  editingCategory.value = null
  categoryForm.name = ''
  categoryForm.color = '#0066CC'
}

const saveCategoryDialog = () => {
  const name = categoryForm.name.trim()
  if (!name) return
  
  if (editingCategory.value !== null) {
    // 编辑现有分类
    const oldName = categories.value[editingCategory.value].name
    categories.value[editingCategory.value] = {
      name,
      color: categoryForm.color
    }
    
    // 如果修改的是默认分类，更新默认分类设置
    if (settings.defaultCategory === oldName) {
      settings.defaultCategory = name
    }
  } else {
    // 添加新分类
    categories.value.push({
      name,
      color: categoryForm.color
    })
  }
  
  saveCategories()
  saveSettings()
  closeCategoryDialog()
}

const saveCategories = async () => {
  try {
    await chrome.storage.sync.set({
      notionCategories: categories.value
    })
  } catch (error) {
    console.error('Failed to save categories:', error)
  }
}

const loadCategories = async () => {
  try {
    const result = await chrome.storage.sync.get(['notionCategories'])
    if (result.notionCategories && result.notionCategories.length > 0) {
      categories.value = result.notionCategories
    }
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

const runDiagnostics = async () => {
  debugging.value = true
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'NOTION_DEBUG'
    })

    if (response.success) {
      console.log('诊断结果:', response.results)
      console.log('诊断报告:\n', response.report)
      
      // 显示诊断结果
      const successCount = response.results.filter((r: any) => r.success).length
      const totalCount = response.results.length
      
      if (successCount === totalCount) {
        showNotification('诊断完成：所有检查都通过了！', 'success')
      } else {
        showNotification(`诊断完成：${successCount}/${totalCount} 项检查通过，请查看控制台了解详情`, 'warning')
      }
    } else {
      showNotification('诊断失败: ' + response.error, 'error')
    }
  } catch (error) {
    console.error('诊断过程中出错:', error)
    showNotification('诊断过程中出错: ' + error, 'error')
  } finally {
    debugging.value = false
  }
}

const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
  // 这里可以实现通知逻辑
  console.log(`[${type.toUpperCase()}] ${message}`)
}

// 生命周期
onMounted(async () => {
  // 检查连接状态
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'NOTION_IS_CONNECTED'
    })

    if (response.success && response.connected) {
      isConnected.value = true
      await loadPages()
      await loadSettings()
      await loadCategories()
    } else {
      await loadCategories()
    }
  } catch (error) {
    console.error('Failed to check connection status:', error)
    await loadCategories()
  }
})
</script>

<style scoped>
.notion-settings {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.settings-header h3 {
  margin: 0;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.connection-section,
.database-section,
.category-section,
.save-settings-section,
.stats-section,
.advanced-section {
  margin-bottom: 25px;
}

.connection-section h4,
.database-section h4,
.category-section h4,
.save-settings-section h4,
.stats-section h4,
.advanced-section h4 {
  margin: 0 0 15px 0;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  border: 1px solid;
}

.status-card.connected {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.status-card.disconnected {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.status-icon {
  margin-right: 12px;
  font-size: 20px;
}

.status-text h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.status-text p {
  margin: 0;
  font-size: 13px;
  opacity: 0.8;
}

.connection-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-info {
  background: #06b6d4;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #0891b2;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.help-text {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.token-input-section {
  margin-bottom: 15px;
  padding: 15px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.database-setup {
  background: #f9fafb;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.database-info {
  background: #f0f9ff;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #0ea5e9;
}

.info-card h5 {
  margin: 0 0 10px 0;
  color: #0c4a6e;
  font-size: 14px;
}

.info-card p {
  margin: 5px 0;
  font-size: 13px;
  color: #374151;
}

.database-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.stat-card {
  background: #f8fafc;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #1e40af;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 分类管理样式 */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 2px solid;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-name {
  font-weight: 500;
  font-size: 14px;
}

.category-actions {
  display: flex;
  gap: 6px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.btn-icon.edit {
  background: #e0f2fe;
  color: #0288d1;
}

.btn-icon.edit:hover {
  background: #b3e5fc;
  color: #0277bd;
}

.btn-icon.delete {
  background: #ffebee;
  color: #d32f2f;
}

.btn-icon.delete:hover {
  background: #ffcdd2;
  color: #c62828;
}

.add-category-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px dashed #d1d5db;
  background: #f9fafb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
  font-weight: 500;
}

.add-category-item:hover {
  border-color: #9ca3af;
  background: #f3f4f6;
  color: #374151;
}

/* 分类对话框样式 */
.category-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.category-modal {
  background: white;
  border-radius: 16px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from { 
    opacity: 0; 
    transform: translateY(-20px) scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0 24px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.modal-body {
  padding: 20px 24px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 24px 24px 24px;
}

.modal-footer .btn {
  flex: 1;
}

.color-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s ease;
}

.color-option:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-option.active {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px #3b82f6, 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .notion-settings {
    padding: 15px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .connection-actions {
    flex-direction: column;
  }
  
  .btn {
    justify-content: center;
  }
  
  .category-modal {
    width: 95%;
    max-width: none;
  }
  
  .color-picker {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .category-actions {
    flex-shrink: 0;
  }
}
</style>