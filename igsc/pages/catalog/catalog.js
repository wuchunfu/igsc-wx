var config = require('../../config')
var util = require('../../utils/util.js')
var wx_search = require('../search/search.js')
const background_audio_manager = wx.getBackgroundAudioManager()
background_audio_manager.referrerPolicy = 'origin'
Page({
  data: {
    gscitems: [],
    page: 'main',
    historyplay: null,
    current_paly_id: 0,
    page_num: 1,
    show_bottom_button: false,
    total: 0,
    total_page: 0,
    page_size: 20,
    search_pattern: 'all',
    scroll_height: 0,
    to_top: 'work_item1',
    show_search_box: false,
    fti: false,
  },
  getcurrent_paly_id: function () {
    var that = this
    var pages = getCurrentPages()
    var current_page = pages[pages.length - 1]
    if (this != current_page) {
      that = current_page
    }
    if (background_audio_manager && !background_audio_manager.paused) {
      if (background_audio_manager.src) {
        that.setData({
          current_paly_id: background_audio_manager._audio_id,
        })
        return true
      }
    }
    that.setData({
      current_paly_id: 0
    })
    return false
  },
  go2detail: function (e) {
    var id_ = e.currentTarget.dataset.id_
    var split_words = e.currentTarget.dataset.words
    split_words = split_words ? split_words : ''
    var pages = getCurrentPages()
    var url = '/pages/gsc/gsc?id=' + id_ + '&from=' + this.data.page + '&split_words=' + split_words + '&search_pattern=' + this.data.search_pattern
    if (pages.length == config.max_layer) {
      wx.redirectTo({
        url: url,
      })
    } else {
      wx.navigateTo({
        url: url
      })
    }
  },
  trans_fti: function (item) {
    if (item.hasOwnProperty('short_content')) {
      item.short_content = util.traditionalized(item.short_content)
    }
    if (item.hasOwnProperty('content')) {
      item.content = util.traditionalized(item.content)
    }
    item.work_author = util.traditionalized(item.work_author)
    item.work_dynasty = util.traditionalized(item.work_dynasty)
    item.work_title = util.traditionalized(item.work_title)
  },
  get_home_data: function (that) {
    wx.getStorage({
      key: 'gsc_items' + util.format_time(new Date()),
      success: function (res) {
        var items = res.data
        if (!items || items.length == 0) {
          that.get_all_data(that)
        } else {
          if (that.data.fti) {
            for (var i = 0; i < items.length; i++) {
              that.trans_fti(items[i])
            }
          }
          that.setData({
            gscitems: items,
            total: items.length,
            show_bottom_button: false,
          })
          that.storage_result(items)
        }
      },
      fail: function () {
        that.get_all_data(that)
      }
    })
  },
  get_all_data: function (context) {
    var that = this
    wx.showLoading({
      title: '加载中...',
    })
    wx.request({
      url: config.gsc_url + 'short_index',
      enableHttp2: true,
      success(result) {
        if (!result || result.data.code != 0) {
          wx.showToast({
            title: that.data.fti ? '網絡異常~~' : '网络异常~~',
            icon: 'none'
          })
          return
        }
        var datas = result.data.data.data
        if (!datas) {
          datas = []
        }
        var dd = []
        if (that.data.fti) {
          for (var i = 0; i < datas.length; i++) {
            that.trans_fti(datas[i])
          }
        }
        for (var data of datas) {
          data.short_content = that.process_short_content(data.content)
          data.split_words = ''
          dd.push(data)
        }
        that.setData({
          gscitems: dd,
          total: dd.length,
          to_top: 'work_item1',
          show_bottom_button: false,
        })
        that.storage_result(dd)
        wx.setStorage({
          key: 'gsc_items' + util.format_time(new Date()),
          data: dd
        })
        wx.hideLoading()
      },
      fail: function () {
        wx.hideLoading()
        wx.showToast({
          title: that.data.fti ? '加載失敗:(' : '加载失败:(',
          icon: 'none'
        })
      }
    })
  },
  storage_result: function (items) {
    var search_result_ids = []
    var audio_ids = []
    var playlist = []
    for (var d of items) {
      search_result_ids.push(d.id)
      if (d.audio_id > 0) {
        audio_ids.push(d.audio_id)
        playlist.push({
          work_id: d.id,
          title: d.work_title,
          author: d.work_dynasty + '·' + d.work_author
        })
      }
    }
    wx.setStorageSync('search_result_ids', search_result_ids)
    if (audio_ids.length > 0) {
      wx.setStorageSync('audio_ids', audio_ids)
      wx.setStorageSync('playlist', playlist)
    }
  },
  interval_get_current_play: function () {
    var that = this
    var currentInterval = wx.getStorageSync('currentInterval')
    if (currentInterval) {
      clearInterval(currentInterval)
    }
    currentInterval = setInterval(() => {
      that.getcurrent_paly_id()
    }, 600)
    wx.setStorageSync('currentInterval', currentInterval)
  },
  onLoad: function (options) {
    var that = this
    var pages = getCurrentPages()
    var current_page = pages[pages.length - 1]
    if (this != current_page) {
      that = current_page
    }
    if (options && options.hasOwnProperty('q')) {
      if (options.hasOwnProperty('sp')) {
        that.setData({
          search_pattern: options.sp,
        })
      }
      if (options.hasOwnProperty('fp')) {
        that.setData({
          page: options.fp,
        })
      }
      that.my_search_function(options.q)
      wx_search.search(options.q)
    } else {
      wx.getStorage({
        key: 'gsc_items' + util.format_time(new Date()),
        success: function (res) {
          if (!res) {
            wx.showToast({
              title: that.data.fti ? '加載失敗:(' : '加载失败:(',
              icon: 'none'
            })
            return
          }
          var items = res.data
          if (!items || items.length == 0) {
            that.get_all_data(that)
          } else {
            wx.showLoading({
              title: '加载中...',
            })
            if (that.data.fti) {
              for (var i = 0; i < items.length; i++) {
                that.trans_fti(items[i])
              }
            }
            that.setData({
              gscitems: items,
              total: items.length,
            })
            that.storage_result(items)
            wx.hideLoading()
          }
        },
        fail: function (err) {
          that.get_all_data(that)
        }
      })
    }
  },
  wx_search_input: wx_search.wx_search_input,
  wx_search_key_tap: wx_search.wx_search_key_tap,
  wx_search_delete_all: wx_search.wx_search_delete_all,
  wx_search_confirm: wx_search.wx_search_confirm,
  wx_search_clear: wx_search.wx_search_clear,
  page_down: function () {
    if (this.data.page_num >= this.data.total_page || (!this.search_v && this.data.page != 'like')) {
      return
    }
    this.setData({
      page_num: this.data.page_num + 1,
    })
    this.my_search_function(this.search_v)
  },
  page_up: function () {
    if (this.data.page_num <= 1 || (!this.search_v && this.data.page != 'like')) {
      return
    }
    this.setData({
      page_num: this.data.page_num - 1,
    })
    this.my_search_function(this.search_v)
  },
  radio_change: function (e) {
    this.setData({
      search_pattern: e.detail.value,
      show_bottom_button: false,
      page_num: 1,
    })
    if (this.data.wx_search_data.value) {
      this.my_search_function(this.data.wx_search_data.value)
    }
  },
  process_short_content: function(content){
    var splits = content.split(/([。！？! ? \n ；;])/)
    if (splits.length > 0) {
      var s = ''
      for (var i = 0; i < splits.length; i++) {
        if (!splits[i] || splits[i].length == 0) {
          continue
        }
        s += splits[i]
        if (['。', '！', '？', '!', '?', '\n' , '；', ';'].indexOf(splits[i]) != -1) {
          break
        }
      }
      return s
    }
    return content
  },
  my_search_function: function (value) {
    var that = this
    wx.showLoading({
      title: that.data.fti ? '加載中' : '加载中...'
    })
    var pages = getCurrentPages()
    var current_page = pages[pages.length - 1]
    if (that != current_page) {
      that = current_page
    }
    that.search_v = value
    var page = that.data.page
    var open_id = 'a'
    if (page == 'like') {
      try {
        open_id = wx.getStorageSync('user_open_id')
      } catch (e) {}
      if (!open_id) {
        util.user_login()
        wx.showToast({
          title: that.data.fti ? '請重試一次' : '请重试一次',
          icon: 'none'
        })
      }
    }
    value = util.simplized(value)
    var enable_cache = false
    if (!value && page == 'like') {
      var url = config.gsc_url + 'mylike_by_page/' + open_id + '?page_num=' + that.data.page_num + '&page_size=' + that.data.page_size + '&search_pattern=' + that.data.search_pattern + '&t=' + util.api_version()
    } else {
      if (value && value == '音频') {
        var url = config.gsc_url + 'query_by_page/' + value + '/' + page + '/' + open_id + '?page_num=' + that.data.page_num + '&page_size=' + that.data.page_size + '&search_pattern=' + that.data.search_pattern + '&t=' + util.api_version()
      } else {
        var url = config.gsc_url + 'query_by_page_a/' + page + '/' + value + '/' + open_id + '?page_num=' + that.data.page_num + '&page_size=' + that.data.page_size + '&search_pattern=' + that.data.search_pattern + '&t=' + util.api_version()
        enable_cache = true
      }
    }
    wx.request({
      url: url,
      enableHttp2: true,
      enableCache: enable_cache,
      success(result) {
        if (!result || result.data.code != 0) {
          wx.showToast({
            title: that.data.fti ? '網絡異常~~' : '网络异常~~',
            icon: 'none'
          })
          return
        }
        var datas = result.data.data.data
        if (!datas) {
          datas = []
        }
        var dd = []
        if (that.data.fti) {
          for (var i = 0; i < datas.length; i++) {
            that.trans_fti(datas[i])
          }
        }
        for (var data of datas) {
          data.short_content = that.process_short_content(data.content)
          if (that.search_v && result.data.data && result.data.data.split_words) {
            var split_words = result.data.data.split_words.replaceAll('+', ',').replaceAll(' ', ',')
            if (that.data.fti) {
              split_words = util.traditionalized(split_words)
            }
            data.split_words = split_words
            split_words = split_words.split(',').filter((item, pos) => item && item.length > 0)
            if (that.data.search_pattern == 'all' || that.data.search_pattern == 'content') {
              data.split_content = util.hl_content(data.short_content, split_words, [], split_words, true)
            }
            if (that.data.search_pattern == 'all' || that.data.search_pattern == 'title') {
              data.split_title = util.hl_content(data.work_title, split_words, [], split_words, true)
            }
          } else {
            data.split_words = ''
            data.split_content = []
            data.split_title = []
          }
          dd.push(data)
        }
        that.setData({
          gscitems: dd,
          total: result.data.data.total,
          show_bottom_button: result.data.data.total > that.data.page_size && value != '音频',
          total_page: Math.ceil(result.data.data.total / that.data.page_size),
          to_top: 'work_item1',
        })
        that.storage_result(dd)
        if (dd.length == 0) {
          util.show_success(that.data.fti ? '沒有相關內容' : '没有相关内容')
        } else {
          wx.hideLoading()
        }
        that.set_scroll_height()
      },
      fail: (e) => {
        wx.showToast({
          title: that.data.fti ? '網絡異常~~' : '网络异常~~',
          icon: 'none'
        })
      }
    })
    setTimeout(() => {
      that.set_title(that)
    }, 200)
  },
  my_goback_function: function () {
    wx.reLaunch({
      url: '../gsc/gsc?id=1&from=main'
    })
  },
  set_scroll_height: function () {
    var that = this
    var screen_height = wx.getSystemInfoSync().windowHeight
    var query = wx.createSelectorQuery().in(this)
    query.select('#top_search').boundingClientRect()
    query.exec(res => {
      if (res.length > 0 && res[0]) {
        that.setData({
          scroll_height: screen_height - res[0].height - 25,
        })
      } else {
        that.setData({
          scroll_height: screen_height - 25,
        })
      }
    })
  },
  onReady: function () {
    var that = this
    var pages = getCurrentPages()
    var current_page = pages[pages.length - 1]
    if (this != current_page) {
      that = current_page
    }
    that.interval_get_current_play()
  },
  onShow: function () {
    var that = this
    var pages = getCurrentPages()
    var current_page = pages[pages.length - 1]
    if (that != current_page) {
      that = current_page
    }
    var fti = wx.getStorageSync('fti') ? true : false
    if (fti != that.data.fti) {
      if (!that.search_v && that.data.page == 'main') {
        that.get_home_data(that)
      } else {
        that.my_search_function(that.search_v)
        if (that.search_v) {
          if (fti) {
            that.search_v = util.traditionalized(that.search_v)
          } else {
            that.search_v = util.simplized(that.search_v)
          }
        }
      }
    }
    that.setData({
      fti: fti,
    })
    var hot = ['杜甫', '白居易', '苏轼', '姜夔', '水调歌头', '少年游', '永遇乐', '蝶恋花', '与陈伯之书', '滕王阁序', '洛神赋', '纤手破新橙']
    var mind = ['宋祁', '朱淑真', '吴文英', '晏几道', '秦观', '贺铸', '王安石', '李之仪', '周邦彦', '姜夔', '晏殊', '张先', '范仲淹', '晁补之', '赵佶', '宋徽宗', '张元干', '岳飞', '史达祖', '刘克庄', '蒋捷', '钱惟演', '张炎', '张孝祥', '张镃', '张抡', '青玉案', '元宵', '中秋', '蝶恋花', '满庭芳', '卜算子', '菩萨蛮', '忆江南', '浣溪沙', '诉衷情', '清平乐', '雨霖铃', '定风波', '八声甘州', '青门引', '念奴娇', '水调歌头', '洞仙歌', '渔家傲', '横塘路', '瑞龙吟', '六丑', '欧阳修', '声声慢', '永遇乐', '贺新郎', '水龙吟', '程垓', '齐天乐', '苏轼', '辛弃疾', '白居易', '李白', '杜甫', '李清照', '杜审言']
    if (fti) {
      hot = ['杜甫', '白居易', '蘇軾', '姜夔', '水調歌頭', '少年遊', '永遇樂', '蝶戀花', '與陳伯之書', '滕王閣序', '洛神賦', '纖手破新橙']
      mind = ['宋祁', '朱淑真', '吳文英', '晏幾道', '秦觀', '賀鑄', '王安石', '李之儀', '周邦彥', '姜夔', '晏殊', '張先', '範仲淹', '晁補之', '趙佶', '宋徽宗', '張元幹', '嶽飛', '史達祖', '劉克莊', '蔣捷', '錢惟演', '張炎', '張孝祥', '張镃', '張掄', '青玉案', '元宵', '中秋', '蝶戀花', '滿庭芳', '蔔算子', '菩薩蠻', '憶江南', '浣溪沙', '訴衷情', '清平樂', '雨霖鈴', '定風波', '八聲甘州', '青門引', '念奴嬌', '水調歌頭', '洞仙歌', '漁家傲', '橫塘路', '瑞龍吟', '六醜', '歐陽修', '聲聲慢', '永遇樂', '賀新郎', '水龍吟', '程垓', '齊天樂', '蘇軾', '辛棄疾', '白居易', '李白', '杜甫', '李清照', '杜審言']
    }
    wx_search.init(
      that, hot, mind,
      that.my_search_function,
      that.my_goback_function
    )
    var tem_data = that.data.wx_search_data
    if (that.search_v && tem_data) {
      if (tem_data.value != that.search_v) {
        tem_data.value = that.search_v
        that.setData({
          wx_search_data: tem_data,
        })
      }
    }
    wx.getStorage({
      key: 'historyplay',
      success: function (res) {
        if (res) {
          var historylist = []
          var historyplay = res.data
          for (var x in historyplay) {
            historylist.push(historyplay[x])
          }
          historylist.sort((a, b) => {
            return parseInt(b.times) - parseInt(a.times)
          })
          historylist = historylist.slice(0, 10)
          for (var x in historylist) {
            if (historylist[x].times > 99) {
              if (that.data.fti) {
                historylist[x].title = util.traditionalized(historylist[x].title)
              } else {
                historylist[x].title = util.simplized(historylist[x].title)
              }
              historylist[x].times = '99+'
            }
          }
          that.setData({
            historyplay: historylist,
          })
        } else {
          that.setData({
            historyplay: null,
          })
        }
      },
      fail: function () {
        that.setData({
          historyplay: null,
        })
      }
    })
    that.interval_get_current_play()
    that.set_scroll_height()
    that.set_title(that)
  },
  set_title: function (that) {
    if (that.data.page == 'like') {
      wx.setNavigationBarTitle({
        title: '我的收藏'
      })
    } else {
      var title = 'i古诗词'
      if (that.data.fti) {
        title = 'i古詩詞'
      }
      wx.setNavigationBarTitle({
        title: title
      })
    }
  },
  purge_some_data: function () {
    var playingint = wx.getStorageSync('playingint')
    if (playingint) {
      clearInterval(playingint)
      wx.removeStorageSync('playingint')
    }
    var currentInterval = wx.getStorageSync('currentInterval')
    if (currentInterval) {
      clearInterval(currentInterval)
      wx.removeStorageSync('currentInterval')
    }
  },
  onHide: function () {
    this.purge_some_data()
  },
  onUnload: function () {
    this.purge_some_data()
  },
  do_get_like_list: function (open_id) {
    var that = this
    that.search_v = that.data.wx_search_data.value
    wx.request({
      url: config.gsc_url + 'mylike_by_page/' + open_id + '?page_num=' + that.data.page_num + '&page_size=' + that.data.page_size + '&search_pattern=' + that.data.search_pattern + '&t=' + util.api_version(),
      enableHttp2: true,
      success(result) {
        if (!result || result.data.code != 0) {
          wx.showToast({
            title: that.data.fti ? '網絡異常~~' : '网络异常~~',
            icon: 'none'
          })
          wx.hideNavigationBarLoading()
          wx.stopPullDownRefresh()
          return
        }
        var datas = result.data.data.data
        if (!datas) {
          datas = []
        }
        var dd = []
        if (that.data.fti) {
          for (var i = 0; i < datas.length; i++) {
            that.trans_fti(datas[i])
          }
        }
        for (var data of datas) {
          data.short_content = that.process_short_content(data.content)
          data.split_words = ''
          dd.push(data)
        }
        that.setData({
          gscitems: dd,
          total: result.data.data.total,
          show_bottom_button: result.data.data.total > that.data.page_size,
          total_page: Math.ceil(result.data.data.total / that.data.page_size),
          to_top: 'work_item1',
        })
        that.storage_result(dd)
      }
    })
  },
  get_like_list: function(){
    var open_id = ''
    try {
      open_id = wx.getStorageSync('user_open_id')
    } catch (e) {}
    if (!open_id) {
      util.user_login()
      wx.showToast({
        title: that.data.fti ? '請重試一次' : '请重试一次',
        icon: 'none'
      })
      wx.hideNavigationBarLoading()
      wx.stopPullDownRefresh()
      return
    }
    this.do_get_like_list(open_id)
  },
  onPullDownRefresh: function () {
    wx.showLoading({
      title: '加载中...',
    })
    var that = this
    var pages = getCurrentPages()
    var current_page = pages[pages.length - 1]
    if (this != current_page) {
      that = current_page
    }
    if (that.data.page == 'main') {
      that.get_like_list()
    } else {
      that.get_home_data(that)
    }
    if (that.data.page == 'main') {
      that.setData({
        page: 'like',
      })
    } else {
      that.setData({
        page: 'main',
      })
    }
    setTimeout(() => {
      that.set_title(that)
    }, 200);
    wx.hideNavigationBarLoading()
    wx.stopPullDownRefresh()
    wx_search.wx_search_clear()
    wx.hideLoading()
  },
  onReachBottom: function () {
    return
  },
  onShareTimeline: function () {
    var title = '欢迎体验 i古诗词'
    if (this.data.fti) {
      title = '歡迎體驗 i古詩詞'
    }
    return {
      title: title,
      query: 'from=timeline',
      imageUrl: '/static/share.jpg',
      success: function (res) {
        util.show_success('分享成功')
      },
      fail: function (res) {
        util.show_success('取消分享')
      }
    }
  },
  onShareAppMessage: function (res) {
    var that = this
    var pages = getCurrentPages()
    var current_page = pages[pages.length - 1]
    if (this != current_page) {
      that = current_page
    }
    var q = that.data.wx_search_data.value
    var title = 'i古诗词 ' + (q ? q : '我们都爱古诗词')
    if (this.data.fti) {
      title = 'i古詩詞 ' + (q ? q : '我們都愛古詩詞')
    }
    return {
      title: title,
      path: '/pages/catalog/catalog' + (q ? ('?q=' + q + '&sp=' + that.data.search_pattern) : ''),
      imageUrl: '/static/share.jpg',
      success: function (res) {
        util.show_success('分享成功')
      },
      fail: function (res) {
        util.show_success('取消分享')
      }
    }
  },
  scroll: function (e) {
    this.set_scroll_height()
  },
  show_hide_search_box: function (e) {
    this.setData({
      show_search_box: e.detail.value,
    })
    this.set_scroll_height()
  },
  onResize: function () {
    this.set_scroll_height()
  },
  clear_play_history: function () {
    wx.removeStorageSync('historyplay')
    this.setData({
      historyplay: null,
    })
    this.set_scroll_height()
  }
})