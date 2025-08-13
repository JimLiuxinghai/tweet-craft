# Notion 集成设置指南

## 概述

本指南将帮助您正确配置 Tweet Craft 扩展与 Notion 的集成，以便将推文保存到您的 Notion 数据库中。

## 前置要求

1. 拥有 Notion 账户
2. 已安装 Tweet Craft 浏览器扩展

## 步骤 1：创建 Notion 集成

### 1.1 访问 Notion 集成页面
1. 打开浏览器，访问 [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. 使用您的 Notion 账户登录

### 1.2 创建新集成
1. 点击 "**+ New integration**" 按钮
2. **重要**：确保选择 "**Internal integration**" 类型
3. 填写集成信息：
   - **Type**: 选择 "**Internal integration**" （必须选择这个！）
   - **Name**: `Tweet Craft` (或您喜欢的名称)
   - **Description**: `用于保存推文到 Notion 的集成`
   - **Associated workspace**: 选择您要使用的工作空间
   - **Logo**: 可选，上传图标
4. 点击 "**Submit**" 创建集成

### 1.3 获取 Integration Token
1. 创建成功后，您会看到 "**Secrets**" 部分
2. 在 "**Internal Integration Secret**" 下方，点击 "**Show**" 按钮显示完整的 token
3. **正确的 token 格式**：
   - **Internal Integration**: `secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (推荐)
   - **Public Integration**: `ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (也支持)
4. 复制完整的 token
5. **重要**：妥善保管这个 token，不要分享给他人

**注意**：如果你的 token 是以 `ntn_` 开头的，说明你创建的可能是 Public Integration。虽然我们的扩展现在也支持这种格式，但建议创建 Internal Integration 以获得更好的安全性。

## 步骤 2：准备 Notion 页面

### 2.1 创建或选择父页面
1. 在 Notion 中创建一个新页面，或选择现有页面作为数据库的父页面
2. 记下这个页面的名称，稍后需要用到

### 2.2 将集成添加到页面
1. 打开您选择的父页面
2. 点击页面右上角的 "**•••**" 菜单
3. 选择 "**Add connections**"
4. 找到并选择您刚创建的 "Tweet Craft" 集成
5. 点击 "**Confirm**" 确认

## 步骤 3：配置扩展

### 3.1 打开扩展设置
1. 点击浏览器工具栏中的 Tweet Craft 扩展图标
2. 在弹出窗口中找到 Notion 设置部分

### 3.2 输入 Integration Token
1. 在 "**Integration Token**" 输入框中粘贴您在步骤 1.3 中复制的 token
2. 确保 token 以 `secret_` 开头且完整无误
3. 点击 "**连接 Notion**" 按钮

### 3.3 创建数据库
1. 连接成功后，从下拉列表中选择您在步骤 2.1 中准备的父页面
2. 输入数据库名称（默认：Tweet Collection）
3. 点击 "**创建数据库**" 按钮

## 步骤 4：验证设置

### 4.1 检查连接状态
- 扩展界面应显示 "已连接到 Notion"
- 您应该能看到数据库信息和统计数据

### 4.2 测试保存功能
1. 访问 Twitter/X 网站
2. 找到一条推文
3. 使用扩展的保存功能
4. 检查 Notion 数据库是否成功保存了推文

## 常见问题

### Q1: 提示 "Integration Token 无效或已过期"
**解决方案：**
- 检查 token 是否完整复制（包括 `secret_` 前缀）
- 确认在 Notion 集成页面中 token 状态正常
- 重新生成 token 并重新配置

### Q2: 提示 "权限不足"
**解决方案：**
- 确保已将集成添加到目标页面（参见步骤 2.2）
- 检查工作空间权限设置
- 确认集成在正确的工作空间中

### Q3: 提示 "资源不存在"
**解决方案：**
- 检查父页面是否存在且可访问
- 确认页面 ID 正确
- 重新选择父页面

### Q4: 网络连接失败
**解决方案：**
- 检查网络连接
- 确认可以访问 notion.so
- 尝试禁用 VPN 或代理

## 数据库结构

创建的数据库将包含以下字段：

- **标题**: 推文内容摘要
- **内容**: 完整推文文本
- **作者**: 推文作者显示名
- **作者用户名**: 推文作者用户名
- **推文链接**: 原始推文 URL
- **发布时间**: 推文发布时间
- **类型**: 推文类型（原创、转推等）
- **标签**: 自定义标签
- **媒体信息**: 是否包含图片、视频、链接
- **互动数据**: 点赞数、转推数、回复数
- **状态**: 阅读状态、收藏状态等

## 高级功能

### 自动标签
- 可以设置默认标签
- 支持根据内容自动分类

### 重复检查
- 自动检测重复推文
- 避免保存相同内容

### 批量操作
- 支持批量保存推文线程
- 一键保存整个对话

## 安全提示

1. **保护 Integration Token**：不要在公共场所或不安全的环境中输入 token
2. **定期检查权限**：定期检查集成的访问权限
3. **及时更新**：保持扩展和集成配置的最新状态

## 技术支持

如果您在设置过程中遇到问题，请：

1. 查看浏览器控制台错误信息
2. 检查 Notion 集成状态
3. 确认所有步骤都已正确完成
4. 联系技术支持并提供详细错误信息

---

**注意**：本指南基于 Notion API v2022-06-28 版本编写，如果 Notion 更新了 API 或界面，某些步骤可能需要相应调整。

