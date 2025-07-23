# 图标生成说明

## 自动生成方法

如果你的系统有 ImageMagick 或 Inkscape，可以使用以下命令生成所需尺寸的图标：

### 使用 Inkscape (推荐)
```bash
# 生成128x128图标
inkscape assets/icons/icon.svg -w 128 -h 128 -o assets/icons/icon128.png

# 生成48x48图标  
inkscape assets/icons/icon.svg -w 48 -h 48 -o assets/icons/icon48.png

# 生成16x16图标
inkscape assets/icons/icon.svg -w 16 -h 16 -o assets/icons/icon16.png
```

### 使用 ImageMagick + rsvg
```bash
# 生成所有尺寸
for size in 16 48 128; do
  rsvg-convert -w $size -h $size assets/icons/icon.svg > assets/icons/icon${size}.png
done
```

## 在线生成方法

1. 将 `icon.svg` 内容复制到在线SVG编辑器 (如 SVG-Edit.org)
2. 导出为不同尺寸的PNG:
   - icon16.png (16x16)
   - icon48.png (48x48)  
   - icon128.png (128x128)

## 临时解决方案

如果无法生成PNG图标，可以暂时将manifest.json中的图标路径改为：
```json
"icons": {
  "16": "assets/icons/icon.svg",
  "48": "assets/icons/icon.svg", 
  "128": "assets/icons/icon.svg"
}
```

Chrome扩展支持SVG图标，虽然PNG更优化。 