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
    saveMedia: 'reference',
    checkDuplicates: true,
    syncInterval: 0
  })
  stats.total = 0
  stats.thisMonth = 0
  stats.unread = 0
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
    }
  } catch (error) {
    console.error('Failed to check connection status:', error)
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
.save-settings-section,
.stats-section,
.advanced-section {
  margin-bottom: 25px;
}

.connection-section h4,
.database-section h4,
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
}
</style>