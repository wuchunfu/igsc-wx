var host = 'https://igsc.wx.haihui.site'
//var host = 'http://127.0.0.1:9090'
var config = {
    service: {
        host,
        loginUrl: `${host}/weapp/login`,
        requestUrl: `${host}/weapp/user`,
        tunnelUrl: `${host}/weapp/tunnel`,
        uploadUrl: `${host}/weapp/upload`,
    },
    songciUrl: `${host}/songci/`,
    qaudio_url: 'https://qcloudtest-1256650966.cos.ap-guangzhou.myqcloud.com/songci-audio/',
    neteaseaudio_url: 'https://songci.nos-eastchina1.126.net/audio/',
    maxLayer: 10, //最多10层页面
}

module.exports = config