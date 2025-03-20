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
  chooseImages: function () {
    const that = this;
    
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照', '从聊天中选择'],
      success: function (res) {
        let sourceType = ['album', 'camera', 'message'][res.tapIndex];
        
        // 处理从聊天中选择图片的情况
        if (sourceType === 'message') {
          // 微信原生API从聊天记录选择图片
          wx.chooseMessageFile({
            count: 9,
            type: 'image',
            success: function (res) {
              const newImages = res.tempFiles.map(file => file.path);
              that.setData({
                images: [...that.data.images, ...newImages],
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
            count: 9,
            mediaType: ['image'],
            sourceType: [sourceType],
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
        }
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

    // 检查网络状态
    if (this.data.networkType === 'none') {
      this.setData({
        errorMsg: '当前无网络连接，请检查网络设置'
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
        console.log(`开始上传第${index + 1}张图片:`, imagePath);

        wx.uploadFile({
          url: 'https://excel.sube.top/image-to-pdf-upload', // 使用与Excel相同的服务器
          filePath: imagePath,
          name: 'image',
          formData: {
            index: index // 图片顺序
          },
          success: function (res) {
            console.log(`第${index + 1}张图片上传响应:`, res);

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

              // 如果是HTML格式的错误响应，记录但不尝试解析
              if (typeof res.data === 'string' && res.data.trim().startsWith('<')) {
                console.error(`收到HTML错误响应:`, res.data.substring(0, 100) + '...');
                reject(new Error(errorMsg));
                return;
              }

              reject(new Error(errorMsg));
              return;
            }

            try {
              // 记录完整的响应数据
              console.log(`第${index + 1}张图片响应数据类型:`, typeof res.data);
              console.log(`第${index + 1}张图片响应数据:`, res.data);

              // 尝试解析返回数据
              let result;
              if (typeof res.data === 'string') {
                // 检查是否为JSON格式
                if (res.data.trim().startsWith('{') || res.data.trim().startsWith('[')) {
                  result = JSON.parse(res.data);
                } else {
                  console.error(`非JSON格式响应:`, res.data);
                  reject(new Error('服务器返回了非JSON格式的数据'));
                  return;
                }
              } else {
                result = res.data;
              }

              console.log(`第${index + 1}张图片解析后结果:`, result);

              if (result && result.success) {
                console.log(`第${index + 1}张图片上传成功:`, result.data);
                resolve(result.data);
              } else {
                console.error(`第${index + 1}张图片上传失败:`, result);
                reject(new Error(result?.message || '上传失败'));
              }
            } catch (e) {
              console.error(`第${index + 1}张图片响应解析错误:`, e);
              console.error('原始响应数据:', res.data);

              // 尝试截取部分数据展示，避免过长
              let previewData = typeof res.data === 'string'
                ? (res.data.length > 500 ? res.data.substring(0, 500) + '...' : res.data)
                : '非字符串数据';
              console.log('响应数据预览:', previewData);

              reject(new Error('服务器响应解析错误，请稍后重试'));
            }
          },
          fail: function (err) {
            console.error(`第${index + 1}张图片上传请求失败:`, err);

            // 提供更具体的错误信息
            let errorMsg = '网络请求失败';
            if (err.errMsg) {
              if (err.errMsg.includes('timeout')) {
                errorMsg = '网络连接超时，请检查网络';
              } else if (err.errMsg.includes('fail')) {
                errorMsg = '网络连接失败，请检查网络设置';
              }
            }

            reject(new Error(errorMsg));
          }
        });
      });
    });

    // 处理所有上传任务
    Promise.all(uploadTasks)
      .then(results => {
        console.log('所有图片上传成功，结果:', results);

        // 构建图片ID数组
        // 注意：由于服务器端的改变，我们需要调整上传后的处理
        // 检查返回数据格式，找到可用的标识符
        let imageIdentifiers = [];

        if (results.length > 0 && results[0].filename) {
          console.log('使用文件名作为标识符');
          // 使用文件名作为标识符
          imageIdentifiers = results.map(imgData => imgData.filename);
        } else {
          // 回退方案：尝试使用图片URL作为标识符
          console.log('使用URL作为标识符');
          imageIdentifiers = results.map(imgData => imgData.url);
        }

        console.log('图片标识符:', imageIdentifiers);

        // 显示合并PDF的提示
        wx.showLoading({
          title: '正在合并PDF...',
          mask: true
        });

        // 尝试不同的API端点
        this.tryMergePDF(imageIdentifiers, 0);
      })
      .catch(error => {
        console.error('上传过程中出错', error);
        that.setData({
          errorMsg: error.message || '上传图片失败',
          processing: false
        });
      });
  },

  // 尝试不同的API端点来合并PDF
  tryMergePDF: function (identifiers, attempt = 0) {
    const endpoints = [
      {
        url: 'https://excel.sube.top/merge-pdf',
        dataKey: 'imageIds',
        errorMsg: '合并PDF失败，尝试使用备用方法'
      },
      {
        url: 'https://excel.sube.top/urls-to-pdf',
        dataKey: 'imageUrls',
        errorMsg: '所有PDF合并方法均失败，请稍后重试'
      }
    ];

    if (attempt >= endpoints.length) {
      wx.hideLoading();
      this.setData({
        errorMsg: '无法合并PDF，请联系管理员或稍后重试',
        processing: false
      });
      return;
    }

    const endpoint = endpoints[attempt];
    const that = this;

    console.log(`尝试使用API端点(${attempt + 1}/${endpoints.length}): ${endpoint.url}`);

    // 构建请求数据
    const requestData = {};
    requestData[endpoint.dataKey] = identifiers;

    // 请求合并PDF
    wx.request({
      url: endpoint.url,
      method: 'POST',
      data: requestData,
      header: {
        'content-type': 'application/json'
      },
      success: function (res) {
        wx.hideLoading();
        console.log('合并PDF响应:', res);

        try {
          // 检查响应数据
          if (res.statusCode !== 200) {
            console.error(`合并PDF失败, 状态码: ${res.statusCode}, 响应数据:`, res.data);

            // 如果是404错误，尝试下一个API端点
            if (res.statusCode === 404 || res.statusCode === 400) {
              console.log('API端点不可用或参数错误，尝试下一个方法');
              that.tryMergePDF(identifiers, attempt + 1);
              return;
            }

            // 其他错误
            let errorMsg = '';
            if (res.statusCode === 502) {
              errorMsg = '服务器暂时不可用(502)，请稍后重试';
            } else {
              errorMsg = `服务器返回错误状态: ${res.statusCode}`;
            }

            that.setData({
              errorMsg: errorMsg,
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
            console.log('API调用成功但结果不成功，尝试下一个方法');
            that.tryMergePDF(identifiers, attempt + 1);
          }
        } catch (e) {
          console.error('处理合并PDF响应出错:', e);
          // 尝试下一个API端点
          that.tryMergePDF(identifiers, attempt + 1);
        }
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('合并PDF请求失败', err);

        // 尝试下一个API端点
        console.log('API请求失败，尝试下一个方法');
        that.tryMergePDF(identifiers, attempt + 1);
      }
    });
  },

  // 在操作前检查和请求权限
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

  // 下载PDF文件
  downloadPdf: function () {
    this.checkPermissionBeforeAction(function () {
      // 检查网络状态
      if (this.data.networkType === 'none') {
        wx.showToast({
          title: '无网络连接，请检查网络设置',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      if (!this.data.result || !this.data.result.pdfUrl) {
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
        url: this.data.result.pdfUrl,
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

          // 文件名处理
          const fileName = 'pdf_' + new Date().getTime() + '.pdf';

          try {
            // 保存文件
            wx.saveFile({
              tempFilePath: tempFilePath,
              success: function (saveRes) {
                const savedFilePath = saveRes.savedFilePath;

                // 打开文件
                wx.openDocument({
                  filePath: savedFilePath,
                  showMenu: true,
                  success: function () {
                    wx.showToast({
                      title: 'PDF已保存',
                      icon: 'success',
                      duration: 2000
                    });
                  },
                  fail: function (err) {
                    console.error('打开文档失败:', err);
                    wx.showModal({
                      title: '提示',
                      content: 'PDF已保存，但无法直接打开。可以从文件管理器中查看。',
                      showCancel: false
                    });
                  }
                });
              },
              fail: function (err) {
                console.error('保存文件失败:', err);

                // 提供更具体的错误信息
                let errorMsg = '无法保存PDF文件，请确保授予了存储权限';
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