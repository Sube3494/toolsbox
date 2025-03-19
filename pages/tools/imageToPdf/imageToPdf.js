Page({
  data: {
    images: [],
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
  chooseImages: function () {
    const that = this;
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        that.setData({
          images: [...that.data.images, ...newImages],
          errorMsg: '',
          result: null
        });
      },
      fail: function (err) {
        console.error('选择图片失败', err);
      }
    });
  },

  // 删除图片
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({
      images: images,
      result: null,
      errorMsg: ''
    });
  },

  // 处理图片并转换为PDF
  processImages: function () {
    if (this.data.images.length === 0) {
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

    // 上传多张图片到服务器处理
    const uploadTasks = this.data.images.map((imagePath, index) => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://excel.sube.top/image-to-pdf-upload', // 使用与Excel相同的服务器
          filePath: imagePath,
          name: 'image',
          formData: {
            index: index // 图片顺序
          },
          success: function (res) {
            try {
              const result = JSON.parse(res.data);
              if (result.success) {
                resolve(result.data);
              } else {
                reject(new Error(result.message || '上传失败'));
              }
            } catch (e) {
              reject(new Error('解析错误'));
            }
          },
          fail: function (err) {
            reject(err);
          }
        });
      });
    });

    // 处理所有上传任务
    Promise.all(uploadTasks)
      .then(results => {
        // 所有图片上传成功，请求合并为PDF
        wx.request({
          url: 'https://excel.sube.top/merge-pdf', // 使用与Excel相同的服务器
          method: 'POST',
          data: {
            imageIds: results.map(r => r.imageId)
          },
          success: function (res) {
            if (res.data.success) {
              that.setData({
                result: res.data.data,
                processing: false
              });
            } else {
              that.setData({
                errorMsg: res.data.message || '合并PDF失败',
                processing: false
              });
            }
          },
          fail: function (err) {
            console.error('合并PDF请求失败', err);
            that.setData({
              errorMsg: '网络错误，请重试',
              processing: false
            });
          }
        });
      })
      .catch(error => {
        console.error('上传过程中出错', error);
        that.setData({
          errorMsg: error.message || '上传图片失败',
          processing: false
        });
      });
  },

  // 下载PDF文件
  downloadPdf: function () {
    if (!this.data.result || !this.data.result.pdfUrl) {
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
      url: this.data.result.pdfUrl,
      success: function (res) {
        wx.hideLoading();

        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath;

          // 文件名处理
          const fileName = 'pdf_' + new Date().getTime() + '.pdf';

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
                  title: 'PDF已保存',
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