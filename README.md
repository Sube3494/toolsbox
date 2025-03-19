# 工具箱微信小程序

这是一个提供各种实用工具的微信小程序，包含多种文件转换和文本处理功能。

## 功能列表

目前包含以下工具：

- **图片转Excel**：上传图片自动识别表格并转换为Excel文件
- **图片转PDF**：将一张或多张图片合并转换为PDF文档
- **PDF转Word**：将PDF文档转换为可编辑的Word文件
- **文本比较工具**：对比两段文本，精确到字符级别的差异展示

## 项目结构

```
├── app.js                  // 小程序逻辑
├── app.json                // 小程序公共配置
├── app.wxss                // 小程序公共样式
├── app.py                  // 后端服务主程序
├── requirements.txt        // Python依赖包列表
├── start.sh                // 服务启动脚本
├── nginx.conf              // Nginx配置示例
├── pages                   // 页面文件夹
│   ├── index               // 首页
│   │   ├── index.js       
│   │   ├── index.wxml     
│   │   └── index.wxss     
│   ├── webview             // WebView页面
│   │   ├── webview.js
│   │   ├── webview.wxml
│   │   └── webview.wxss
│   └── tools               // 工具页面
│       ├── imageToExcel    // 图片转Excel工具
│       │   ├── imageToExcel.js
│       │   ├── imageToExcel.wxml
│       │   └── imageToExcel.wxss
│       ├── imageToPdf      // 图片转PDF工具
│       │   ├── imageToPdf.js
│       │   ├── imageToPdf.wxml
│       │   └── imageToPdf.wxss
│       ├── pdfToWord       // PDF转Word工具
│       │   ├── pdfToWord.js
│       │   ├── pdfToWord.wxml
│       │   └── pdfToWord.wxss
│       └── textCompare     // 文本比较工具
│           ├── textCompare.js
│           ├── textCompare.wxml
│           └── textCompare.wxss
├── project.config.json     // 项目配置文件
└── sitemap.json            // 小程序索引配置
```

## 技术实现

### 前端

- 微信小程序原生开发
- WXML/WXSS/JS组件化结构
- WebView用于复杂页面展示

### 后端

- Python Flask API服务
- PaddleOCR用于图像文字识别
- PyPDF2用于PDF处理
- pdf2docx用于PDF转Word
- difflib用于文本比较算法

## 功能详解

### 1. 图片转Excel
- 上传包含表格数据的图片
- 使用OCR技术自动识别表格内容
- 转换为可下载的Excel文件
- 提供表格行数和列数统计

### 2. 图片转PDF
- 支持多张图片一起转换为PDF
- 图片按照选择顺序排列
- 支持常见图片格式
- 生成可下载的PDF文件

### 3. PDF转Word
- 上传PDF文档
- 自动转换为可编辑的Word文件
- 保留原始文档的基本排版
- 提供转换后文件下载

### 4. 文本比较工具
- 精确到字符级别的文本差异对比
- 高亮显示新增、删除和未变内容
- 计算两段文本的相似度
- 统计新增、删除、相同字符数量
- 提供详细的比较结果页面

## 部署指南

### 后端部署

1. **安装依赖**

   首先安装所需的Python包：
   ```bash
   pip install -r requirements.txt
   ```

2. **准备目录**

   创建上传和输出目录：
   ```bash
   mkdir -p uploads outputs
   ```

3. **配置Nginx**

   创建并编辑Nginx配置文件：
   ```nginx
   server {
       listen 80;
       server_name excel.sube.top;  # 更改为你的域名

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }

       client_max_body_size 20M;  # 设置上传文件大小限制
   }
   ```

4. **启动服务**

   使用启动脚本：
   ```bash
   bash start.sh
   ```
   
   或直接启动Python应用：
   ```bash
   nohup python app.py > app.log 2>&1 &
   ```

5. **重启Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

### 小程序部署

1. **下载微信开发者工具**
   - 从[官方网站](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)下载

2. **导入项目**
   - 打开微信开发者工具
   - 选择"导入项目"
   - 选择项目目录
   - 输入AppID（需在微信公众平台注册）

3. **修改API地址**
   - 在各工具的JS文件中，将API地址修改为您的后端服务地址
   - 默认地址为 `https://excel.sube.top`

4. **域名配置**
   - 在微信公众平台-开发-开发设置中
   - 添加服务器域名到"request合法域名"列表

5. **上传发布**
   - 在开发者工具中点击"上传"
   - 在微信公众平台提交审核发布

## 注意事项

- 识别准确度受图片质量影响，请确保上传清晰的图片
- PDF转Word功能对于复杂排版的文档可能效果不佳
- 文本比较功能适用于短到中等长度的文本，过长的文本可能影响性能
- 后端服务需要配置足够的内存以支持图像处理和OCR功能

## 错误排查

- **上传失败**：检查网络连接和文件大小（最大支持20MB）
- **识别不准确**：尝试上传更清晰的图片或调整图片角度
- **服务器错误**：查看后端日志 `tail -f app.log`
- **转换超时**：对于大型文件，可能需要更长的处理时间 