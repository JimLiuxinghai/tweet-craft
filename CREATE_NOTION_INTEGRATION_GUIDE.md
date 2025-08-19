# 📖 Notion Integration 创建详细指南

## 🎯 目标
创建一个 **Internal Integration** 并获取正确格式的 Integration Token (`secret_` 开头)

## 📋 详细步骤

### 第一步：访问集成管理页面

1. 打开浏览器，访问：https://www.notion.so/my-integrations
2. 使用你的 Notion 账户登录

### 第二步：创建新集成

1. **点击 "+ New integration" 按钮**
   
2. **选择集成类型** ⚠️ **这一步很重要！**
   - 确保选择 **"Internal integration"**
   - **不要** 选择 "Public integration"
   
3. **填写集成信息**：
   ```
   Name: Tweet Craft
   Description: 用于保存推文到 Notion 的浏览器扩展
   Associated workspace: [选择你的工作空间]
   Logo: [可选，上传一个图标]
   ```

4. **点击 "Submit" 按钮**

### 第三步：获取 Integration Token

1. **创建成功后**，你会被重定向到集成详情页面

2. **找到 "Secrets" 部分**
   - 页面中会有一个 "Secrets" 或 "Internal Integration Secret" 区域

3. **显示 Token**
   - 点击 "Show" 按钮
   - **正确的格式应该是**：`secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Token 长度通常在 50-60 个字符

4. **复制完整的 Token**
   - 确保复制了完整的 token，包括 `secret_` 前缀
   - 不要有多余的空格

### 第四步：配置权限（重要！）

1. **创建或选择一个 Notion 页面** 作为推文数据库的父页面

2. **将集成添加到页面**：
   - 打开你选择的 Notion 页面
   - 点击页面右上角的 "•••" 菜单
   - 选择 "Add connections" 或 "连接"
   - 找到并选择你刚创建的 "Tweet Craft" 集成
   - 点击 "Confirm" 确认

## 🚨 常见错误及解决方案

### 错误 1：Token 格式错误
**问题**：你的 token 是 `ntn_` 开头而不是 `secret_` 开头

**原因**：你可能创建了 Public Integration 而不是 Internal Integration

**解决方案**：
1. 重新按照上述步骤创建一个新的 **Internal Integration**
2. 或者使用现有的 `ntn_` token（我们的扩展现在也支持这种格式）

### 错误 2：Token 无效
**问题**：提示 401 Unauthorized 错误

**原因**：
- Token 可能不完整
- Token 可能已过期
- 复制时包含了多余的字符

**解决方案**：
1. 重新复制完整的 token
2. 确保没有多余的空格或换行符
3. 在集成页面重新生成 token

### 错误 3：权限不足
**问题**：提示 403 Forbidden 错误

**原因**：集成没有被添加到任何页面

**解决方案**：
1. 按照第四步，将集成添加到至少一个 Notion 页面
2. 确保你有该页面的编辑权限

## 🔍 验证步骤

创建完成后，你可以通过以下方式验证：

### 方法 1：使用扩展的调试功能
1. 在扩展设置中输入 token
2. 点击 "运行诊断" 按钮
3. 查看诊断结果

### 方法 2：手动 API 测试
使用以下 curl 命令测试：
```bash
curl -X GET https://api.notion.com/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Notion-Version: 2022-06-28"
```

### 方法 3：使用调试工具
打开 `debug-notion-connection.html` 页面，输入 token 并测试连接。

## 📝 Token 格式对比

| 集成类型 | Token 格式 | 示例 | 推荐度 |
|---------|------------|------|--------|
| Internal Integration | `secret_xxx...` | `secret_1234567890abcdef...` | ✅ 推荐 |
| Public Integration | `ntn_xxx...` | `ntn_1234567890abcdef...` | ⚠️ 也支持 |

## 🎉 完成！

如果一切顺利，你现在应该有：
- ✅ 一个有效的 Integration Token
- ✅ 集成已添加到至少一个 Notion 页面
- ✅ 可以在扩展中成功连接 Notion

## 💡 小贴士

1. **保存 Token**：将 token 保存在安全的地方，以备后用
2. **定期检查**：定期检查集成状态，确保没有被意外删除
3. **权限管理**：只给集成必要的页面访问权限
4. **安全第一**：不要将 token 分享给他人或提交到代码仓库

如果按照这个指南操作后仍有问题，请使用扩展的诊断功能获取详细的错误信息。
