Page({
  data: {
    activeTab: 'merge', // 当前活动的选项卡：'merge' 或 'split'

    // 合并PDF相关数据
    mergeFiles: [], // 要合并的PDF文件数组
    mergeErrorMsg: '', // 合并操作的错误信息
    mergeResult: null, // 合并结果对象

    // 拆分PDF相关数据
    splitFile: null, // 要拆分的PDF文件
    splitMethod: 'range', // 拆分方式：'range'(范围) 或 'single'(单页)
    splitRanges: [{ start: '', end: '' }], // 拆分范围数组
    splitErrorMsg: '', // 拆分操作的错误信息
    splitResult: null, // 拆分结果对象

    // 通用状态
    processing: false, // 是否正在处理
    networkType: '', // 网络状态
    isIOS: false, // 是否是iOS设备
    isAndroid: false // 是否是Android设备
  },

  onLoad: function () {
    // 检测设备类型
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      isIOS: systemInfo.platform === 'ios',
      isAndroid: systemInfo.platform === 'android'
    });

    // 监听网络状态
    this.getNetworkType();
    wx.onNetworkStatusChange(res => {
      this.setData({
        networkType: res.networkType
      });
    });
  },

  // 获取网络状态
  getNetworkType: function () {
    wx.getNetworkType({
      success: res => {
        this.setData({
          networkType: res.networkType
        });
      }
    });
  },

  // 切换选项卡
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // ========== PDF合并功能相关方法 ==========

  // 选择要合并的PDF文件
  chooseMergeFiles: function () {
    wx.chooseMessageFile({
      count: 10, // 最多可以选择的文件个数
      type: 'file',
      extension: ['pdf'],
      success: res => {
        const tempFiles = res.tempFiles;
        const newFiles = tempFiles.map(file => {
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

          return {
            path: file.path,
            name: file.name,
            size: sizeStr,
            originalSize: size
          };
        });

        // 合并现有文件和新选择的文件
        const mergeFiles = [...this.data.mergeFiles, ...newFiles];

        this.setData({
          mergeFiles: mergeFiles,
          mergeErrorMsg: ''
        });
      }
    });
  },

  // 删除合并文件列表中的文件
  deleteFile: function (e) {
    const tab = e.currentTarget.dataset.tab;
    const index = e.currentTarget.dataset.index;

    if (tab === 'merge') {
      const mergeFiles = this.data.mergeFiles;
      mergeFiles.splice(index, 1);
      this.setData({
        mergeFiles: mergeFiles
      });
    }
  },

  // 上移文件
  moveFileUp: function (e) {
    const index = e.currentTarget.dataset.index;
    if (index <= 0) return;

    const mergeFiles = this.data.mergeFiles;
    const temp = mergeFiles[index];
    mergeFiles[index] = mergeFiles[index - 1];
    mergeFiles[index - 1] = temp;

    this.setData({
      mergeFiles: mergeFiles
    });
  },

  // 下移文件
  moveFileDown: function (e) {
    const index = e.currentTarget.dataset.index;
    const mergeFiles = this.data.mergeFiles;

    if (index >= mergeFiles.length - 1) return;

    const temp = mergeFiles[index];
    mergeFiles[index] = mergeFiles[index + 1];
    mergeFiles[index + 1] = temp;

    this.setData({
      mergeFiles: mergeFiles
    });
  },

  // 合并PDF文件
  mergeFiles: function () {
    // 检查网络状态
    if (this.data.networkType === 'none') {
      wx.showToast({
        title: '无网络连接',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 检查是否至少有两个文件
    if (this.data.mergeFiles.length < 2) {
      this.setData({
        mergeErrorMsg: '请至少选择两个PDF文件进行合并'
      });
      return;
    }

    // 开始处理
    this.setData({
      processing: true,
      mergeErrorMsg: ''
    });

    wx.showLoading({
      title: '正在合并...',
      mask: true
    });

    // 准备上传文件
    const uploadTasks = this.data.mergeFiles.map((file, index) => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://excel.sube.top/api/pdf/upload',
          filePath: file.path,
          name: 'file',
          formData: {
            'index': index,
            'operation': 'merge'
          },
          success: res => {
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(res.data);
                if (data.success) {
                  resolve(data);
                } else {
                  reject(data.message || '上传失败');
                }
              } catch (e) {
                reject('解析响应数据失败');
              }
            } else {
              reject(`服务器返回错误(${res.statusCode})`);
            }
          },
          fail: err => {
            reject(err.errMsg || '上传请求失败');
          }
        });
      });
    });

    // 执行所有上传任务
    Promise.all(uploadTasks)
      .then(results => {
        // 所有文件上传成功，发送合并请求
        return new Promise((resolve, reject) => {
          wx.request({
            url: 'https://excel.sube.top/api/pdf/merge',
            method: 'POST',
            data: {
              files: results.map(r => r.fileId),
              filename: 'merged.pdf'
            },
            success: res => {
              if (res.statusCode === 200 && res.data.success) {
                resolve(res.data);
              } else {
                reject(res.data.message || `服务器返回错误(${res.statusCode})`);
              }
            },
            fail: err => {
              reject(err.errMsg || '合并请求失败');
            }
          });
        });
      })
      .then(result => {
        // 合并成功
        wx.hideLoading();
        this.setData({
          processing: false,
          mergeResult: {
            pdfUrl: result.pdfUrl,
            fileSize: result.fileSize || '未知'
          }
        });

        wx.showToast({
          title: '合并成功',
          icon: 'success',
          duration: 2000
        });
      })
      .catch(error => {
        // 处理错误
        wx.hideLoading();
        console.error('PDF合并失败:', error);

        this.setData({
          processing: false,
          mergeErrorMsg: typeof error === 'string' ? error : '合并PDF失败，请重试'
        });

        wx.showToast({
          title: '合并失败',
          icon: 'none',
          duration: 2000
        });
      });
  },

  // 下载合并后的PDF
  downloadMergedPdf: function () {
    this.checkPermissionBeforeAction(() => {
      // 检查网络状态
      if (this.data.networkType === 'none') {
        wx.showToast({
          title: '无网络连接，请检查网络设置',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      if (!this.data.mergeResult || !this.data.mergeResult.pdfUrl) {
        wx.showToast({
          title: '无文件链接',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      wx.showLoading({
        title: '下载中...',
      });

      const that = this;
      // 使用下载API
      wx.downloadFile({
        url: this.data.mergeResult.pdfUrl,
        success: function (res) {
          wx.hideLoading();

          // 检查HTTP状态码
          if (res.statusCode !== 200) {
            let errorMsg = '';

            // 对特定错误进行处理
            if (res.statusCode === 502) {
              errorMsg = '服务器暂时不可用(502)，请稍后重试';
              console.error('下载PDF时服务器返回502错误');
            } else if (res.statusCode === 404) {
              errorMsg = '文件不存在(404)，请重新生成PDF';
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
              content: '下载的文件为空，请重新生成PDF',
              showCancel: false
            });
            return;
          }

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
              that.saveFile(tempFilePath, 'merged.pdf');
            }
          });
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
  },

  // ========== PDF拆分功能相关方法 ==========

  // 选择要拆分的PDF文件
  chooseSplitFile: function () {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: res => {
        const file = res.tempFiles[0];

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

        // 设置文件信息并上传分析页数
        this.setData({
          splitFile: {
            path: file.path,
            name: file.name,
            size: sizeStr,
            originalSize: size
          },
          splitErrorMsg: '',
          // 重置拆分结果
          splitResult: null
        });

        // 上传PDF获取页数信息
        this.analyzePdfPages(file.path);
      }
    });
  },

  // 上传PDF文件获取页数信息
  analyzePdfPages: function (filePath) {
    wx.showLoading({
      title: '分析页数...',
    });

    wx.uploadFile({
      url: 'https://excel.sube.top/api/pdf/analyze',
      filePath: filePath,
      name: 'file',
      success: res => {
        wx.hideLoading();

        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              // 更新文件信息，添加页数
              const splitFile = this.data.splitFile;
              splitFile.pageCount = data.pageCount;
              splitFile.fileId = data.fileId; // 保存服务器文件ID，用于后续拆分操作

              // 如果页数信息更新，也更新范围输入的默认值
              const splitRanges = this.data.splitRanges;
              if (splitRanges.length === 1 && !splitRanges[0].start && !splitRanges[0].end) {
                splitRanges[0] = {
                  start: '1',
                  end: data.pageCount.toString()
                };
              }

              this.setData({
                splitFile: splitFile,
                splitRanges: splitRanges
              });
            } else {
              this.setData({
                splitErrorMsg: data.message || '分析PDF页数失败'
              });
            }
          } catch (e) {
            this.setData({
              splitErrorMsg: '解析服务器响应失败'
            });
          }
        } else {
          this.setData({
            splitErrorMsg: `服务器返回错误(${res.statusCode})`
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        this.setData({
          splitErrorMsg: err.errMsg || '上传PDF进行分析失败'
        });
      }
    });
  },

  // 清除选择的拆分文件
  clearSplitFile: function () {
    this.setData({
      splitFile: null,
      splitRanges: [{ start: '', end: '' }],
      splitResult: null
    });
  },

  // 切换拆分方式
  splitMethodChange: function (e) {
    const method = e.detail.value;

    // 如果切换到单页拆分，生成1到pageCount的范围
    if (method === 'single' && this.data.splitFile && this.data.splitFile.pageCount) {
      const pageCount = this.data.splitFile.pageCount;
      const ranges = [];

      for (let i = 1; i <= pageCount; i++) {
        ranges.push({
          start: i.toString(),
          end: i.toString()
        });
      }

      this.setData({
        splitMethod: method,
        splitRanges: ranges
      });
    } else {
      // 如果切换到范围拆分，恢复默认范围
      this.setData({
        splitMethod: method,
        splitRanges: [{
          start: '1',
          end: this.data.splitFile ? this.data.splitFile.pageCount.toString() : ''
        }]
      });
    }
  },

  // 添加拆分范围
  addRange: function () {
    const ranges = this.data.splitRanges;
    ranges.push({ start: '', end: '' });

    this.setData({
      splitRanges: ranges
    });
  },

  // 删除拆分范围
  deleteRange: function (e) {
    const index = e.currentTarget.dataset.index;
    const ranges = this.data.splitRanges;

    if (ranges.length > 1) {
      ranges.splice(index, 1);
      this.setData({
        splitRanges: ranges
      });
    }
  },

  // 范围输入变化
  onRangeChange: function (e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    const value = e.detail.value;

    const ranges = this.data.splitRanges;
    ranges[index][type] = value;

    this.setData({
      splitRanges: ranges
    });
  },

  // 拆分PDF
  splitPdf: function () {
    // 检查网络状态
    if (this.data.networkType === 'none') {
      wx.showToast({
        title: '无网络连接',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 检查是否有选择PDF文件
    if (!this.data.splitFile || !this.data.splitFile.fileId) {
      this.setData({
        splitErrorMsg: '请选择要拆分的PDF文件'
      });
      return;
    }

    // 验证范围输入
    let isValid = true;
    let errorMsg = '';
    const pageCount = this.data.splitFile.pageCount;

    const ranges = this.data.splitRanges.map(range => {
      const start = parseInt(range.start);
      const end = parseInt(range.end);

      if (isNaN(start) || isNaN(end)) {
        isValid = false;
        errorMsg = '请输入有效的页码范围';
        return null;
      }

      if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
        isValid = false;
        errorMsg = `页码范围必须在1到${pageCount}之间`;
        return null;
      }

      if (start > end) {
        isValid = false;
        errorMsg = '起始页码不能大于结束页码';
        return null;
      }

      return { start, end };
    });

    if (!isValid) {
      this.setData({
        splitErrorMsg: errorMsg
      });
      return;
    }

    // 开始处理
    this.setData({
      processing: true,
      splitErrorMsg: ''
    });

    wx.showLoading({
      title: '正在拆分...',
      mask: true
    });

    // 发送拆分请求
    wx.request({
      url: 'https://excel.sube.top/api/pdf/split',
      method: 'POST',
      data: {
        fileId: this.data.splitFile.fileId,
        ranges: ranges,
        method: this.data.splitMethod
      },
      success: res => {
        wx.hideLoading();

        if (res.statusCode === 200) {
          // 使用新的响应格式
          this.setData({
            processing: false,
            splitResult: {
              zipUrl: 'https://excel.sube.top' + res.data.url,
              fileCount: ranges.length,
              fileSize: '未知' // 后端不再返回文件大小信息
            }
          });

          wx.showToast({
            title: '拆分成功',
            icon: 'success',
            duration: 2000
          });
        } else {
          this.setData({
            processing: false,
            splitErrorMsg: res.data.error || `服务器返回错误(${res.statusCode})`
          });

          wx.showToast({
            title: '拆分失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('PDF拆分失败:', err);

        this.setData({
          processing: false,
          splitErrorMsg: err.errMsg || '拆分请求失败，请重试'
        });

        wx.showToast({
          title: '拆分失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 下载拆分的ZIP文件
  downloadSplitZip: function () {
    this.checkPermissionBeforeAction(() => {
      // 检查网络状态
      if (this.data.networkType === 'none') {
        wx.showToast({
          title: '无网络连接，请检查网络设置',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      if (!this.data.splitResult || !this.data.splitResult.zipUrl) {
        wx.showToast({
          title: '无文件链接',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      wx.showLoading({
        title: '下载中...',
      });

      const that = this;
      // 使用下载API
      wx.downloadFile({
        url: this.data.splitResult.zipUrl,
        success: function (res) {
          wx.hideLoading();

          // 检查HTTP状态码
          if (res.statusCode !== 200) {
            let errorMsg = '';

            // 对特定错误进行处理
            if (res.statusCode === 502) {
              errorMsg = '服务器暂时不可用(502)，请稍后重试';
              console.error('下载ZIP时服务器返回502错误');
            } else if (res.statusCode === 404) {
              errorMsg = '文件不存在(404)，请重新拆分';
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
              content: '下载的文件为空，请重新拆分',
              showCancel: false
            });
            return;
          }

          // 打开文件或保存文件
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
              that.saveFile(tempFilePath, 'pdf_split.zip');
            }
          });
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
  },

  // ========== 通用方法 ==========

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
  },

  // 保存文件到本地
  saveFile: function (tempFilePath, suggestedName) {
    const fsm = wx.getFileSystemManager();
    const newFilePath = `${wx.env.USER_DATA_PATH}/${suggestedName}`;

    try {
      fsm.copyFileSync(tempFilePath, newFilePath);

      // 提示用户已保存
      wx.showModal({
        title: '文件已保存',
        content: `文件已保存到小程序临时目录，您可以在"文件管理"中查看`,
        showCancel: false
      });
    } catch (err) {
      console.error('保存文件失败:', err);

      wx.showModal({
        title: '保存失败',
        content: '无法保存文件，请重试或检查存储权限',
        showCancel: false
      });
    }
  },

  // 检查权限并执行操作
  checkPermissionBeforeAction: function (action) {
    // 检查写入相册权限
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 用户曾经拒绝过权限，需要打开设置页
          wx.showModal({
            title: '提示',
            content: '需要保存到相册权限，请授权',
            confirmText: '去设置',
            success: modalRes => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          // 直接调用操作函数
          action.call(this);
        }
      }
    });
  }
}); 