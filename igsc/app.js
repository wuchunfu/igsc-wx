var config = require('config')
var util = require('utils/util')
App({
  onHide() {
    wx.setStorageSync('app_is_hide', true)
  },
  onShow() {
    wx.setStorageSync('app_is_hide', false)
  },
  onUnload: function (e) {
    console.log('app onUnload')
  },
  onLaunch() {
    try {
      var open_id = wx.getStorageSync('user_open_id')
    } catch (e) {}
    if (!open_id) {
      util.user_login()
    }
    try {
      open_id = wx.getStorageSync('user_open_id')
      var play_mode = wx.getStorageSync('play_mode')
      var historyplay = wx.getStorageSync('historyplay')
      wx.setStorage({
        key: 'historyplay',
        data: historyplay,
      })
      if (open_id) {
        wx.setStorage({
          key: 'user_open_id',
          data: open_id,
        })
      }
      wx.setStorageSync('play_mode', play_mode ? play_mode : 'xunhuan')
    } catch (e) {}
    wx.getSystemInfo({
      success: function (res) {
        wx.setStorageSync('platform', 'pc')
      }
    })
    wx.request({
      url: config.service.host + '/version',
      success: function (data) {
        wx.setStorageSync('api_version', data.data.v + '')
      }
    })
  }
})