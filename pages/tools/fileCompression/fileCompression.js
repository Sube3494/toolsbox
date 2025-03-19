Page({
    data: {
        files: [],
        format: 'zip', // 默认zip格式
        formatName: 'ZIP',
        processing: false,
        result: null,
        errorMsg: '',
        networkType: '',
        isIOS: false,
        isAndroid: false
    },

    onLoad: function () {
        // 获取系统信息
        const systemInfo = wx.getSystemInfoSync();
        this.setData({
            isIOS: systemInfo.platform === 'ios',
            isAndroid: systemInfo.platform === 'android'
        });

        // 获取初始网络状态
        this.getNetworkStatus();

        // 开始监听网络状态
        this.startNetworkMonitoring();

        // 检查文件权限
        this.checkFilePermission();
    },

    // 检查文件权限
    checkFilePermission: function () {
        wx.getSetting({
            success: (res) => {
                if (!res.authSetting['scope.writePhotosAlbum']) {
                    console.log("需要请求写入相册权限");
                    // 仅在需要时请求权限
                }
            }
        });
    },

    // 请求文件写入权限
    requestFilePermission: function (callback) {
        wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: function () {
                console.log('获取文件写入权限成功');
                if (callback) callback(true);
            },
            fail: function () {
                console.log('获取文件写入权限失败');
                wx.showModal({
                    title: '提示',
                    content: '需要您授权保存文件，是否前往设置开启授权？',
                    success: function (res) {
                        if (res.confirm) {
                            wx.openSetting({
                                success: function (settingRes) {
                                    if (settingRes.authSetting['scope.writePhotosAlbum']) {
                                        if (callback) callback(true);
                                    } else {
                                        if (callback) callback(false);
                                    }
                                }
                            });
                        } else {
                            if (callback) callback(false);
                        }
                    }
                });
            }
        });
    },

    // 选择压缩格式
    formatChange: function (e) {
        const format = e.detail.value;
        const formatName = format === 'zip' ? 'ZIP' : '7Z';
        this.setData({
            format: format,
            formatName: formatName
        });
    },

    // 在选择文件前检查和请求权限
    checkPermissionBeforeAction: function (action) {
        const that = this;

        // 检查相册写入权限
        wx.getSetting({
            success: (res) => {
                // 如果尚未授权相册权限
                if (!res.authSetting['scope.writePhotosAlbum']) {
                    // 请求相册写入权限
                    wx.authorize({
                        scope: 'scope.writePhotosAlbum',
                        success: () => {
                            // 用户已经同意
                            console.log('用户已授权相册写入权限');
                            // 继续执行原来的操作
                            action.call(that);
                        },
                        fail: (err) => {
                            console.log('相册写入权限请求被拒绝', err);
                            // 引导用户去设置界面开启权限
                            wx.showModal({
                                title: '提示',
                                content: '需要相册权限才能保存文件，请在设置中开启',
                                confirmText: '去设置',
                                cancelText: '取消',
                                success: (res) => {
                                    if (res.confirm) {
                                        wx.openSetting({
                                            success: (settingRes) => {
                                                console.log('设置结果', settingRes);
                                                if (settingRes.authSetting['scope.writePhotosAlbum']) {
                                                    // 用户在设置页中开启了权限
                                                    console.log('用户在设置中开启了相册权限');
                                                    // 继续执行原来的操作
                                                    action.call(that);
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                } else {
                    // 已有权限，直接执行
                    action.call(that);
                }
            },
            fail: (err) => {
                console.error('获取权限设置失败', err);
                // 出错时也尝试执行原操作
                action.call(that);
            }
        });
    },

    // 选择文件
    chooseFiles: function () {
        // 通过权限检查包装器调用
        this.checkPermissionBeforeAction(function () {
            const that = this;
            wx.chooseMessageFile({
                count: 10,
                type: 'file',
                success: function (res) {
                    console.log('选择的文件:', res.tempFiles);
                    that.setData({
                        files: res.tempFiles,
                        selectedFiles: res.tempFiles,
                        errorMsg: ''
                    });
                },
                fail: function (err) {
                    console.log('选择文件失败', err);
                    if (err.errMsg !== 'chooseMessageFile:fail cancel') {
                        that.setData({
                            errorMsg: '选择文件失败: ' + err.errMsg
                        });
                    }
                }
            });
        });
    },

    // 删除文件
    deleteFile: function (e) {
        const index = e.currentTarget.dataset.index;
        const files = this.data.files;
        files.splice(index, 1);
        this.setData({
            files: files
        });
    },

    // 文件大小格式化
    formatFileSize: function (size) {
        if (size < 1024) {
            return size + 'B';
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + 'KB';
        } else {
            return (size / (1024 * 1024)).toFixed(2) + 'MB';
        }
    },

    // 压缩文件
    compressFiles: function () {
        if (this.data.files.length === 0) {
            this.setData({
                errorMsg: '请选择要压缩的文件'
            });
            return;
        }

        this.setData({
            processing: true,
            errorMsg: ''
        });

        // 上传多个文件需要一个一个上传
        this.uploadFiles(0);
    },

    // 递归上传文件
    uploadFiles: function (index) {
        if (index >= this.data.files.length) {
            // 所有文件上传完毕，开始压缩
            this.startCompression();
            return;
        }

        const file = this.data.files[index];
        const that = this;

        wx.uploadFile({
            url: 'https://excel.sube.top/upload-file',
            filePath: file.path,
            name: 'file',
            formData: {
                'index': index,
                'fileName': file.name
            },
            success: function (res) {
                console.log(`第${index + 1}个文件上传响应:`, res);

                try {
                    // 检查HTTP状态码
                    if (res.statusCode !== 200) {
                        console.error(`上传文件失败, 状态码: ${res.statusCode}, 响应数据:`, res.data);
                        that.setData({
                            errorMsg: `服务器返回错误状态: ${res.statusCode}`,
                            processing: false
                        });
                        return;
                    }

                    // 尝试解析返回数据
                    let result;
                    if (typeof res.data === 'string') {
                        // 检查是否为JSON格式
                        if (res.data.trim().startsWith('{') || res.data.trim().startsWith('[')) {
                            result = JSON.parse(res.data);
                        } else {
                            console.error(`非JSON格式响应:`, res.data);
                            that.setData({
                                errorMsg: '服务器返回了非JSON格式的数据',
                                processing: false
                            });
                            return;
                        }
                    } else {
                        result = res.data;
                    }

                    if (result && result.success) {
                        // 上传成功，继续上传下一个文件
                        that.uploadFiles(index + 1);
                    } else {
                        that.setData({
                            errorMsg: result?.message || '上传失败',
                            processing: false
                        });
                    }
                } catch (e) {
                    console.error('解析响应数据错误:', e, '原始数据:', res.data);
                    that.setData({
                        errorMsg: '服务器响应解析错误，请稍后重试',
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

    // 开始压缩文件
    startCompression: function () {
        const that = this;

        wx.request({
            url: 'https://excel.sube.top/compress',
            method: 'POST',
            data: {
                format: this.data.format
            },
            success: function (res) {
                try {
                    // 检查响应数据
                    if (res.statusCode !== 200) {
                        console.error('压缩请求失败, 状态码:', res.statusCode, '响应数据:', res.data);
                        that.setData({
                            errorMsg: `服务器返回错误状态: ${res.statusCode}`,
                            processing: false
                        });
                        return;
                    }

                    if (res.data && res.data.success) {
                        that.setData({
                            result: res.data.data,
                            processing: false
                        });
                    } else {
                        that.setData({
                            errorMsg: res.data?.message || '压缩失败，请重试',
                            processing: false
                        });
                    }
                } catch (e) {
                    console.error('处理压缩响应出错:', e);
                    that.setData({
                        errorMsg: '处理响应数据出错',
                        processing: false
                    });
                }
            },
            fail: function (err) {
                console.error('压缩请求失败', err);
                that.setData({
                    errorMsg: '网络错误，请重试',
                    processing: false
                });
            }
        });
    },

    // 下载压缩文件
    downloadArchive: function () {
        console.log('downloadArchive函数被调用');
        console.log('当前result数据:', this.data.result);

        // 通过权限检查包装器调用
        this.checkPermissionBeforeAction(function () {
            console.log('通过权限检查，开始下载流程');

            // 检查是否有可下载的文件
            if (!this.data.result || !this.data.result.fileUrl) {
                console.error('文件URL不存在:', this.data.result);
                wx.showToast({
                    title: '没有可下载的文件',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }

            // 检查网络状态
            if (this.data.networkType === 'none') {
                wx.showToast({
                    title: '无网络连接，请检查网络设置',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }

            wx.showLoading({
                title: '下载中...',
                mask: true
            });

            const that = this;
            wx.downloadFile({
                url: this.data.result.fileUrl,
                success: function (res) {
                    wx.hideLoading();

                    // 检查HTTP状态码
                    if (res.statusCode !== 200) {
                        let errorMsg = '';

                        // 对特定错误进行处理
                        if (res.statusCode === 502) {
                            errorMsg = '服务器暂时不可用(502)，请稍后重试';
                            console.error('下载压缩文件时服务器返回502错误');
                        } else if (res.statusCode === 404) {
                            errorMsg = '文件不存在(404)，请重新压缩';
                        } else {
                            errorMsg = `下载失败(${res.statusCode})`;
                        }

                        wx.showModal({
                            title: '下载失败',
                            content: errorMsg,
                            showCancel: false
                        });
                        return;
                    }

                    // 成功下载
                    const tempFilePath = res.tempFilePath;

                    // 检查文件是否为空或无效
                    if (res.dataLength === 0) {
                        wx.showModal({
                            title: '文件错误',
                            content: '下载的文件为空，请重新压缩',
                            showCancel: false
                        });
                        return;
                    }

                    try {
                        // 保存文件
                        wx.saveFile({
                            tempFilePath: tempFilePath,
                            success: function (saveRes) {
                                const savedFilePath = saveRes.savedFilePath;

                                // 尝试打开文件
                                wx.openDocument({
                                    filePath: savedFilePath,
                                    showMenu: true,
                                    success: function () {
                                        wx.showToast({
                                            title: '文件已保存',
                                            icon: 'success',
                                            duration: 2000
                                        });
                                    },
                                    fail: function (err) {
                                        console.error('打开文档失败:', err);
                                        wx.showModal({
                                            title: '提示',
                                            content: '文件已保存，但无法直接打开。可以从文件管理器中查看。',
                                            showCancel: false
                                        });
                                    }
                                });
                            },
                            fail: function (err) {
                                console.error('保存文件失败:', err);

                                // 提供更具体的错误信息
                                let errorMsg = '无法保存文件，请确保授予了存储权限';
                                if (err.errMsg) {
                                    if (err.errMsg.includes('storage')) {
                                        errorMsg = '存储空间不足，请清理设备存储';
                                    } else if (err.errMsg.includes('permission')) {
                                        errorMsg = '缺少存储权限，请在设置中授权';
                                    }
                                }

                                wx.showModal({
                                    title: '保存失败',
                                    content: errorMsg,
                                    showCancel: false
                                });
                            }
                        });
                    } catch (e) {
                        console.error('文件操作异常:', e);
                        wx.showToast({
                            title: '文件操作异常',
                            icon: 'none',
                            duration: 2000
                        });
                    }
                },
                fail: function (err) {
                    wx.hideLoading();
                    console.error('下载文件失败:', err);

                    // 提供更具体的错误信息
                    let errorMsg = '网络错误或服务器无响应，请稍后重试';
                    if (err.errMsg) {
                        if (err.errMsg.includes('timeout')) {
                            errorMsg = '下载超时，请检查网络连接';
                        } else if (err.errMsg.includes('domain')) {
                            errorMsg = '域名访问受限，请检查小程序配置';
                        }
                    }

                    wx.showModal({
                        title: '下载失败',
                        content: errorMsg,
                        showCancel: false
                    });
                }
            });
        });
    }
}) 