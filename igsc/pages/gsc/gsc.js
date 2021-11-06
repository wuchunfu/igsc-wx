var config = require('../../config')
var wechat_si = requirePlugin('WechatSI')
var util = require('../../utils/util.js')
const background_audio_manager = wx.getBackgroundAudioManager()
const inner_audio_context = wx.createInnerAudioContext()
Page({
  data: {
    work_item: null,
    audio_id: 0,
    duration: 0,
    audio_url: '',
    current_work_item: '',
    poster: 'http://m.qpic.cn/psb?/V121Rqgy1YUsix/IviqfBJYA85bdpCyovu1Pi2.YVOCku1MlgYcy4FbGv0!/b/dDEBAAAAAAAA&bo=7wHzAQAAAAARByw!&rf=viewer_4',
    current_tab: 0,
    show_content: '',
    playing: false,
    duration_show: '',
    current_time_show: '',
    seek2: {
      seek: 0,
      audio_id: 0
    },
    slide_value: 0,
    time2close: 0,
    close_play_time: 0,
    sliding: 0, // 1 正在滑动 2 刚刚有滑动
    playing_audio_id: 0, // 正在播放的id
    speeching: false,
    speeching_id: 0,
    speeching_urls: [],
    seek3: {
      seek: 0,
      work_id: 0,
      index: 0,
    },
    from_page: 'main',
  },
  setTimed: function () {
    var that = this
    wx.showActionSheet({
      itemList: ['2小时', '1小时', '30分钟', '10分钟', '播放完这首', '不设置'],
      success: function (res) {
        var index = res.tapIndex
        var seconds = 0
        switch (index) {
          case 0:
            seconds = 7200
            break
          case 1:
            seconds = 3600
            break
          case 2:
            seconds = 1800
            break
          case 3:
            seconds = 600
            break
          case 4:
            var currentTime = background_audio_manager.currentTime
            seconds = background_audio_manager.duration - (currentTime ? currentTime : 0) + 0.5
            break
          case 5:
            seconds = -1
            break
        }
        try {
          var setTimedInt = wx.getStorageSync('setTimedInt')
          if (!setTimedInt) {
            setTimedInt = 0
          }
        } catch (e) {
          setTimedInt = 0
        }
        if (seconds == -1) {
          wx.removeStorageSync('time2close')
          wx.removeStorageSync('close_play_time')
          if (that.data.time2close && that.data.time2close != 0) {
            if (setTimedInt > 0) {
              clearInterval(setTimedInt)
              wx.setStorageSync('setTimedInt', 0)
            }
            wx.showToast({
              title: '取消成功',
              icon: 'none'
            })
          }
          that.setData({
            time2close: 0,
            close_play_time: 0,
          })
        } else {
          var time2close = (new Date).getTime() / 1000 + seconds
          if (that.data.playing) {
            wx.showToast({
              title: '播放器将于' + util.timetrans(time2close).slice(11) + '关闭',
              icon: 'none'
            })
            if (setTimedInt > 0) {
              clearInterval(setTimedInt)
              wx.setStorageSync('setTimedInt', 0)
            }
            wx.setStorageSync('time2close', time2close)
            wx.setStorageSync('close_play_time', parseInt(seconds / 60))
            that.setData({
              time2close: time2close,
              close_play_time: parseInt(seconds / 60),
            })
            var timedId = setInterval(() => {
              try {
                var time2closeS = wx.getStorageSync('time2close')
              } catch (e) {
                time2closeS = 0
              }
              if (!time2closeS || time2closeS == 0 || (new Date()).getTime() >= time2close * 1000) {
                that.pauseplaybackaudio()
                that.setData({
                  time2close: 0,
                  close_play_time: 0,
                })
                wx.showToast({
                  title: '定时已到~~',
                  icon: 'none'
                })
                wx.removeStorageSync('time2close')
                wx.removeStorageSync('close_play_time')
                clearInterval(timedId)
                wx.setStorageSync('setTimedInt', 0)
              }
            }, 1000)
            wx.setStorageSync('setTimedInt', timedId)
          } else {
            wx.showToast({
              title: '请先打开播放器',
              icon: 'none'
            })
          }
        }
      },
      fail: function (res) {}
    })
  },
  change_mode: function () {
    //xunhuan->one->shuffle->xunhuan
    var that = this
    var mode = 'xunhuan'
    if (this.data.mode == 'hc') {
      wx.showToast({
        title: '请等待语音播放完毕...',
        icon: 'none'
      })
      return false
    }
    if (this.data.mode == 'xunhuan') {
      this.setData({
        mode: 'one',
      })
      mode = 'one'
      wx.showToast({
        title: '单曲循环',
        icon: 'none'
      })
      wx.setStorageSync('singleid', {
        'id': that.data.work_item.id,
        'url': that.data.audio_url,
        'title': that.data.work_item.work_title,
        'author': that.data.work_item.work_author
      })
    } else if (this.data.mode == 'one') {
      this.setData({
        mode: 'shuffle',
      })
      wx.showToast({
        title: '随机播放',
        icon: 'none'
      })
      mode = 'shuffle'
    } else if (this.data.mode == 'shuffle') {
      this.setData({
        mode: 'xunhuan',
      })
      wx.showToast({
        title: '循环播放',
        icon: 'none'
      })
      mode = 'xunhuan'
    }
    try {
      wx.setStorageSync('play_mode', mode)
    } catch (e) {}
  },
  get_by_id: function (key, pull = false) {
    if (!pull) {
      wx.showLoading({
        title: '加载中...'
      })
    }
    var that = this
    wx.getStorage({
      key: 'gsc' + key + util.formatTime(new Date()),
      success: function (res) {
        var d = res.data
        that.setData(d)
        that.get_play_mode()
        var time2close = wx.getStorageSync('time2close')
        that.setData({
          time2close: time2close && time2close > 0 ? time2close : 0,
        })
        if (time2close && time2close > 0) {
          var last_micro_seconds = time2close - (new Date()).getTime() / 1000
          if (last_micro_seconds) {
            that.setData({
              close_play_time: parseInt(last_micro_seconds / 60.0 + 0.5),
            })
          }
        }
      },
      fail: function () {
        var open_id = ''
        try {
          open_id = wx.getStorageSync('user_open_id')
        } catch (e) {}
        if (!open_id) {
          util.userLogin()
        }
        if (open_id == '') {
          open_id = 'adcd'
        }
        wx.request({
          url: config.gscUrl + 'index/' + key + '/' + open_id,
          success(result) {
            if (!result || result.data.code != 0) {
              wx.showToast({
                title: '网络异常~~',
                icon: 'none'
              })
              return
            }
            var target_id = 0
            var work = result.data.data.data
            var show_content = ''
            if (work.intro) {
              target_id = 0
              show_content = work.intro
            } else if (work.annotation) {
              target_id = 1
              show_content = work.annotation
            } else if (work.translation) {
              target_id = 2
              show_content = work.translation
            } else if (work.appreciation) {
              target_id = 3
              show_content = work.appreciation
            } else if (work.master_comment) {
              target_id = 4
              show_content = work.master_comment
            }
            show_content = show_content.replace(/　　/g, '\n')
            show_content = show_content.replace(/\n/g, '\n　　')
            show_content = show_content.replace(/\t/g, '\n　　')
            if (work.id % 4 != 0) {
              var url = config.neteaseaudio_url
            } else {
              var url = config.qaudio_url
            }
            if (work.layout == 'indent') {
              work.content = work.content.replace(/　　/g, '\n')
              work.content = work.content.replace(/\n/g, '\n　　')
              work.content = work.content.replace(/\t/g, '\n　　')
            }
            that.setData({
              work_item: work,
              audio_id: work.audio_id,
              audio_url: url + work.audio_id + '.m4a',
              current_work_item: work.work_title + '-' + work.work_author,
              current_tab: target_id,
              show_content: show_content,
              duration_show: '',
              current_time_show: '',
              seek2: {
                seek: 0,
                audio_id: work.audio_id,
              },
              slide_value: 0,
            })
            if (work.like == 1) {
              wx.setStorage({
                key: 'gsc' + key + util.formatTime(new Date()),
                data: that.data,
              })
            }
            that.get_play_mode()
            var time2close = wx.getStorageSync('time2close')
            that.setData({
              time2close: time2close && time2close > 0 ? time2close : 0,
            })
            if (time2close && time2close > 0) {
              var last_micro_seconds = time2close - (new Date()).getTime() / 1000
              if (last_micro_seconds) {
                that.setData({
                  close_play_time: parseInt(last_micro_seconds / 60.0 + 0.5),
                })
              }
            }
          }
        })
      }
    })
  },
  do_operate_play: function (key, mode = 'xunhuan') {
    var that = this
    var audio_ids = wx.getStorageSync('audio_ids')
    if (!audio_ids) {
      wx.showToast({
        title: '播放失败~~',
        icon: 'none',
      })
      return
    }
    var play_id = 1
    var mode = that.data.mode
    if (mode == 'xunhuan') {
      var index = audio_ids.indexOf(
        that.data.work_item.id)
      //循环播放
      if (key == 'next') {
        if (index == audio_ids.length - 1) {
          play_id = audio_ids[0]
        } else {
          play_id = audio_ids[index + 1]
        }
      } else {
        if (index == 0) {
          play_id = audio_ids[audio_ids.length - 1]
        } else {
          play_id = audio_ids[index - 1]
        }
      }
    } else if (that.data.mode == 'one') {
      //单曲循环
      try {
        var play_id_url = wx.getStorageSync('singleid')
        background_audio_manager.src = play_id_url.url
        background_audio_manager.title = play_id_url.title
        background_audio_manager.singer = play_id_url.author
        background_audio_manager.coverImgUrl = that.data.poster
        background_audio_manager.epname = ' i古诗词 '
        background_audio_manager.startTime = 0
        background_audio_manager._audio_id = that.data.work_item.audio_id
        background_audio_manager.seek(0)
        inner_audio_context.pause()
        background_audio_manager.play()
        if (play_id_url.title) {
          that.record_play(play_id_url.id, play_id_url.title + '-' + play_id_url.author)
        }
      } catch (e) {
        wx.setStorageSync('singleid', {
          'id': that.data.work_item.id,
          'url': that.data.audio_url,
          'title': that.data.work_item.work_title,
          'author': that.data.work_item.work_author
        })
        background_audio_manager.src = that.data.audio_url
        background_audio_manager.title = that.data.work_item.work_title
        background_audio_manager.epname = ' i古诗词 '
        background_audio_manager.singer = that.data.work_item.work_author
        background_audio_manager.coverImgUrl = that.data.poster
        background_audio_manager._audio_id = that.data.work_item.audio_id
        inner_audio_context.pause()
        background_audio_manager.play()
        if (that.data.work_item && that.data.work_item.work_title) {
          that.record_play(that.data.work_item.id, that.data.work_item.work_title + '-' + that.data.work_item.work_author)
        }
      }
    } else {
      //随机播放
      var play_id = parseInt(audio_ids.length * Math.random())
      if (play_id >= audio_ids.length) {
        play_id = audio_ids.length - 1
      }
      play_id = audio_ids[play_id]
    }
    if (mode != 'one') {
      try {
        that.get_by_id(play_id)
        var try_times = 0
        var playInt = setInterval(() => {
          if (that.data.work_item && that.data.work_item.id == play_id) {
            that.playsound()
            if (that.data.work_item.work_title) {
              that.record_play(play_id, that.data.work_item.work_title + '-' + that.data.work_item.work_author)
            }
            clearInterval(playInt)
          }
          try_times++
          if (try_times >= 100) {
            wx.showToast({
              title: '播放失败:(',
              icon: 'none'
            })
            clearInterval(playInt)
          }
        }, 600)
      } catch (e) {
        wx.showToast({
          title: '播放失败:(',
          icon: 'none'
        })
      }
    }
  },
  operate_play: function (e) {
    this.do_operate_play(e.target.dataset.key, this.data.mode)
  },
  _do_speak: function (s, start, urls, work_id) {
    var that = this
    wechat_si.textToSpeech({
      lang: 'zh_CN',
      tts: true,
      content: s.substring(start, 330 + start),
      success: function (res) {
        urls.push(res.filename)
        if ((start + 330) >= s.length) {
          wx.hideLoading()
          that.setData({
            speeching_urls: urls,
            speeching_id: work_id,
          })
          //inner_audio_context.stop()
          if (that.data.seek3.work_id == work_id) {
            inner_audio_context.src = urls[that.data.seek3.index]
            inner_audio_context._start_index = that.data.seek3.index
            // 安卓trick
            if (wx.getStorageSync('platform') == 'android') {
              inner_audio_context.play()
              inner_audio_context.pause()
            }
            inner_audio_context.seek(that.data.seek3.seek)
          } else {
            inner_audio_context.src = urls[0]
            inner_audio_context._start_index = 0
          }
          inner_audio_context._work_id = work_id
          inner_audio_context.playbackRate = 0.8
          inner_audio_context.play()
          wx.setStorage({
            key: 'speak_audio:' + work_id,
            data: {
              expired_time: res.expired_time,
              urls: urls,
            }
          })
        } else {
          that._do_speak(s, start + 330, urls, work_id)
        }
      },
      fail: function (res) {
        wx.hideLoading()
        inner_audio_context.pause()
        wx.showToast({
          title: '播放出错:(',
          icon: 'none',
        })
      }
    })
  },
  do_speak: function (work_item) {
    var data = wx.getStorageSync('speak_audio:' + work_item.id)
    if (data) {
      if (data.expired_time > (new Date().getTime() / 1000 + 60)) {
        //inner_audio_context.stop()
        this.setData({
          speeching_urls: data.urls,
          speeching_id: work_item.id,
        })
        if (this.data.seek3.work_id == work_item.id) {
          inner_audio_context.src = data.urls[this.data.seek3.index]
          inner_audio_context._start_index = this.data.seek3.index
          // 安卓跳转失败, it's just a trick
          if (wx.getStorageSync('platform') == 'android') {
            inner_audio_context.play()
            inner_audio_context.pause()
          }
          inner_audio_context.seek(this.data.seek3.seek)
        } else {
          inner_audio_context.src = data.urls[0]
          inner_audio_context._start_index = 0
        }
        inner_audio_context._work_id = work_item.id
        inner_audio_context.playbackRate = 0.8
        inner_audio_context.play()
        return
      }
    }
    var s = []
    s.push(work_item.work_title)
    s.push(work_item.work_dynasty + '·' + work_item.work_author)
    if (work_item.foreword) {
      s.push(work_item.foreword)
    }
    s.push(work_item.content)
    var s = s.join('\n')
    wx.showLoading({
      title: '音频加载中...',
    })
    return this._do_speak(s, 0, [], work_item.id)
  },
  speak: function (e) {
    var speeching = e.target.dataset.speeching
    if (speeching) {
      inner_audio_context.pause()
    } else {
      this.pauseplaybackaudio()
      this.do_speak(this.data.work_item)
    }
  },
  do_copy: function (e) {
    var s = []
    s.push(this.data.work_item.work_title)
    s.push(this.data.work_item.work_dynasty + '·' + this.data.work_item.work_author)
    if (this.data.work_item.foreword) {
      s.push(this.data.work_item.foreword + '(序)')
    }
    s.push(this.data.work_item.content.replace(/　　/g, ''))
    if (this.data.work_item.audio_id > 0) {
      s.push('\n' + config.neteaseaudio_url + this.data.work_item.audio_id + '.m4a')
    }
    wx.setClipboardData({
      data: s.join('\n'),
    })
  },
  operate_like: function (e) {
    var like = e.target.dataset.like
    var operate = like == 1 ? 'dislike' : 'like'
    var that = this
    wx.getStorage({
      key: 'user_open_id',
      success: function (res) {
        var open_id = res.data
        var gsc_id = that.data.work_item.id
        if (open_id.length == 0 || gsc_id == 0) {
          wx.showToast({
            title: '操作失败，请稍后再试',
            icon: 'none'
          })
          return
        }
        wx.request({
          url: config.service.host + '/user/' + operate + '/' + open_id + '/' + gsc_id,
          success: function (res) {
            if (!res || res.data.code != 0) {
              wx.showToast({
                title: '网络异常~~',
                icon: 'none'
              })
              return
            }
            wx.showToast({
              title: res.data.data,
              icon: 'none'
            })
            if (operate == 'like') {
              wx.getStorage({
                key: 'not_show_like_toast',
                success: function (res) {
                  var toast_num = parseInt(res.data)
                  if (toast_num < 3) {
                    wx.showToast({
                      title: '收藏成功，可在首页下拉查看~',
                      duration: 3000,
                      icon: 'none',
                      success: function (res) {
                        wx.setStorage({
                          key: 'not_show_like_toast',
                          data: toast_num + 1,
                        })
                      }
                    })
                  }
                },
                fail: function (res) {
                  wx.hideToast()
                  wx.showModal({
                    title: '收藏成功',
                    content: '可在首页下拉进入收藏页面查看~',
                    showCancel: false,
                    confirmText: '知道了',
                    success: function (res) {
                      wx.setStorage({
                        key: 'not_show_like_toast',
                        data: 1,
                      })
                    }
                  })
                }
              })
            }
            if (res.data.code == 0) {
              var work_item = that.data.work_item
              if (operate == 'like') {
                work_item.like = 1
              } else {
                work_item.like = 0
              }
              that.setData({
                work_item: work_item,
              })
              wx.removeStorage({
                key: 'gsc' + work_item.id + util.formatTime(new Date()),
              })
            }
          }
        })
      },
      fail: function () {
        wx.showToast({
          title: '请稍后再试',
          icon: 'none'
        })
        util.userLogin()
      }
    })
  },
  pauseplaybackaudio: function () {
    background_audio_manager.stop()
    var currentTime = 1
    if (background_audio_manager.currentTime && background_audio_manager.currentTime > 1) {
      currentTime = background_audio_manager.currentTime
    }
    this.setData({
      seek2: {
        seek: currentTime,
        audio_id: background_audio_manager._audio_id,
      },
      slide_value: parseInt(currentTime / background_audio_manager.duration * 100),
      playing: false,
    })
  },
  playbackaudio: function (e) {
    var that = this
    var mode = wx.getStorageSync('play_mode')
    if (mode == 'hc') {
      that.reset_playmode()
    }
    if (that.data.playing) {
      that.pauseplaybackaudio()
    } else {
      if (that.data.mode == 'one') {
        wx.setStorageSync('singleid', {
          'id': that.data.work_item.id,
          'url': that.data.audio_url,
          'title': that.data.work_item.work_title,
          'author': that.data.work_item.work_author
        })
      }
      that.playsound()
      if (that.data.work_item && that.data.work_item.work_title) {
        that.record_play(that.data.work_item.id, that.data.work_item.work_title + '-' + that.data.work_item.work_author)
      }
    }
  },
  record_play: function (id_, title) {
    var that = this
    var historyplay = wx.getStorageSync('historyplay')
    if (!historyplay) {
      historyplay = {}
    }
    if (historyplay.hasOwnProperty(id_ + '')) {
      var old_data = historyplay[id_]
      old_data['times'] += 1
      historyplay[id_] = old_data
    } else {
      historyplay[id_] = {
        'id': id_,
        'title': title,
        'times': 1
      }
    }
    wx.setStorageSync('historyplay', historyplay)
  },
  search_: function (e) {
    var id_ = e.target.dataset.id_
    var q = e.target.dataset.q
    var pages = getCurrentPages()
    var url = '/pages/catalog/catalog?id=' + id_ + '&q=' + q
    if (pages.length == config.maxLayer) {
      wx.redirectTo({
        url: url,
      })
    } else {
      wx.navigateTo({
        url: url
      })
    }
  },
  changeContent: function (e) {
    var target_id = e.target.dataset.item
    var gsc = this.data.work_item
    var show_content = ''
    switch ('' + target_id) {
      case '0':
        show_content = gsc.intro
        break
      case '1':
        show_content = gsc.annotation
        break
      case '2':
        show_content = gsc.translation
        break
      case '3':
        show_content = gsc.appreciation
        break
      case '4':
        show_content = gsc.master_comment
        break
    }
    show_content = show_content.replace(/\　　/g, '\n')
    show_content = show_content.replace(/\n/g, '\n　　')
    show_content = show_content.replace(/\t/g, '\n　　')
    this.setData({
      current_tab: target_id,
      show_content: show_content,
    })
  },
  onPullDownRefresh: function () {
    wx.showNavigationBarLoading()
    var key = 0
    var search_result_ids = wx.getStorageSync('search_result_ids')
    if (search_result_ids) {
      var index = search_result_ids.indexOf(this.data.work_item.id)
      if (index != -1) {
        index += 1
        if (index >= search_result_ids.length) {
          index = 0
        }
        key = search_result_ids[index]
      }
    }
    if (key == 0) {
      key = this.data.work_item.id + 1
      if (key > 8100) {
        key = 1
      }
    }
    this.get_by_id(key, true)
    setTimeout(() => {
      wx.hideNavigationBarLoading()
      wx.stopPullDownRefresh()
    }, 600)
    inner_audio_context.stop()
  },
  onReachBottom: function () {
    return
  },
  onLoad: function (options) {
    if (options.hasOwnProperty('id')) {
      var id_ = options.id
      if (options.hasOwnProperty('from')) {
        this.setData({
          from_page: options.from,
        })
        if (options.from == 'like') {
          wx.setNavigationBarTitle({
            title: '我的收藏'
          })
        }
      }
    } else {
      id_ = parseInt(Math.random() * 8100)
    }
    this.get_by_id(id_)
  },
  playsound: function () {
    if (this.data.work_item) {
      background_audio_manager.title = this.data.work_item.work_title
      background_audio_manager.epname = ' i古诗词 '
      background_audio_manager.singer = this.data.work_item.work_author
      background_audio_manager.coverImgUrl = this.data.poster
      if (this.data.seek2.seek > 0 && this.data.seek2.audio_id == this.data.work_item.audio_id) {
        background_audio_manager.startTime = this.data.seek2.seek
      } else {
        background_audio_manager.startTime = 0
      }
      background_audio_manager.src = this.data.audio_url
      background_audio_manager._audio_id = this.data.work_item.audio_id
      inner_audio_context.pause()
      background_audio_manager.play()
    } else {
      wx.showToast({
        title: '播放失败，请稍后重试~~',
        icon: 'none'
      })
    }
  },
  get_play_mode: function () {
    var that = this
    try {
      var mode = wx.getStorageSync('play_mode')
    } catch (e) {
      mode = 'xunhuan'
    }
    if (!mode) {
      mode = 'xunhuan'
    }
    that.setData({
      mode: mode,
    })
    return mode
  },
  reset_playmode: function () {
    var that = this
    try {
      var old_play_mode = wx.getStorageSync('old_play_mode')
    } catch (e) {
      old_play_mode = 'xunhuan'
    }
    old_play_mode = old_play_mode == 'hc' ? 'xunhuan' : old_play_mode
    wx.setStorageSync('play_mode', old_play_mode)
    that.setData({
      mode: old_play_mode,
    })
  },
  onReady: function (e) {
    var that = this
    inner_audio_context.loop = false
    inner_audio_context.playbackRate = 0.8
    background_audio_manager.onEnded(() => {
      var mode = that.get_play_mode()
      if (mode != 'hc') {
        that.do_operate_play('next', mode)
      } else {
        that.reset_playmode()
      }
    })
    background_audio_manager.onPause(() => {
      that.setData({
        playing: false,
      })
    })
    background_audio_manager.onStop(() => {
      that.setData({
        playing: false,
      })
    })
    background_audio_manager.onError((e) => {
      that.setData({
        playing: false,
      })
      wx.showToast({
        title: '播放失败:(',
        icon: 'none',
      })
    })
    background_audio_manager.onWaiting(() => {
      wx.showLoading({
        title: '音频加载中...',
      })
    })
    background_audio_manager.onCanplay(() => {
      wx.hideLoading()
    })
    background_audio_manager.onPlay(() => {
      inner_audio_context.pause()
      this.setData({
        playing: true,
        playing_audio_id: background_audio_manager._audio_id,
      })
    })
    background_audio_manager.onPrev(() => {
      var mode = that.get_play_mode()
      that.do_operate_play('up', mode)
    })
    background_audio_manager.onNext(() => {
      var mode = that.get_play_mode()
      that.do_operate_play('next', mode)
    })
    background_audio_manager.onTimeUpdate(() => {
      if (that.data.sliding != 1) {
        that.audio_start()
      }
    })
    inner_audio_context.onPlay(() => {
      this.pauseplaybackaudio()
      that.setData({
        speeching: true,
      })
    })
    inner_audio_context.onPause(() => {
      that.setData({
        speeching: false,
        seek3: {
          work_id: inner_audio_context._work_id,
          index: inner_audio_context._start_index,
          seek: inner_audio_context.currentTime,
        }
      })
    })
    inner_audio_context.onStop(() => {
      that.setData({
        speeching: false,
      })
    })
    inner_audio_context.onEnded(() => {
      if (inner_audio_context._start_index == this.data.speeching_urls.length - 1) {
        var url = this.data.speeching_urls[0]
        inner_audio_context._start_index = 0
      } else {
        var url = this.data.speeching_urls[inner_audio_context._start_index + 1]
        inner_audio_context._start_index += 1
      }
      inner_audio_context.src = url
      inner_audio_context.playbackRate = 0.8
      inner_audio_context.play()
    })
    inner_audio_context.onTimeUpdate(() => {
      that.setData({
        speeching: true,
      })
    })
    inner_audio_context.onError(() => {
      that.setData({
        speeching: false,
      })
    })
    var audio_ids = wx.getStorageSync('audio_ids')
    if (!audio_ids) {
      var app = getApp()
      app.get_audio_list()
    }
    var id_ = setInterval(() => {
      if (that.data.work_item) {
        that.setCurrentPlaying()
        clearInterval(id_)
        wx.hideLoading()
      }
    }, 200)
  },
  setCurrentPlaying: function () {
    if (background_audio_manager && !background_audio_manager.paused) {
      if (background_audio_manager.src) {
        this.setData({
          playing: true,
          playing_audio_id: background_audio_manager._audio_id,
        })
        return
      }
    }
    this.setData({
      playing: false,
      playing_audio_id: 0,
    })
  },
  onShow: function () {
    var that = this
    var id_ = setInterval(() => {
      if (that.data.work_item) {
        that.setCurrentPlaying()
        clearInterval(id_)
      }
    }, 200)
  },
  onHide: function () {
    inner_audio_context.stop()
  },
  onUnload: function () {
    inner_audio_context.stop()
  },
  longPress: function () {
    var that = this
    if (parseInt(that.data.work_item.id) <= 1) {
      var id_ = 8101
    } else {
      id_ = that.data.work_item.id
    }
    var key = parseInt(id_) - 1
    var pages = getCurrentPages()
    var url = '/pages/gsc/gsc?id=' + key
    if (pages.length == config.maxLayer) {
      wx.redirectTo({
        url: url,
      })
    } else {
      wx.redirectTo({
        url: url
      })
    }
  },
  onShareAppMessage: function (res) {
    return {
      title: '《' + this.data.work_item.work_title + '》' + this.data.work_item.work_author + '   ' + this.data.work_item.content.substr(0, 24),
      path: '/pages/gsc/gsc?id=' + this.data.work_item.id + '&from=main',
      imageUrl: '/static/share4.jpg',
      success: function (res) {
        util.showSuccess('分享成功')
      },
      fail: function (res) {
        util.showSuccess('取消分享')
      }
    }
  },
  onShareTimeline: function () {
    var prefix = ''
    if (this.data.audio_id > 0) {
      prefix = '【音频】'
    }
    return {
      title: prefix + '《' + this.data.work_item.work_title + '》' + this.data.work_item.work_dynasty + '·' + this.data.work_item.work_author + '   ' + this.data.work_item.content.substr(0, 28),
      query: 'id=' + this.data.work_item.id,
      imageUrl: '/static/share.jpg',
      success: function (res) {
        util.showSuccess('分享成功')
      },
      fail: function (res) {
        util.showSuccess('取消分享')
      }
    }
  },
  longPressBack: function () {
    wx.redirectTo({
      url: '/pages/catalog/catalog',
    })
  },
  audio_start: function () {
    var that = this
    try {
      var time2close = wx.getStorageSync('time2close')
      if (time2close && time2close > 0 && (new Date()).getTime() > time2close * 1000) {
        that.pauseplaybackaudio()
        that.setData({
          time2close: 0,
          close_play_time: 0,
        })
        try {
          var setTimedInt = wx.getStorageSync('setTimedInt')
          if (!setTimedInt) {
            setTimedInt = 0
          }
        } catch (e) {
          setTimedInt = 0
        }
        wx.removeStorageSync('time2close')
        wx.removeStorageSync('close_play_time')
        if (setTimedInt > 0) {
          wx.showToast({
            title: '定时已到~~',
            icon: 'none',
          })
          clearInterval(setTimedInt)
          wx.setStorageSync('setTimedInt', 0)
        }
        return
      }
      if (time2close && (new Date()).getTime() < time2close * 1000) {
        var last_micro_seconds = time2close - (new Date()).getTime() / 1000
        if (last_micro_seconds) {
          that.setData({
            close_play_time: parseInt(last_micro_seconds / 60.0 + 0.5),
          })
        }
      }
    } catch (e) {}
    var current_time = background_audio_manager.currentTime
    var duration = background_audio_manager.duration
    if (that.data.sliding == 2 && that.data.seek2.audio_id == background_audio_manager._audio_id) {
      that.setData({
        sliding: 0,
      })
      var slide_value = that.data.slide_value
      current_time = slide_value / 100.0 * duration
      background_audio_manager.seek(that.data.seek2.seek)
    }
    var current_time_show = (parseInt(current_time / 60) < 10 ? '0' + parseInt(current_time / 60) : parseInt(current_time / 60)) + ':' + ((parseInt(current_time % 60) > 9) ? parseInt(current_time % 60) : '0' + parseInt(current_time % 60))
    var duration_show = (parseInt(duration / 60) < 10 ? '0' + parseInt(duration / 60) : parseInt(duration / 60)) + ':' + ((parseInt(duration % 60) > 9) ? parseInt(duration % 60) : '0' + parseInt(duration % 60))
    that.setData({
      slide_value: parseInt(current_time / duration * 100),
      duration: duration,
      current_time: current_time,
      duration_show: duration_show,
      current_time_show: current_time_show,
      sliding: 0,
      playing_audio_id: background_audio_manager._audio_id,
      playing: true,
    })
  },
  sliderChanging: function (e) {
    var that = this
    if (that.data['duration'] <= 0) {
      that.setData({
        slide_value: 0,
      })
      return
    }
    var v = e.detail.value
    var duration = that.data.duration
    var seek2 = v / 100 * duration
    var current_time_show = (parseInt(seek2 / 60) < 10 ? '0' + parseInt(seek2 / 60) : parseInt(seek2 / 60)) + ':' + ((parseInt(seek2 % 60) > 9) ? parseInt(seek2 % 60) : '0' + parseInt(seek2 % 60))
    that.setData({
      sliding: 1,
      seek2: {
        seek: seek2 >= duration ? 0 : seek2,
        audio_id: background_audio_manager._audio_id,
      },
      current_time_show: current_time_show,
      slide_value: v,
    })
  },
  slider2change: function (e) {
    var that = this
    if (that.data.duration <= 0) {
      that.setData({
        slide_value: 0
      })
      return
    }
    var v = e.detail.value
    var duration = that.data.duration
    var seek2 = v / 100 * duration
    var current_time_show = (parseInt(seek2 / 60) < 10 ? '0' + parseInt(seek2 / 60) : parseInt(seek2 / 60)) + ':' + ((parseInt(seek2 % 60) > 9) ? parseInt(seek2 % 60) : '0' + parseInt(seek2 % 60))
    that.setData({
      seek2: {
        seek: seek2 >= duration ? 0 : seek2,
        audio_id: background_audio_manager._audio_id,
      },
      current_time_show: current_time_show,
      slide_value: v,
      sliding: 2,
    })
  }
})