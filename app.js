App({
    onLaunch: function () {
        // 小程序启动时执行
        console.log('小程序启动')
        
        // 设置服务器API基础URL
        this.globalData.apiBaseUrl = 'https://excel.sube.top'
    },
    globalData: {
        userInfo: null,
        apiBaseUrl: 'https://excel.sube.top'
    }
}) 