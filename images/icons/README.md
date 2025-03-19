# 工具图标目录

此目录用于存放工具箱各工具的图标文件。

## 使用说明

1. 请在此目录中添加名为`default_icon.png`的默认图标文件
2. 如需为每个工具使用不同图标，请按下方列表添加相应文件

## 图标文件列表

请将以下PNG格式图标文件放置在此目录中：

1. `default_icon.png` - 默认通用图标（必需）
2. `imageToExcel.png` - 图片转Excel工具图标（可选）
3. `imageToPdf.png` - 图片转PDF工具图标（可选）
4. `pdfToWord.png` - PDF转Word工具图标（可选）
5. `textCompare.png` - 文本比较工具图标（可选）
6. `fileCompression.png` - 文件压缩工具图标（可选）

如果要为每个工具使用不同图标，请修改`pages/index/index.js`文件中的图标路径：

```javascript
tools: [
    {
        id: 'imageToExcel',
        name: '图片转Excel',
        icon: '/images/icons/imageToExcel.png', // 修改为对应工具的图标
        ...
    },
    ...
]
```

## 图标要求

- 文件格式：PNG
- 尺寸：建议使用128x128像素
- 背景：最好使用透明背景
- 风格：保持一致的设计风格 