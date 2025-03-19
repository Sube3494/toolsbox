# 工具图标目录

此目录用于存放工具箱各工具的图标文件。

## 使用说明

1. 已经添加了所有工具的SVG图标文件
2. 所有图标已正确配置在index.js中

## 图标文件列表

目录中包含以下SVG格式图标文件：

1. `tool_icon.svg` - 通用图标模板
2. `imageToExcel.svg` - 图片转Excel工具图标
3. `imageToPdf.svg` - 图片转PDF工具图标
4. `pdfToWord.svg` - PDF转Word工具图标
5. `textCompare.svg` - 文本比较工具图标
6. `fileCompression.svg` - 文件压缩工具图标

## 如何修改图标

如需修改图标，请使用SVG格式替换对应文件，并确保在`pages/index/index.js`中正确引用：

```javascript
tools: [
    {
        id: 'imageToExcel',
        name: '图片转Excel',
        icon: '/images/icons/imageToExcel.svg', // SVG图标路径
        ...
    },
    ...
]
```

## 图标要求

- 文件格式：SVG
- 尺寸：使用viewBox="0 0 24 24"确保一致比例
- 背景：使用透明背景
- 风格：保持一致的设计风格 