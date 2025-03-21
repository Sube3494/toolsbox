Page({
  data: {
    imagePath: '',
    imageLoaded: false,
    processing: false,
    result: null,
    errorMsg: '',
    isIOS: false,
    isAndroid: false,
    networkType: '',
    retryCount: 0,  // 添加重试计数
    maxRetries: 3   // 最大重试次数
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
    // this.stopNetworkMonitoring();
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

  // 选择图片
  chooseImage: function () {
    const that = this;

    wx.showActionSheet({
      itemList: ['从相册选择', '拍照', '从聊天中选择'],
      success: function (res) {
        let sourceType = ['album', 'camera', 'message'][res.tapIndex];

        // 处理从聊天中选择图片的情况
        if (sourceType === 'message') {
          // 微信原生API从聊天记录选择图片
          wx.chooseMessageFile({
            count: 1,
            type: 'image',
            success: function (res) {
              that.setData({
                imagePath: res.tempFiles[0].path,
                imageLoaded: true,
                errorMsg: '',
                result: null
              });
            },
            fail: function (err) {
              console.error('从聊天选择图片失败', err);
            }
          });
        } else {
          // 原有的选择图片逻辑
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: [sourceType],
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
        }
      }
    });
  },

  // 处理图片
  processImage: function (isRetry = false) {
    if (!this.data.imagePath) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    // 检查网络状态
    if (this.data.networkType === 'none') {
      this.setData({
        errorMsg: '当前无网络连接，请检查网络设置'
      });
      wx.showToast({
        title: '无网络连接',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 首次尝试
    this.setData({
      processing: true,
      errorMsg: '',
      result: null,
      retryCount: 0
    });

    this.doProcessImage();
  },

  // 实际执行上传处理
  doProcessImage: function () {
    const that = this;

    // 上传图片到服务器处理
    wx.uploadFile({
      url: 'https://excel.sube.top/image-to-excel',
      filePath: this.data.imagePath,
      name: 'image',
      success: (res) => {
        console.log("上传响应:", res);

        // 检查HTTP状态码
        if (res.statusCode !== 200) {
          let errorMsg = '';

          // 对特定错误进行处理
          if (res.statusCode === 502) {
            errorMsg = '服务器暂时不可用(502)，请稍后重试';
            console.error('服务器返回502错误');
          } else {
            errorMsg = `服务器返回错误(${res.statusCode})`;
          }

          // 如果是HTML格式的错误响应，不尝试解析
          if (typeof res.data === 'string' && res.data.trim().startsWith('<')) {
            console.error(`收到HTML错误响应:`, res.data.substring(0, 100) + '...');
          }

          that.setData({
            processing: false,
            errorMsg: errorMsg
          });
          return;
        }

        try {
          // 判断返回的数据类型
          console.log("响应数据类型:", typeof res.data);
          console.log("响应数据:", res.data);

          let result;
          if (typeof res.data === 'string') {
            // 检查是否为JSON格式
            if (res.data.trim().startsWith('{') || res.data.trim().startsWith('[')) {
              result = JSON.parse(res.data);
            } else {
              console.error("非JSON格式响应:", res.data);
              that.setData({
                processing: false,
                errorMsg: '服务器返回了非JSON格式的数据'
              });
              return;
            }
          } else {
            result = res.data;
          }

          if (result.success) {
            that.setData({
              result: result.data,
              processing: false,
              errorMsg: ''
            });
          } else {
            that.setData({
              processing: false,
              errorMsg: result.message || '处理失败'
            });
          }
        } catch (e) {
          console.error("解析响应数据出错:", e);
          console.error("原始响应数据:", res.data);

          // 尝试截取部分数据展示，避免过长
          let previewData = typeof res.data === 'string'
            ? (res.data.length > 500 ? res.data.substring(0, 500) + '...' : res.data)
            : '非字符串数据';
          console.log('响应数据预览:', previewData);

          that.setData({
            processing: false,
            errorMsg: '解析服务器响应失败，请稍后重试'
          });
        }
      },
      fail: (err) => {
        console.error("上传请求失败:", err);

        // 提供更具体的错误信息
        let errorMsg = '网络请求失败';
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMsg = '网络连接超时，请检查网络';
          } else if (err.errMsg.includes('fail')) {
            errorMsg = '网络连接失败，请检查网络设置';
          } else if (err.errMsg.includes('domain')) {
            errorMsg = '域名访问受限，请检查小程序配置';
          }
        }

        that.setData({
          processing: false,
          errorMsg: errorMsg
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