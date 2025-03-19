Page({
  data: {
    pdfPath: '',
    pdfName: '',
    pdfPages: 0,
    pdfSelected: false,
    processing: false,
    result: null,
    errorMsg: '',
    isIOS: false,
    isAndroid: false,
    networkType: ''
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

  // 选择PDF文件
  choosePdf: function () {
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: function (res) {
        const file = res.tempFiles[0];
        
        // 检查是否是PDF文件
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          that.setData({
            errorMsg: '请选择PDF格式的文件'
          });
          return;
        }
        
        that.setData({
          pdfPath: file.path,
          pdfName: file.name,
          pdfSelected: true,
          errorMsg: '',
          result: null
        });
      },
      fail: function (err) {
        console.error('选择PDF失败', err);
      }
    });
  },

  // 处理PDF文件
  processPdf: function () {
    if (!this.data.pdfSelected) {
      this.setData({
        errorMsg: '请先选择PDF文件'
      });
      return;
    }

    this.setData({
      processing: true,
      errorMsg: ''
    });

    const that = this;

    // 上传PDF文件到服务器处理
    wx.uploadFile({
      url: 'https://excel.sube.top/pdf-to-word',
      filePath: this.data.pdfPath,
      name: 'pdf',
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

  // 下载Word文件
  downloadWord: function () {
    if (!this.data.result || !this.data.result.wordUrl) {
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
      url: this.data.result.wordUrl,
      success: function (res) {
        wx.hideLoading();

        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath;

          // 文件名处理
          const fileName = that.data.result.fileName || 'word_document.docx';

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
                  title: 'Word已保存',
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
        } else {
          that.setData({
            errorMsg: '下载失败，状态码: ' + res.statusCode
          });
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('下载文件失败', err);
        that.setData({
          errorMsg: '下载失败: ' + err.errMsg
        });
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  }
}) 