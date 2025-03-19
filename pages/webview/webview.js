Page({
  data: {
    url: ''
  },
  
  onLoad: function(options) {
    if (options.url) {
      this.setData({
        url: decodeURIComponent(options.url)
      });
    } else {
      wx.showToast({
        title: '无效的URL',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  }
}) 