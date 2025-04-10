# 工具箱微信小程序

这是一个提供各种实用工具的微信小程序，包含多种文件转换和文本处理功能。

## 功能列表

目前包含以下工具：

- **图片转Excel**：上传图片自动识别表格并转换为Excel文件
- **图片转PDF**：将一张或多张图片合并转换为PDF文档
- **PDF转Word**：将PDF文档转换为可编辑的Word文件
- **PDF拆分合并**：拆分或合并PDF文档，支持页码范围选择
- **文本比较工具**：对比两段文本，精确到字符级别的差异展示
- **文件压缩工具**：将多个文件压缩打包为ZIP或7Z格式
- **批量重命名与打包**：选择多个文件，批量重命名后打包下载
- **Markdown转换工具**：将Markdown文档转换为Word或PDF格式

## 项目结构

```
├── app.js                  // 小程序逻辑
├── app.json                // 小程序公共配置
├── app.wxss                // 小程序公共样式
├── app.py                  // 后端服务主程序
├── requirements.txt        // Python依赖包列表
├── start.sh                // 服务启动脚本
├── nginx.conf              // Nginx配置示例
├── 服务器故障排除指南.md     // 服务器故障排查指南
├── 微信小程序真机启动问题排查.md // 小程序故障排查指南
├── 域名配置说明.md          // 域名配置说明文档
├── images                  // 图片资源文件夹
│   ├── icons               // 工具图标存放目录
│       ├── batchRename.svg // 批量重命名工具图标
│       ├── fileCompression.svg // 文件压缩工具图标
│       ├── imageToExcel.svg   // 图片转Excel工具图标
│       ├── imageToPdf.svg     // 图片转PDF工具图标
│       ├── mdToWord.svg       // Markdown转Word工具图标
│       ├── pdfSplitMerge.svg  // PDF拆分合并工具图标
│       ├── pdfToWord.svg      // PDF转Word工具图标
│       ├── textCompare.svg    // 文本比较工具图标
│       ├── tool_icon.svg      // 通用工具图标
├── pages                   // 页面文件夹
│   ├── index               // 首页
│   │   ├── index.js       
│   │   ├── index.wxml     
│   │   └── index.wxss     
│   ├── webview             // WebView页面
│   │   ├── webview.js
│   │   ├── webview.wxml
│   │   └── webview.wxss
│   ├── batchRename         // 批量重命名页面
│   │   ├── batchRename.js
│   │   ├── batchRename.wxml
│   │   └── batchRename.wxss
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
│       ├── pdfSplitMerge   // PDF拆分合并工具
│       │   ├── pdfSplitMerge.js
│       │   ├── pdfSplitMerge.wxml
│       │   └── pdfSplitMerge.wxss
│       ├── textCompare     // 文本比较工具
│       │   ├── textCompare.js
│       │   ├── textCompare.wxml
│       │   └── textCompare.wxss
│       ├── fileCompression  // 文件压缩工具
│       │   ├── fileCompression.js
│       │   ├── fileCompression.wxml
│       │   └── fileCompression.wxss
│       ├── mdToWord        // Markdown转Word工具
│       │   ├── mdToWord.js
│       │   ├── mdToWord.wxml
│       │   └── mdToWord.wxss
│       └── batchRename     // 批量重命名与打包工具
│           ├── batchRename.js
│           ├── batchRename.wxml
│           └── batchRename.wxss
├── project.config.json     // 项目配置文件
├── project.private.config.json // 项目私有配置
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
- zipfile和py7zr用于文件压缩和打包
- markdown和python-docx用于Markdown转Word

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

### 4. PDF拆分合并
- 支持多个PDF文件合并为一个文档
- 可调整合并PDF的顺序
- 支持按页码范围拆分PDF文件
- 支持单页拆分模式
- 拆分后的PDF将打包为ZIP格式下载

### 5. 文本比较工具
- 精确到字符级别的文本差异对比
- 高亮显示新增、删除和未变内容
- 计算两段文本的相似度
- 统计新增、删除、相同字符数量
- 提供详细的比较结果页面

### 6. 文件压缩工具
- 支持多个文件同时压缩打包
- 提供ZIP和7Z两种压缩格式选择
- ZIP格式具有最佳兼容性
- 7Z格式提供更高压缩率
- 保留原始文件名和结构

### 7. 批量重命名与打包
- 从聊天记录、相册或相机选择多个文件
- 支持单独编辑每个文件名和扩展名
- 提供批量命名规则，可设置前缀、序号和后缀
- 支持统一修改文件扩展名
- 将重命名后的文件打包为ZIP格式下载

### 8. Markdown转换工具
- 上传Markdown文档
- 自动转换为Word或PDF格式
- 支持设置输出格式（Word或PDF）
- 保留标题、列表、代码块等Markdown格式
- Word格式适合后续编辑，PDF格式适合保留排版
- 提供转换后文件下载

## 部署指南

### 后端部署

1. **安装依赖**

   首先安装所需的Python包：
   ```bash
   pip install -r requirements.txt
   ```

2. **准备目录**

   创建上传、输出和临时目录：
   ```bash
   mkdir -p uploads outputs temp
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

   修改start.sh脚本权限并启动：
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   
   或直接启动Python应用：
   ```bash
   nohup python app.py > app.log 2>&1 &
   ```

