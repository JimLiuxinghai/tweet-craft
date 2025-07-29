# 安装指南

## 开发者模式安装

1. **构建扩展**
   ```bash
   npm install
   npm run build
   ```

2. **在Chrome中安装**
   - 打开Chrome浏览器
   - 访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录下的 `.output/chrome-mv3` 文件夹
   - 扩展安装完成！

3. **在Edge中安装**
   - 打开Edge浏览器
   - 访问 `edge://extensions/`
   - 开启左下角的"开发人员模式"
   - 点击"加载解压缩的扩展"
   - 选择项目根目录下的 `.output/chrome-mv3` 文件夹
   - 扩展安装完成！

## 开发模式

如果你想要开发和调试扩展：

```bash
npm run dev
```

这将启动开发服务器，文件变化时会自动重新构建。

## 功能验证

安装完成后，访问 [Twitter](https://twitter.com) 或 [X.com](https://x.com)，你应该能看到：

1. 每条推文右下角有一个复制按钮 📋
2. 可以使用快捷键 `Ctrl+Shift+C` (Mac: `Cmd+Shift+C`) 复制推文
3. 右键菜单中有"Twitter 超级复制"选项
4. 点击浏览器工具栏的扩展图标可以打开设置面板

## 故障排除

如果扩展无法正常工作：

1. 确保你在Twitter或X.com页面上
2. 刷新页面重新加载content script
3. 检查浏览器控制台是否有错误信息
4. 在扩展管理页面重新加载扩展