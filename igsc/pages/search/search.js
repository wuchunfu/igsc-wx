var __tipKeys = []

var __searchFunction = null

var __goBackFunction = null

var __that = null

function init(that, hotKeys, tipKeys, searchFunction, goBackFunction) {
  __that = that
  __tipKeys = tipKeys
  __searchFunction = searchFunction
  __goBackFunction = goBackFunction

  var temData = {}
  if (that.search_V) {
    temData.value = that.search_V
  }
  var barHeight = 30
  var view = {
    barHeight: barHeight
  }
  temData.hotKeys = hotKeys

  wx.getSystemInfo({
    success: function (res) {
      var wHeight = res.windowHeight
      view.seachHeight = wHeight - barHeight
      temData.view = view
      __that.setData({
        wxSearchData: temData,
      })
    }
  })

  getHisKeys(__that)
}


function wxSearchInput(e) {
  var inputValue = e.detail.value

  var temData = __that.data.wxSearchData

  var tipKeys = []
  if (inputValue && inputValue.length > 0) {
    for (var i = 0; i < __tipKeys.length; i++) {
      var mindKey = __tipKeys[i]

      if (mindKey.indexOf(inputValue) != -1) {
        tipKeys.push(mindKey)
      }
    }
  }

  temData.value = inputValue
  temData.tipKeys = tipKeys

  __that.setData({
    wxSearchData: temData,
  })
}


function wxSearchClear() {

  var temData = __that.data.wxSearchData

  temData.value = ""
  temData.tipKeys = []
  if (__that.search_V) {
    __that.search_V = ''
  }

  __that.setData({
    wxSearchData: temData,
  })
  if (__that.data.page != 'like') {
    __that.getData(__that)
  }
}


function wxSearchKeyTap(e) {
  search(e.target.dataset.key)
  var temData = __that.data.wxSearchData
  temData.tipKeys = []

  __that.setData({
    wxSearchData: temData,
  })
}


function wxSearchConfirm(e) {
  var key = e.target.dataset.key
  if (key == 'back') {
    __goBackFunction()
  } else {
    search(__that.data.wxSearchData.value)
  }
}

function search(inputValue) {
  if (inputValue) {
    if (inputValue != '音频') {
      wxSearchAddHisKey(inputValue)
    }
    var temData = __that.data.wxSearchData
    temData.value = inputValue
    __that.setData({
      wxSearchData: temData,
    })

    __searchFunction(inputValue)
    wx.setNavigationBarTitle({
      title: 'i古诗词',
      page: 'main'
    })
  } else {
    if (__that.data.page != 'like') {
      __that.getData(__that)
    }
  }
}


function getHisKeys() {
  var value = []
  try {
    value = wx.getStorageSync('wxSearchHisKeys')
    if (value) {

      var temData = __that.data.wxSearchData
      temData.his = value
      __that.setData({
        wxSearchData: temData,
      })
    }
  } catch (e) {

  }
}


function wxSearchAddHisKey(inputValue) {
  if (!inputValue || inputValue.length == 0) {
    return
  }
  var value = wx.getStorageSync('wxSearchHisKeys')
  if (value) {
    if (value.indexOf(inputValue) < 0) {
      value.unshift(inputValue)
    }
    wx.setStorage({
      key: "wxSearchHisKeys",
      data: value,
      success: function () {
        getHisKeys(__that)
      }
    })
  } else {
    value = []
    value.push(inputValue)
    wx.setStorage({
      key: "wxSearchHisKeys",
      data: value,
      success: function () {
        getHisKeys(__that)
      }
    })
  }
}


function wxSearchDeleteAll() {
  wx.removeStorage({
    key: 'wxSearchHisKeys',
    success: function (res) {
      var value = []
      var temData = __that.data.wxSearchData
      temData.his = value
      __that.setData({
        wxSearchData: temData,
      })
    }
  })
}


module.exports = {
  init: init,
  wxSearchInput: wxSearchInput,
  wxSearchKeyTap: wxSearchKeyTap,
  wxSearchDeleteAll: wxSearchDeleteAll,
  wxSearchConfirm: wxSearchConfirm,
  wxSearchClear: wxSearchClear,
  search: search,
}