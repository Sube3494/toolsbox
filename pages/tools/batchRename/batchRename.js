Page({
    data: {
        files: [],
        processing: false,
        result: null,
        errorMsg: '',
        isIOS: false,
        isAndroid: false,
        networkType: '',
        renamePattern: {
            prefix: 'file_',
            useIndex: true,
            startIndex: 1,
            suffix: '',
            extension: '',
            changeExtension: false
        }
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
    },

    onShow: function () {
        // 页面显示时，再次获取网络状态
        this.getNetworkStatus();

        // 如果之前没有启动网络监听，则启动
        if (!this.networkChangeListenerStarted) {
            this.startNetworkMonitoring();
        }
    },

    onHide: function () {
        // 页面隐藏时，可以选择停止网络监听
    },

    onUnload: function () {
        // 页面卸载时，停止网络监听
        this.stopNetworkMonitoring();
    },

    // 获取网络状态
    getNetworkStatus: function () {
        wx.getNetworkType({
            success: (res) => {
                this.setData({
                    networkType: res.networkType
                });

                // 如果无网络，显示提示
                if (res.networkType === 'none') {
                    wx.showToast({
                        title: '当前无网络连接',
                        icon: 'none',
                        duration: 2000
                    });
                }
            }
        });
    },

    // 开始监听网络变化
    startNetworkMonitoring: function () {
        // 避免重复监听
        if (this.networkChangeListenerStarted) {
            return;
        }

        // 监听网络状态变化
        wx.onNetworkStatusChange((res) => {
            this.setData({
                networkType: res.networkType
            });

            if (res.networkType === 'none') {
                wx.showToast({
                    title: '网络连接已断开',
                    icon: 'none',
                    duration: 2000
                });
            } else {
                wx.showToast({
                    title: '网络已连接',
                    icon: 'success',
                    duration: 1000
                });
            }
        });

        this.networkChangeListenerStarted = true;
    },

    // 停止监听网络变化
    stopNetworkMonitoring: function () {
        if (this.networkChangeListenerStarted) {
            wx.offNetworkStatusChange();
            this.networkChangeListenerStarted = false;
        }
    },

    // 选择文件
    chooseFiles: function () {
        const that = this;

        wx.showActionSheet({
            itemList: ['从聊天中选择', '从相册选择', '拍照'],
            success: function (res) {
                let option = res.tapIndex;

                // 根据选择的选项执行相应操作
                switch (option) {
                    case 0: // 从聊天中选择
                        that.chooseFromChat();
                        break;
                    case 1: // 从相册选择
                        that.chooseFromAlbum();
                        break;
                    case 2: // 拍照
                        that.chooseFromCamera();
                        break;
                }
            }
        });
    },

    // 从聊天中选择文件
    chooseFromChat: function () {
        const that = this;
        wx.chooseMessageFile({
            count: 9,
            type: 'all',
            success: function (res) {
                console.log('从聊天中选择的文件:', res.tempFiles);
                that.processSelectedFiles(res.tempFiles, 'chat');
            },
            fail: function (err) {
                if (err.errMsg !== 'chooseMessageFile:fail cancel') {
                    console.error('从聊天选择文件失败', err);
                    that.setData({
                        errorMsg: '选择文件失败: ' + err.errMsg
                    });
                }
            }
        });
    },

    // 从相册选择图片
    chooseFromAlbum: function () {
        const that = this;
        wx.chooseMedia({
            count: 9,
            mediaType: ['image'],
            sourceType: ['album'],
            success: function (res) {
                console.log('从相册选择的图片:', res.tempFiles);
                that.processSelectedFiles(res.tempFiles, 'album');
            },
            fail: function (err) {
                if (err.errMsg !== 'chooseMedia:fail cancel') {
                    console.error('从相册选择图片失败', err);
                    that.setData({
                        errorMsg: '选择图片失败: ' + err.errMsg
                    });
                }
            }
        });
    },

    // 拍照获取图片
    chooseFromCamera: function () {
        const that = this;
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['camera'],
            success: function (res) {
                console.log('拍照获取的图片:', res.tempFiles);
                that.processSelectedFiles(res.tempFiles, 'camera');
            },
            fail: function (err) {
                if (err.errMsg !== 'chooseMedia:fail cancel') {
                    console.error('拍照获取图片失败', err);
                    that.setData({
                        errorMsg: '拍照失败: ' + err.errMsg
                    });
                }
            }
        });
    },

    // 处理选择的文件
    processSelectedFiles: function (tempFiles, source) {
        const newFiles = tempFiles.map(file => {
            const originalName = file.name || this.getFileNameFromPath(file.tempFilePath || file.path);
            const extension = this.getFileExtension(originalName);
            const sizeStr = this.formatFileSize(file.size);
            const fileName = this.removeExtension(originalName);

            return {
                path: file.tempFilePath || file.path,
                originalName: originalName,
                newName: fileName, // 默认使用原文件名（不含扩展名）
                extension: extension, // 原始扩展名
                newExtension: extension, // 用于修改的扩展名，初始与原始扩展名相同
                size: sizeStr,
                isImage: this.isImageFile(extension)
            };
        });

        this.setData({
            files: [...this.data.files, ...newFiles],
            errorMsg: ''
        });
    },

    // 从路径中获取文件名
    getFileNameFromPath: function (path) {
        if (!path) return 'unknown_file';
        const parts = path.split('/');
        return parts[parts.length - 1];
    },

    // 获取文件扩展名
    getFileExtension: function (fileName) {
        if (!fileName) return '';
        const parts = fileName.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    },

    // 移除扩展名
    removeExtension: function (fileName) {
        if (!fileName) return '';
        const lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    },

    // 判断是否是图片文件
    isImageFile: function (extension) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        return imageExtensions.includes(extension.toLowerCase());
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

    // 删除文件
    deleteFile: function (e) {
        const index = e.currentTarget.dataset.index;
        const files = this.data.files;
        files.splice(index, 1);
        this.setData({
            files: files,
            result: null,
            errorMsg: ''
        });
    },

    // 单个文件名修改
    onFileNameChange: function (e) {
        const index = e.currentTarget.dataset.index;
        const newName = e.detail.value;
        const files = this.data.files;
        files[index].newName = newName;
        this.setData({
            files: files
        });
    },

    // 单个文件扩展名修改
    onFileExtensionChange: function (e) {
        const index = e.currentTarget.dataset.index;
        const newExtension = e.detail.value;
        const files = this.data.files;
        files[index].newExtension = newExtension;
        this.setData({
            files: files
        });
    },

    // 批量命名规则 - 前缀修改
    onPrefixChange: function (e) {
        this.setData({
            'renamePattern.prefix': e.detail.value
        });
    },

    // 批量命名规则 - 是否使用序号
    onUseIndexChange: function (e) {
        this.setData({
            'renamePattern.useIndex': e.detail.value
        });
    },

    // 批量命名规则 - 起始序号
    onStartIndexChange: function (e) {
        const value = parseInt(e.detail.value) || 1;
        this.setData({
            'renamePattern.startIndex': value
        });
    },

    // 批量命名规则 - 后缀修改
    onSuffixChange: function (e) {
        this.setData({
            'renamePattern.suffix': e.detail.value
        });
    },

    // 批量命名规则 - 是否修改扩展名
    onChangeExtensionChange: function (e) {
        this.setData({
            'renamePattern.changeExtension': e.detail.value
        });
    },

    // 批量命名规则 - 新扩展名
    onExtensionChange: function (e) {
        this.setData({
            'renamePattern.extension': e.detail.value
        });
    },

    // 应用批量命名
    applyBatchRename: function () {
        const { prefix, useIndex, startIndex, suffix, extension, changeExtension } = this.data.renamePattern;
        const files = this.data.files;

        if (files.length === 0) {
            wx.showToast({
                title: '没有文件可重命名',
                icon: 'none'
            });
            return;
        }

        const updatedFiles = files.map((file, index) => {
            let newName = prefix;
            if (useIndex) {
                newName += (startIndex + index);
            }
            newName += suffix;

            // 如果启用了扩展名修改，则应用新扩展名
            let newExtension = file.newExtension;
            if (changeExtension && extension.trim()) {
                newExtension = extension.trim();
            }

            return {
                ...file,
                newName: newName,
                newExtension: newExtension
            };
        });

        this.setData({
            files: updatedFiles
        });

        wx.showToast({
            title: '批量重命名成功',
            icon: 'success'
        });
    },

    // 压缩和下载文件
    compressFiles: function () {
        if (this.data.files.length === 0) {
            this.setData({
                errorMsg: '请选择要处理的文件'
            });
            return;
        }

        // 检查网络状态
        if (this.data.networkType === 'none') {
            this.setData({
                errorMsg: '当前无网络连接，请检查网络设置'
            });
            return;
        }

        this.setData({
            processing: true,
            errorMsg: '',
            result: null
        });

        console.log('开始处理文件，总数量:', this.data.files.length);

        // 创建上传任务
        const uploadTasks = this.data.files.map((file, index) => {
            return this.uploadSingleFile(file, index);
        });

        Promise.all(uploadTasks)
            .then(results => {
                console.log('所有文件上传成功，结果:', results);

                // 构建文件信息数组，用于服务器端处理
                const fileInfos = this.buildFileInfos(this.data.files, results);

                console.log('发送到服务器的文件信息:', fileInfos);

                // 向服务器发送压缩请求
                this.requestCompression(fileInfos);
            })
            .catch(error => {
                console.error('上传过程中出错', error);
                this.setData({
                    errorMsg: '文件上传失败: ' + (error.message || '未知错误'),
                    processing: false
                });

                // 向用户提供更详细的错误提示
                wx.showModal({
                    title: '上传失败',
                    content: '文件上传过程中出现错误，请检查网络连接并重试。如果问题持续存在，请联系客服。',
                    showCancel: false
                });
            });
    },

    // 构建发送到服务器的文件信息
    buildFileInfos: function (files, results) {
        return files.map((file, index) => {
            let serverFileId = '';
            try {
                serverFileId = results[index].fileId || '';
            } catch (e) {
                console.error('无法获取fileId，使用默认值', e);
            }

            return {
                // 使用与fileCompression工具相同的字段命名
                path: serverFileId, // 服务器存储的文件ID
                name: file.newName + '.' + file.newExtension, // 使用新文件名和新扩展名
                originalName: file.originalName || '', // 原始文件名
                size: file.size || '0KB', // 文件大小
                type: file.newExtension || '' // 新的扩展名作为文件类型
            };
        });
    },

    // 上传单个文件
    uploadSingleFile: function (file, index) {
        const that = this;

        return new Promise((resolve, reject) => {
            wx.uploadFile({
                url: 'https://excel.sube.top/upload-file',
                filePath: file.path,
                name: 'file',
                formData: {
                    // 使用新的文件名和新的扩展名
                    fileName: file.newName + '.' + file.newExtension,
                    index: index
                },
                success: function (res) {
                    console.log(`第${index + 1}个文件上传响应:`, res);

                    if (res.statusCode !== 200) {
                        let errorMsg = `服务器返回错误(${res.statusCode})`;
                        reject(new Error(errorMsg));
                        return;
                    }

                    try {
                        let result;
                        if (typeof res.data === 'string') {
                            if (res.data.trim().startsWith('{') || res.data.trim().startsWith('[')) {
                                result = JSON.parse(res.data);
                            } else {
                                reject(new Error('服务器返回了非JSON格式的数据'));
                                return;
                            }
                        } else {
                            result = res.data;
                        }

                        if (result && result.success) {
                            resolve(result.data);
                        } else {
                            reject(new Error(result?.message || '上传失败'));
                        }
                    } catch (e) {
                        console.error('解析响应数据出错:', e);
                        reject(new Error('解析服务器响应失败'));
                    }
                },
                fail: function (err) {
                    console.error(`第${index + 1}个文件上传失败:`, err);
                    reject(new Error('网络请求失败'));
                }
            });
        });
    },

    // 请求服务器压缩文件
    requestCompression: function (fileInfos) {
        const that = this;

        console.log('发送压缩请求，文件信息:', fileInfos);

        // 构造请求数据，匹配服务器期望的格式
        const requestData = {
            files: fileInfos,
            format: 'zip', // 固定使用zip格式
            name: 'renamed_files' // 不包含扩展名
        };

        console.log('压缩请求数据:', requestData);

        wx.request({
            url: 'https://excel.sube.top/compress',
            method: 'POST',
            data: requestData,
            success: function (res) {
                console.log('压缩请求响应:', res);

                if (res.statusCode !== 200) {
                    let errorMsg = `服务器返回错误(${res.statusCode})`;
                    let extraInfo = '';

                    // 针对常见错误码提供更具体的提示
                    if (res.statusCode === 404) {
                        extraInfo = '服务器接口不存在，请联系管理员检查API路径配置';
                    } else if (res.statusCode === 502) {
                        extraInfo = '服务器暂时不可用，请稍后重试';
                    } else if (res.statusCode === 413) {
                        extraInfo = '文件过大，超出服务器处理限制';
                    }

                    if (extraInfo) {
                        errorMsg += ' - ' + extraInfo;
                    }

                    that.setData({
                        errorMsg: errorMsg,
                        processing: false
                    });

                    // 显示详细错误对话框
                    wx.showModal({
                        title: '压缩失败',
                        content: errorMsg,
                        showCancel: false
                    });

                    return;
                }

                try {
                    if (res.data && res.data.success) {
                        // 确保结果数据中包含下载URL，如果服务器返回的是fileUrl字段，则转换为downloadUrl
                        let resultData = res.data.data || {};
                        if (resultData.fileUrl && !resultData.downloadUrl) {
                            resultData.downloadUrl = resultData.fileUrl;
                        }

                        that.setData({
                            result: resultData,
                            processing: false,
                            errorMsg: ''
                        });

                        console.log('处理后的结果对象:', resultData);

                        // 显示成功提示
                        wx.showToast({
                            title: '处理成功',
                            icon: 'success',
                            duration: 2000
                        });
                    } else {
                        that.setData({
                            errorMsg: res.data?.message || '压缩失败',
                            processing: false
                        });

                        // 显示失败提示
                        wx.showModal({
                            title: '处理失败',
                            content: res.data?.message || '服务器处理失败，请重试',
                            showCancel: false
                        });
                    }
                } catch (e) {
                    console.error('处理压缩响应出错:', e);
                    that.setData({
                        errorMsg: '处理服务器响应失败',
                        processing: false
                    });
                }
            },
            fail: function (err) {
                console.error('压缩请求失败:', err);
                that.setData({
                    errorMsg: '网络请求失败，无法完成压缩',
                    processing: false
                });

                // 显示网络错误提示
                wx.showModal({
                    title: '网络错误',
                    content: '无法连接到服务器，请检查网络连接并重试',
                    showCancel: false
                });
            }
        });
    },

    // 下载ZIP文件
    downloadZip: function () {
        const that = this;

        // 检查网络状态
        if (this.data.networkType === 'none') {
            wx.showToast({
                title: '无网络连接',
                icon: 'none',
                duration: 2000
            });
            return;
        }

        // 检查结果对象，考虑可能的不同字段名称
        let downloadUrl = null;
        if (this.data.result) {
            downloadUrl = this.data.result.downloadUrl || this.data.result.fileUrl;
        }

        if (!downloadUrl) {
            console.error('下载链接不存在，结果对象:', this.data.result);
            wx.showModal({
                title: '无法下载',
                content: '没有有效的文件下载链接。请重试压缩操作或联系客服。',
                showCancel: false
            });
            return;
        }

        console.log('开始下载文件，URL:', downloadUrl);

        wx.showLoading({
            title: '下载中...',
        });

        // 使用下载API
        wx.downloadFile({
            url: downloadUrl,
            success: function (res) {
                wx.hideLoading();
                console.log('下载响应:', res);

                if (res.statusCode !== 200) {
                    let errorMsg = `服务器返回错误(${res.statusCode})`;
                    let extraInfo = '';

                    // 针对常见错误码提供更具体的提示
                    if (res.statusCode === 404) {
                        extraInfo = '文件不存在，可能已被删除或链接已过期';
                    } else if (res.statusCode === 502) {
                        extraInfo = '服务器暂时不可用，请稍后重试';
                    }

                    if (extraInfo) {
                        errorMsg += '\n' + extraInfo;
                    }

                    wx.showModal({
                        title: '下载失败',
                        content: errorMsg,
                        showCancel: false
                    });
                    return;
                }

                const tempFilePath = res.tempFilePath;

                // 打开文件
                wx.openDocument({
                    filePath: tempFilePath,
                    showMenu: true,
                    success: function () {
                        wx.showToast({
                            title: '文件已打开',
                            icon: 'success'
                        });
                    },
                    fail: function (err) {
                        console.error('打开文件失败:', err);

                        // 尝试保存文件
                        that.saveFile(tempFilePath);
                    }
                });
            },
            fail: function (err) {
                wx.hideLoading();
                console.error('下载文件失败:', err);
                wx.showModal({
                    title: '下载失败',
                    content: '网络错误或服务器无响应，请重试',
                    showCancel: false
                });
            }
        });
    },

    // 保存文件到本地
    saveFile: function (tempFilePath) {
        wx.saveFile({
            tempFilePath: tempFilePath,
            success: function (res) {
                const savedFilePath = res.savedFilePath;
                wx.showModal({
                    title: '文件已保存',
                    content: '文件已保存到本地，但无法直接打开。您可以从文件管理器中查看。',
                    showCancel: false
                });
            },
            fail: function (err) {
                console.error('保存文件失败:', err);
                wx.showModal({
                    title: '保存失败',
                    content: '无法保存文件，请确保有足够的存储空间并授予了存储权限。',
                    showCancel: false
                });
            }
        });
    },

    // 复制链接到剪贴板
    copyLink: function (e) {
        const url = e.currentTarget.dataset.url;
        if (url) {
            wx.setClipboardData({
                data: url,
                success: function () {
                    wx.showToast({
                        title: '链接已复制',
                        icon: 'success',
                        duration: 1500
                    });
                }
            });
        }
    }
}) 