Page({
  data: {
    imagePath: '',
    imageLoaded: false,
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

  // 选择图片
  chooseImage: function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          imagePath: res.tempFiles[0].tempFilePath,
          imageLoaded: true,
          errorMsg: '',
          result: null
        });
      },
      fail: function (err) {
        console.error('选择图片失败', err);
      }
    });
  },

  // 识别图片并转换
  processImage: function () {
    if (!this.data.imageLoaded) {
      this.setData({
        errorMsg: '请先选择图片'
      });
      return;
    }

    this.setData({
      processing: true,
      errorMsg: ''
    });

    const that = this;

    // 上传图片到服务器处理
    wx.uploadFile({
      url: 'https://excel.sube.top/image-to-excel', // 修改为您的实际API地址
      filePath: this.data.imagePath,
      name: 'image',
      success: function (res) {
        console.log('服务器返回:', res.data); // 调试信息
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

  // 下载Excel文件
  downloadExcel: function () {
    if (!this.data.result || !this.data.result.excelUrl) {
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
      url: this.data.result.excelUrl,
      success: function (res) {
        console.log('下载响应:', res);
        wx.hideLoading();

        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath;
          console.log('临时文件路径:', tempFilePath);

          // 检查是否是开发环境中的http路径
          const isHttpPath = tempFilePath.indexOf('http://') === 0;

          // 开发环境处理
          if (isHttpPath) {
            console.log('检测到开发环境HTTP路径，直接打开文件');
            // 直接打开临时文件
            wx.openDocument({
              filePath: tempFilePath,
              showMenu: true,
              success: function () {
                console.log('打开文件成功（开发环境）');
                wx.showToast({
                  title: '打开成功',
                  icon: 'success'
                });
              },
              fail: function (err) {
                console.error('打开文件失败（开发环境）', err);
                that.setData({
                  errorMsg: '开发环境打开失败: ' + err.errMsg
                });
                wx.showToast({
                  title: '打开失败',
                  icon: 'none'
                });
              }
            });
            return;
          }

          // 真机环境处理 - 保存到本地
          try {
            // 文件名处理
            const fileName = 'excel_' + new Date().getTime() + '.xlsx';

            // 目标路径
            const fsm = wx.getFileSystemManager();
            const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

            console.log('保存目标路径:', filePath);

            // 复制文件到用户目录
            fsm.copyFileSync(tempFilePath, filePath);
            console.log('文件已复制到:', filePath);

            // 打开文件
            wx.openDocument({
              filePath: filePath,
              showMenu: true,
              success: function () {
                console.log('打开文件成功');
                wx.showToast({
                  title: '文件已保存',
                  icon: 'success'
                });
              },
              fail: function (err) {
                console.error('打开文件失败', err);
                that.setData({
                  errorMsg: '打开失败: ' + err.errMsg
                });
                wx.showToast({
                  title: '打开失败',
                  icon: 'none'
                });
              }
            });
          } catch (e) {
            console.error('文件操作异常', e);
            that.setData({
              errorMsg: '文件操作异常: ' + (e.message || JSON.stringify(e))
            });

            // 在复制失败的情况下尝试直接打开临时文件
            console.log('尝试直接打开临时文件');
            wx.openDocument({
              filePath: tempFilePath,
              showMenu: true,
              success: function () {
                console.log('直接打开临时文件成功');
                wx.showToast({
                  title: '已打开文件',
                  icon: 'success'
                });
              },
              fail: function (err) {
                console.error('打开临时文件也失败', err);
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
            title: '下载失败: ' + res.statusCode,
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