5. **使用Gunicorn启动（推荐）**

   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app --timeout 120
   ```

6. **重启Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

### 配置系统自启动

#### 方法一：使用Systemd（推荐）

1. **创建服务文件**

   创建文件 `/etc/systemd/system/toolsbox.service`:
   
   ```ini
   [Unit]
   Description=ToolsBox Flask服务
   After=network.target

   [Service]
   User=www-data  # 或者您的用户名
   WorkingDirectory=/path/to/your/app  # 改为实际路径
   ExecStart=/path/to/your/app/start.sh
   Restart=always
   RestartSec=5
   StandardOutput=append:/var/log/toolsbox.log
   StandardError=append:/var/log/toolsbox.err

   [Install]
   WantedBy=multi-user.target
   ```

2. **启用服务**

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable toolsbox.service
   sudo systemctl start toolsbox.service
   ```

3. **查看服务状态**

   ```bash
   sudo systemctl status toolsbox.service
   ```

#### 方法二：使用Supervisor

1. **安装Supervisor**

   ```bash
   sudo apt-get install supervisor
   ```

2. **创建配置文件**

   创建文件 `/etc/supervisor/conf.d/toolsbox.conf`:
   
   ```ini
   [program:toolsbox]
   directory=/path/to/your/app  ; 改为实际路径
   command=/path/to/your/app/start.sh
   autostart=true
   autorestart=true
   stderr_logfile=/var/log/toolsbox.err.log
   stdout_logfile=/var/log/toolsbox.out.log
   user=www-data  ; 或者您的用户名
   ```

3. **启动服务**

   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start toolsbox
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
   - 查看 `域名配置说明.md` 获取更多详细信息

5. **上传发布**
   - 在开发者工具中点击"上传"
   - 在微信公众平台提交审核发布

## 服务器维护

### 日志查看

查看应用日志：
```bash
tail -f app.log
```

查看Nginx错误日志：
```bash
sudo tail -f /var/log/nginx/error.log
```

### 故障排除

如遇502错误，请参考 `服务器故障排除指南.md` 文件进行排查。

如小程序启动问题，请参考 `微信小程序真机启动问题排查.md` 文件。

### 服务重启

重启Flask应用：
```bash
# 如果使用systemd
sudo systemctl restart toolsbox.service

# 如果使用supervisor
sudo supervisorctl restart toolsbox
```

## 注意事项

- 识别准确度受图片质量影响，请确保上传清晰的图片
- PDF转Word功能对于复杂排版的文档可能效果不佳
- 文本比较功能适用于短到中等长度的文本，过长的文本可能影响性能
- 后端服务需要配置足够的内存以支持图像处理和OCR功能
- 批量重命名功能对文件数量有限制，建议一次处理不超过50个文件
- 默认配置下，所有上传和生成的文件都会在5分钟后自动清理

## 更新日志

### 2025-03-21
- 升级Markdown转换工具，增加转换为PDF的功能
- 添加美观的PDF输出样式，保留Markdown格式
- 添加Markdown转Word功能，支持将Markdown文档转换为Word格式
- 为Markdown转换工具添加对应的mdToWord.svg图标
- 移除所有工具页面中的调试信息区域，使界面更加简洁
- 优化各功能页面的提示信息，增强用户体验
- 修复网络连接检测功能，增加断网提示
- 统一所有工具页面的样式和交互方式
- 添加PDF拆分合并功能，支持多PDF合并和按页码拆分
- 为PDF拆分合并功能添加对应图标
- 优化PDF操作相关功能的处理逻辑
- 修复大型PDF文件处理时的内存占用问题
- 添加服务器故障排除指南和微信小程序问题排查指南
- 添加全局文件清理功能，自动删除超过5分钟的临时文件

### 2025-03-20
- 添加批量重命名与打包功能，支持多文件批量重命名和打包下载
- 为新功能添加batchRename.svg图标
- 优化现有按钮样式，统一各工具界面的视觉效果
- 更新基础库版本至3.3.4，解决部分旧版兼容性问题

### 2025-03-19
- 将工具图标改为使用本地SVG文件，不再使用网络链接
- 添加images/icons目录用于存放工具图标
- 为每个工具创建独特的SVG图标，提升用户界面美观度
- 优化下载功能，修复了下载按钮绑定错误的问题

## 错误排查

- **上传失败**：检查网络连接和文件大小（最大支持20MB）
- **识别不准确**：尝试上传更清晰的图片或调整图片角度
- **服务器错误**：查看后端日志 `tail -f app.log`
- **转换超时**：对于大型文件，可能需要更长的处理时间
- **基础库错误**：遇到"Trace is not defined"等错误时，尝试更新到最新基础库版本 