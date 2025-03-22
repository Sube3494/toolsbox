Page({
    data: {
        danmakuContent: '',
        danmakuText: '',
        fontSize: 36,
        fullscreenFontSize: 72,
        landscapeFontSize: 100,
        scrollSpeed: 8,
        scrollSpeedValue: 25,
        scrollDuration: 10,
        textColor: '#ffffff',
        backgroundColor: 'linear-gradient(to right, #ff9a9e, #fad0c4)',
        isVertical: false,
        isStationary: false,
        canGenerate: false,
        showFullscreen: false,
        isFullscreen: false,
        displayMode: 'scroll',
        orientation: 'vertical',
        currentBgPreset: 'default',
        networkType: '',
        screenWidth: 0,
        screenHeight: 0,
        isLandscapeDevice: false,
        forceHorizontalText: true
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

        // 获取系统信息，用于调整字体大小
        wx.getSystemInfo({
            success: (res) => {
                // 根据屏幕大小计算合适的字体大小
                const screenWidth = res.windowWidth;
                const screenHeight = res.windowHeight;

                // 竖屏模式字体大小
                const fullscreenSize = Math.max(40, Math.min(screenWidth, screenHeight) / 3);

                // 横屏模式字体大小 - 使用更大尺寸
                const landscapeSize = Math.max(80, screenWidth / 3);

                this.setData({
                    fullscreenFontSize: fullscreenSize,
                    landscapeFontSize: landscapeSize,
                    screenWidth: screenWidth,
                    screenHeight: screenHeight,
                    isLandscapeDevice: screenWidth > screenHeight,
                    // 强制横向文字显示
                    forceHorizontalText: true
                });
            }
        });

        // 监听设备方向变化，优化横屏体验
        wx.onDeviceMotionChange((res) => {
            const { alpha, beta, gamma } = res;
            // 根据陀螺仪数据判断设备方向
            const isLandscape = Math.abs(gamma) > 45;

            if (this.data.showFullscreen && !this.data.isVertical) {
                // 只在横屏弹幕模式下提示
                if (!isLandscape) {
                    wx.showToast({
                        title: '请横屏握持设备获得最佳效果',
                        icon: 'none',
                        duration: 2000
                    });
                }
            }
        });
    },

    // 弹幕内容变化
    onDanmakuContentChange: function (e) {
        this.setData({
            danmakuContent: e.detail.value,
            danmakuText: e.detail.value,
            canGenerate: e.detail.value.trim() !== ''
        });
    },

    // 字体大小变化
    onFontSizeChange: function (e) {
        this.setData({
            fontSize: e.detail.value
        });
    },

    // 滚动速度变化
    onScrollSpeedChange: function (e) {
        const speedValue = e.detail.value;
        // 速度计算
        const maxDuration = 20; // 最慢20秒
        const minDuration = 8;  // 最快8秒

        // 线性插值
        const range = maxDuration - minDuration;
        const normalizedValue = (30 - speedValue) / 30; // 30是滑块最大值
        const duration = minDuration + (normalizedValue * range);

        this.setData({
            scrollSpeedValue: speedValue,
            scrollSpeed: duration
        });
    },

    // 选择预设背景
    onBgPresetSelect: function (e) {
        const preset = e.currentTarget.dataset.preset;

        if (preset === 'custom') {
            this.setData({
                currentBgPreset: 'custom',
                backgroundColor: '#000000',
                textColor: '#ffffff'
            });
        } else {
            const bg = e.currentTarget.dataset.bg;
            const textColor = e.currentTarget.dataset.text;

            this.setData({
                currentBgPreset: preset,
                backgroundColor: bg,
                textColor: textColor
            });
        }
    },

    // 选择文本颜色
    onTextColorSelect: function (e) {
        const color = e.currentTarget.dataset.color;
        this.setData({
            textColor: color
        });
    },

    // 选择背景颜色
    onBgColorSelect: function (e) {
        const color = e.currentTarget.dataset.color;
        this.setData({
            backgroundColor: color
        });
    },

    // 切换显示方向
    onOrientationChange: function (e) {
        const orientation = e.currentTarget.dataset.orientation;
        const isVertical = orientation === 'vertical';

        this.setData({
            isVertical: isVertical,
            orientation: isVertical ? 'vertical' : 'landscape' // 确保使用正确的值
        });
    },

    // 切换弹幕类型
    onTypeChange: function (e) {
        const type = e.currentTarget.dataset.type;
        const isStationary = type === 'stationary';

        this.setData({
            isStationary: isStationary,
            displayMode: isStationary ? 'fixed' : 'scroll' // 确保使用正确的值
        });
    },

    // 重置弹幕设置
    resetDanmaku: function () {
        this.setData({
            danmakuContent: '',
            fontSize: 36,
            scrollSpeed: 8,
            scrollSpeedValue: 25,
            textColor: '#ffffff',
            backgroundColor: 'linear-gradient(to right, #ff9a9e, #fad0c4)',
            isVertical: false,
            isStationary: false,
            canGenerate: false,
            currentBgPreset: 'default'
        });
    },

    // 生成全屏弹幕
    generateDanmaku: function () {
        if (!this.data.canGenerate) {
            wx.showToast({
                title: '请先输入弹幕内容',
                icon: 'none'
            });
            return;
        }

        // 请求保持屏幕常亮
        wx.setKeepScreenOn({
            keepScreenOn: true
        });

        // 隐藏导航栏
        wx.setNavigationBarColor({
            frontColor: '#ffffff',
            backgroundColor: '#000000',
            animation: {
                duration: 300,
                timingFunc: 'easeIn'
            }
        });

        // 显示加载提示
        wx.showLoading({
            title: '弹幕准备中...',
        });

        // 计算滚动速度，根据字符长度和方向调整
        const textLength = this.data.danmakuContent.length;
        let duration;

        if (!this.data.isVertical) { // 横屏模式
            // 横屏滚动速度，较长文本需要更慢速度
            duration = Math.max(10, Math.min(30, 10 + textLength * 0.5));
        } else {
            // 竖屏滚动速度
            duration = Math.max(6, Math.min(15, 6 + textLength * 0.3));
        }

        console.log("当前模式:", this.data.isVertical ? "竖屏" : "横屏",
            "滚动类型:", this.data.isStationary ? "固定" : "滚动");

        // 设置全屏模式
        this.setData({
            showFullscreen: true,
            isFullscreen: true,
            danmakuText: this.data.danmakuContent,
            displayMode: this.data.isStationary ? 'fixed' : 'scroll',
            orientation: this.data.isVertical ? 'vertical' : 'landscape',
            scrollDuration: duration
        });

        // 延迟以确保加载完成
        setTimeout(() => {
            wx.hideLoading();
        }, 300);
    },

    // 退出全屏模式
    exitFullscreen: function () {
        // 恢复屏幕自动休眠
        wx.setKeepScreenOn({
            keepScreenOn: false
        });

        this.setData({
            showFullscreen: false,
            isFullscreen: false
        });
    },

    // 页面隐藏时的处理
    onHide: function () {
        // 恢复屏幕设置
        wx.setKeepScreenOn({
            keepScreenOn: false
        });

        if (this.data.showFullscreen) {
            this.setData({
                showFullscreen: false
            });
        }
    },

    // 页面卸载时清理
    onUnload: function () {
        // 停止设备方向监听
        wx.stopDeviceMotionListening();
    }
}) 