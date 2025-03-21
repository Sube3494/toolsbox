Page({
    data: {
        mdPath: '',
        mdName: '',
        mdSize: '',
        mdSelected: false,
        processing: false,
        result: null,
        errorMsg: '',
        isIOS: false,
        isAndroid: false,
        networkType: '',
        outputFormat: 'word' // 默认转换格式为Word
    },

    onLoad: function () {
        // 获取系统信息
        const systemInfo = wx.getSystemInfoSync();
        this.setData({
            isIOS: systemInfo.platform === 'ios',
            isAndroid: systemInfo.platform === 'android'
        });

        // 获取网络状态
        wx.getNetworkType({
            success: (res) => {
                this.setData({
                    networkType: res.networkType
                });
            }
        });
    },

    // 选择输出格式
    onFormatChange: function (e) {
        this.setData({
            outputFormat: e.detail.value
        });
        // 如果已经有结果，清除结果，因为格式变了
        if (this.data.result) {
            this.setData({
                result: null
            });
        }
    },

    // 选择Markdown文件
    chooseMd: function () {
        const that = this;
        wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['md', 'markdown'],
            success: function (res) {
                const file = res.tempFiles[0];

                // 检查是否是Markdown文件
                if (!file.name.toLowerCase().endsWith('.md') && !file.name.toLowerCase().endsWith('.markdown')) {
                    that.setData({
                        errorMsg: '请选择Markdown格式的文件'
                    });
                    return;
                }

                // 计算文件大小的显示值
                let sizeStr;
                const size = file.size;

                if (size < 1024) {
                    sizeStr = size + 'B';
                } else if (size < 1024 * 1024) {
                    sizeStr = (size / 1024).toFixed(2) + 'KB';
                } else {
                    sizeStr = (size / (1024 * 1024)).toFixed(2) + 'MB';
                }

                that.setData({
                    mdPath: file.path,
                    mdName: file.name,
                    mdSize: sizeStr,
                    mdSelected: true,
                    errorMsg: '',
                    result: null
                });
            },
            fail: function (err) {
                console.error('选择Markdown失败', err);
            }
        });
    },

    // 处理Markdown文件
    processMd: function () {
        if (!this.data.mdSelected) {
            this.setData({
                errorMsg: '请先选择Markdown文件'
            });
            return;
        }

        this.setData({
            processing: true,
            errorMsg: ''
        });

        const that = this;

        // 根据选择的格式确定API端点
        const apiEndpoint = this.data.outputFormat === 'word' ?
            'https://excel.sube.top/md-to-word' :
            'https://excel.sube.top/md-to-pdf';

        // 上传Markdown文件到服务器处理
        wx.uploadFile({
            url: apiEndpoint,
            filePath: this.data.mdPath,
            name: 'md',
            success: function (res) {
                try {
                    const result = JSON.parse(res.data);
                    if (result.success) {
                        that.setData({
                            result: result.data,
                            processing: false
                        });
                    } else {
                        that.setData({
                            errorMsg: result.message || '处理失败',
                            processing: false
                        });
                    }
                } catch (e) {
                    console.error('解析错误:', e, res.data);
                    that.setData({
                        errorMsg: '返回数据格式错误，请联系管理员',
                        processing: false
                    });
                }
            },
            fail: function (err) {
                console.error('上传失败', err);
                that.setData({
                    errorMsg: '网络错误，请重试',
                    processing: false
                });
            }
        });
    },

    // 下载文件（Word或PDF）
    downloadFile: function () {
        if (!this.data.result) {
            wx.showToast({
                title: '无文件链接',
                icon: 'none'
            });
            return;
        }

        const fileUrl = this.data.outputFormat === 'word' ?
            this.data.result.wordUrl :
            this.data.result.pdfUrl;

        if (!fileUrl) {
            wx.showToast({
                title: '无文件链接',
                icon: 'none'
            });
            return;
        }

        wx.showLoading({
            title: '下载中...',
        });

        const that = this;

        // 使用下载API
        wx.downloadFile({
            url: fileUrl,
            success: function (res) {
                wx.hideLoading();

                if (res.statusCode === 200) {
                    const tempFilePath = res.tempFilePath;

                    // 文件名处理
                    const fileName = that.data.result.fileName ||
                        (that.data.outputFormat === 'word' ? 'word_document.docx' : 'document.pdf');

                    // 目标路径
                    const fsm = wx.getFileSystemManager();
                    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

                    try {
                        // 复制文件到用户目录
                        fsm.copyFileSync(tempFilePath, filePath);

                        // 打开文件
                        wx.openDocument({
                            filePath: filePath,
                            showMenu: true,
                            success: function () {
                                wx.showToast({
                                    title: that.data.outputFormat === 'word' ? 'Word已保存' : 'PDF已保存',
                                    icon: 'success'
                                });
                            },
                            fail: function (err) {
                                console.error('打开文件失败', err);
                                that.setData({
                                    errorMsg: '打开失败: ' + err.errMsg
                                });

                                // 尝试直接打开临时文件
                                wx.openDocument({
                                    filePath: tempFilePath,
                                    showMenu: true,
                                    success: function () {
                                        wx.showToast({
                                            title: '已打开文件',
                                            icon: 'success'
                                        });
                                    },
                                    fail: function (err) {
                                        wx.showToast({
                                            title: '文件处理失败',
                                            icon: 'none'
                                        });
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        console.error('文件操作异常', e);

                        // 尝试直接打开临时文件
                        wx.openDocument({
                            filePath: tempFilePath,
                            showMenu: true,
                            success: function () {
                                wx.showToast({
                                    title: '已打开文件',
                                    icon: 'success'
                                });
                            },
                            fail: function (err) {
                                wx.showToast({
                                    title: '文件处理失败',
                                    icon: 'none'
                                });
                            }
                        });
                    }
                }
            },
            fail: function (err) {
                wx.hideLoading();
                console.error('下载失败', err);
                that.setData({
                    errorMsg: '下载失败: ' + err.errMsg
                });
            }
        });
    }
}) 