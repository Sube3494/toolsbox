/*
 * @Date: 2025-03-19 19:37:56
 * @Author: Sube
 * @FilePath: index.js
 * @LastEditTime: 2025-03-19 23:12:26
 * @Description: 
 */
// index.js
Page({
    data: {
        tools: [
            {
                id: 'imageToExcel',
                name: '图片转Excel',
                icon: 'http://pic.sube.top/i/2025/03/19/67dab54181279.png', // 替换为实际图标URL
                description: '上传图片自动转换为Excel表格',
                path: '/pages/tools/imageToExcel/imageToExcel'
            },
            {
                id: 'imageToPdf',
                name: '图片转PDF',
                icon: 'http://pic.sube.top/i/2025/03/19/67dab54181279.png', // 替换为实际图标URL，这里临时使用相同图标
                description: '上传图片快速转换为PDF文档',
                path: '/pages/tools/imageToPdf/imageToPdf'
            },
            {
                id: 'pdfToWord',
                name: 'PDF转Word',
                icon: 'http://pic.sube.top/i/2025/03/19/67dab54181279.png', // 替换为实际图标URL，这里临时使用相同图标
                description: '将PDF文档转换为可编辑的Word文件',
                path: '/pages/tools/pdfToWord/pdfToWord'
            },
            {
                id: 'textCompare',
                name: '文本比较工具',
                icon: 'http://pic.sube.top/i/2025/03/19/67dab54181279.png', // 替换为实际图标URL，这里临时使用相同图标
                description: '对比两段文本，突出显示差异',
                path: '/pages/tools/textCompare/textCompare'
            }
            // 未来可以在这里添加更多工具
        ]
    },

    navigateToTool: function (e) {
        const toolId = e.currentTarget.dataset.id;
        const tool = this.data.tools.find(item => item.id === toolId);
        if (tool) {
            wx.navigateTo({
                url: tool.path
            });
        }
    }
}) 