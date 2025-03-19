Page({
  data: {
    text1: '',
    text2: '',
    processing: false,
    result: null,
    errorMsg: '',
    canCompare: false,
    networkType: ''
  },

  onLoad: function () {
    // 获取网络状态
    wx.getNetworkType({
      success: (res) => {
        this.setData({
          networkType: res.networkType
        });
      }
    });
  },

  // 文本1内容变化
  onText1Change: function (e) {
    this.setData({
      text1: e.detail.value,
      canCompare: e.detail.value.trim() !== '' && this.data.text2.trim() !== ''
    });
  },

  // 文本2内容变化
  onText2Change: function (e) {
    this.setData({
      text2: e.detail.value,
      canCompare: this.data.text1.trim() !== '' && e.detail.value.trim() !== ''
    });
  },

  // 清空输入
  clearText: function () {
    this.setData({
      text1: '',
      text2: '',
      result: null,
      errorMsg: '',
      canCompare: false
    });
  },

  // 比较文本
  compareText: function () {
    if (!this.data.canCompare) {
      this.setData({
        errorMsg: '请输入两段要比较的文本'
      });
      return;
    }

    this.setData({
      processing: true,
      errorMsg: ''
    });

    const that = this;

    // 发送请求到服务器进行文本比较
    wx.request({
      url: 'https://excel.sube.top/compare-text',
      method: 'POST',
      data: {
        text1: this.data.text1,
        text2: this.data.text2
      },
      success: function (res) {
        if (res.statusCode === 200 && res.data.success) {
          that.setData({
            result: res.data.data,
            processing: false
          });
        } else {
          that.setData({
            errorMsg: res.data.message || '比较失败',
            processing: false
          });
        }
      },
      fail: function (err) {
        console.error('请求失败', err);
        that.setData({
          errorMsg: '网络错误，请重试',
          processing: false
        });
      }
    });
  },

  // 查看详细对比
  viewDiff: function () {
    if (!this.data.result || !this.data.result.resultUrl) {
      wx.showToast({
        title: '没有比较结果',
        icon: 'none'
      });
      return;
    }

    // 使用web-view打开结果页面
    wx.navigateTo({
      url: `/pages/webview/webview?url=${encodeURIComponent(this.data.result.resultUrl)}`
    });
  }
}) 