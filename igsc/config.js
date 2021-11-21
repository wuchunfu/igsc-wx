var host = 'https://igsc.wx.haihui.site'
//var host = 'http://192.168.0.106:8080'
var config = {
    service: {
        host,
        loginUrl: `${host}/weapp/login`,
        requestUrl: `${host}/weapp/user`,
        tunnelUrl: `${host}/weapp/tunnel`,
        uploadUrl: `${host}/weapp/upload`,
    },
    gsc_url: `${host}/gsc/`,
    qaudio_url: 'https://igsc.audio.haihui.site/songci-audio/',
    max_layer: 10, //最多10层页面
}
module.exports = config