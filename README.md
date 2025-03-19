# 工具箱微信小程序

这是一个提供各种实用工具的微信小程序，目前包含以下工具：

- 图片转Excel：上传图片自动转换为Excel表格

## 项目结构

```
├── app.js                  // 小程序逻辑
├── app.json                // 小程序公共配置
├── app.wxss                // 小程序公共样式
├── pages                   // 页面文件夹
│   ├── index               // 首页
│   │   ├── index.js       
│   │   ├── index.wxml     
│   │   └── index.wxss     
│   └── tools               // 工具页面
│       └── imageToExcel    // 图片转Excel工具
│           ├── imageToExcel.js
│           ├── imageToExcel.wxml
│           └── imageToExcel.wxss
├── project.config.json     // 项目配置文件
└── sitemap.json            // 小程序索引配置
```

## 技术实现

- 图片转Excel工具实现步骤：
  1. 用户上传图片
  2. 将图片发送至后端服务器
  3. 后端使用OCR技术识别图片中的表格内容
  4. 将识别结果转换为Excel格式
  5. 用户下载生成的Excel文件

## 后端服务

图片转Excel功能需要配套的后端服务支持，后端服务需要实现以下API：

- POST /image-to-excel  
  - 功能：接收图片并处理转换为Excel
  - 请求：图片文件
  - 响应：
    ```json
    {
      "success": true,
      "data": {
        "rows": 10,
        "columns": 5,
        "excelUrl": "https://example.com/results/file.xlsx"
      }
    }
    ```

## 开发与测试

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目
3. 在project.config.json中替换为您自己的appid
4. 在imageToExcel.js中替换为您自己的API端点
5. 编译运行

## 注意事项

- 识别准确度受图片质量影响，请确保上传清晰的图片
- 目前仅支持识别较为规整的表格 