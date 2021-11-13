var config = require('../config')
const format_time = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return [year, month, day].map(format_number).join('-')
}

var timetrans = function (date) {
  var date = new Date(date * 1000)
  var Y = date.getFullYear() + '-'
  var M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-'
  var D = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate()) + ' '
  var h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':'
  var m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':'
  var s = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds())
  return Y + M + D + h + m + s
}

const format_number = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}


// 显示繁忙提示
var show_busy = (text, duration = 300) => wx.showToast({
  title: text,
  icon: 'loading',
  duration: duration
})

// 显示成功提示
var show_success = text => wx.showToast({
  title: text,
  icon: 'success'
})

// 显示失败提示
var show_model = (content) => {
  wx.hideToast()
  wx.showModal({
    content: content,
    showCancel: false
  })
}

var close_toast = () => {
  wx.hideToast()
}

var page_confirm = (url) => {
  wx.showModal({
    content: '小程序最多能打开十层页面，是否要继续？',
    cancelText: '不要',
    confirmText: '继续',
    success: function (res) {
      if (res.confirm) {
        wx.redirectTo({
          url: url
        })
      } else {
        wx.showToast({
          title: '您可以到其他地方看看:)',
          icon: 'none',
          duration: 3000
        })
      }
    }
  })
}

var user_login = function () {
  wx.login({
    success: function (loginCode) {
      wx.request({
        url: config.service.host + '/user/auth/' + loginCode.code,
        header: {
          'content-type': 'application/json'
        },
        success: function (res) {
          if (res.statusCode == 200) {
            if (res.data.code == 0) {
              var open_id = res.data.data.openid
              wx.setStorageSync('user_open_id', open_id)
            } else {
              wx.showToast({
                title: '获取信息失败',
                icon: 'none',
                duration: 3000
              })
            }
          } else {
            wx.showToast({
              title: '获取信息失败',
              icon: 'none',
              duration: 3000
            })
          }
        }
      })
    },
    fail: function (e) {
      console.log(e)
    }
  })
}

var hl_content = function (content) {
  var res = []
  var splits = content.split('<^>')
  for (var i = 0; i < splits.length; i++) {
    if (splits[i].length == 0) {
      continue
    }
    if (i == 0) {
      res.push({
        s: splits[i],
        k: false,
      })
    } else {
      var s = splits[i]
      var index = s.lastIndexOf('<$>')
      // 可能发生嵌套, 此时s应该高亮
      if (index == -1) {
        if (s) {
          res.push({
            s: s,
            k: true
          })
        }
      } else {
        var ss = s.substring(0, index).replaceAll('<$>', '')
        if (ss) {
          res.push({
            s: ss,
            k: true
          })
        }
        ss = s.substring(index + 3, s.length)
        if (ss) {
          res.push({
            s: ss,
            k: false
          })
        }
      }
    }
  }
  return res
}

var api_version = function() {
  var v = wx.getStorageSync('api_version')
  return v?v:new Date().getTime()
}

var app_is_hide = function(){
  return wx.getStorageSync('app_is_hide')
}

module.exports = {
  format_time,
  show_busy,
  show_success,
  show_model,
  close_toast,
  page_confirm,
  user_login,
  timetrans,
  hl_content,
  api_version,
  app_is_hide,
}