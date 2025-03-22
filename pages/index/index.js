/*
 * @Date: 2025-03-19 19:37:56
 * @Author: Sube
 * @FilePath: index.js
 * @LastEditTime: 2025-03-20 00:44:54
 * @Description: 
 */
// index.js
Page({
    data: {
        tools: [
            {
                id: 'imageToExcel',
                name: '图片转Excel',
                icon: '/images/icons/imageToExcel.svg', // 改为本地文件路径
                description: '上传图片自动转换为Excel表格',
                path: '/pages/tools/imageToExcel/imageToExcel'
            },
            {
                id: 'imageToPdf',
                name: '图片转PDF',
                icon: '/images/icons/imageToPdf.svg', // 改为本地文件路径
                description: '上传图片快速转换为PDF文档',
                path: '/pages/tools/imageToPdf/imageToPdf'
            },
            {
                id: 'pdfToWord',
                name: 'PDF转Word',
                icon: '/images/icons/pdfToWord.svg', // 改为本地文件路径
                description: '将PDF文档转换为可编辑的Word文件',
                path: '/pages/tools/pdfToWord/pdfToWord'
            },
            {
                id: 'pdfSplitMerge',
                name: 'PDF拆分合并',
                icon: '/images/icons/pdfSplitMerge.svg', // 改为本地文件路径
                description: '拆分或合并PDF文件',
                path: '/pages/tools/pdfSplitMerge/pdfSplitMerge'
            },
            {
                id: 'mdToWord',
                name: 'Markdown转换工具',
                icon: '/images/icons/mdToWord.svg', // 改为本地文件路径
                description: '将Markdown转换为Word或PDF格式',
                path: '/pages/tools/mdToWord/mdToWord'
            },
            {
                id: 'textCompare',
                name: '文本比较工具',
                icon: '/images/icons/textCompare.svg', // 改为本地文件路径
                description: '对比两段文本，突出显示差异',
                path: '/pages/tools/textCompare/textCompare'
            },
            {
                id: 'fileCompression',
                name: '文件压缩工具',
                icon: '/images/icons/fileCompression.svg', // 改为本地文件路径
                description: '压缩文件为ZIP或7Z格式',
                path: '/pages/tools/fileCompression/fileCompression'
            },
            {
                id: 'batchRename',
                name: '批量重命名与打包',
                icon: '/images/icons/batchRename.svg', // 改为本地文件路径
                description: '选择文件批量重命名并打包下载',
                path: '/pages/tools/batchRename/batchRename'
            },
            {
                id: 'handheldDanmaku',
                name: '手持弹幕工具',
                icon: '/images/icons/handheldDanmaku.svg',
                description: '创建自定义弹幕，支持多种样式和效果',
                path: '/pages/tools/handheldDanmaku/handheldDanmaku'
            }
            // 未来可以在这里添加更多工具
        ],
        loading: true,
        error: '',
        networkType: ''
    },

    onLoad: function () {
        try {
            // 收集系统信息用于调试
            const systemInfo = wx.getSystemInfoSync();
            console.log('系统信息:', systemInfo);

            // 检查网络状态
            this.getNetworkStatus();
        } catch (e) {
            console.error('页面加载出错:', e);
            this.setData({
                loading: false,
                error: '页面加载出错，请重试'
            });
        }
    },

    // 获取网络状态
    getNetworkStatus: function () {
        wx.getNetworkType({
            success: (res) => {
                this.setData({
                    networkType: res.networkType,
                    loading: false
                });

                if (res.networkType === 'none') {
                    this.setData({
                        error: '网络连接已断开，请检查网络设置'
                    });
                }
            },
            fail: (err) => {
                console.error('获取网络状态失败:', err);
                this.setData({
                    loading: false,
                    error: '网络状态检测失败'
                });
            }
        });
    },

    // 重试加载
    retryLoad: function () {
        this.setData({
            loading: true,
            error: ''
        });

        this.getNetworkStatus();
    },

    navigateToTool: function (e) {
        if (this.data.networkType === 'none') {
            wx.showToast({
                title: '无网络连接，请检查网络设置',
                icon: 'none',
                duration: 2000
            });
            return;
        }

        const toolId = e.currentTarget.dataset.id;
        const tool = this.data.tools.find(item => item.id === toolId);
        if (tool) {
            wx.navigateTo({
                url: tool.path,
                fail: (err) => {
                    console.error('页面跳转失败:', err);
                    wx.showToast({
                        title: '页面跳转失败，请重试',
                        icon: 'none',
                        duration: 2000
                    });
                }
            });
        }
    },

    onError: function (error) {
        console.error('小程序发生错误:', error);
        this.setData({
            loading: false,
            error: '程序运行错误，请重启小程序'
        });
    }
}) 