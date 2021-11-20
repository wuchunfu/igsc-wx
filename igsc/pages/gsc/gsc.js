var config = require('../../config')
var wechat_si = requirePlugin('WechatSI')
var util = require('../../utils/util.js')
const background_audio_manager = wx.getBackgroundAudioManager()
background_audio_manager.referrerPolicy = 'origin'
var win_width = wx.getSystemInfoSync().windowWidth
var inner_audio_context = null
Page({
  data: {
    work_item: null,
    audio_id: 0,
    duration: 0,
    audio_url: '',
    current_work_item: '',
    poster: 'http://m.qpic.cn/psc?/V508X0Kk3euvqv03b43z25G0Qe0TpSaJ/Sc7wZG8Q0BUeMz.O80ebfJMm7LImTWHjPAd8LHFk.wOaXLsE8DUZgFs291qJtJhKtKX5OWYUCr6tczsEJvI6.XJIzdtYlKUPStN72nR081E!/b&bo=wgHCAcIBwgEDJwI!&rf=viewer_4',
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
    folding: false,
    split_words: '',
    search_pattern: 'all',
    annotation_dict: {},
    annotation_reserve_dict: {},
    annotation_detail: {
      show: false,
      top: 0,
      left: 0,
      detail: ''
    },
    fti: false,
  },
  set_timed: function () {
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
          var set_timed_int = wx.getStorageSync('set_timed_int')
          if (!set_timed_int) {
            set_timed_int = 0
          }
        } catch (e) {
          set_timed_int = 0
        }
        if (seconds == -1) {
          wx.removeStorageSync('time2close')
          wx.removeStorageSync('close_play_time')
          if (that.data.time2close && that.data.time2close != 0) {
            if (set_timed_int > 0) {
              clearInterval(set_timed_int)
              wx.setStorageSync('set_timed_int', 0)
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
              title: (that.data.fti ? '播放器將於' : '播放器将于') + util.timetrans(time2close).slice(11) + (that.data.fti ? '關閉' : '关闭'),
              icon: 'none'
            })
            if (set_timed_int > 0) {
              clearInterval(set_timed_int)
              wx.setStorageSync('set_timed_int', 0)
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
                that.pause_play_back_audio()
                that.setData({
                  time2close: 0,
                  close_play_time: 0,
                })
                wx.showToast({
                  title: that.data.fti ? '定時已到~~' : '定时已到~~',
                  icon: 'none'
                })
                wx.removeStorageSync('time2close')
                wx.removeStorageSync('close_play_time')
                clearInterval(timedId)
                wx.setStorageSync('set_timed_int', 0)
              }
            }, 1000)
            wx.setStorageSync('set_timed_int', timedId)
          } else {
            wx.showToast({
              title: that.data.fti ? '請先打開播放器' : '请先打开播放器',
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
    if (this.data.mode == 'xunhuan') {
      this.setData({
        mode: 'one',
      })
      mode = 'one'
      wx.showToast({
        title: this.data.fti ? '單曲循環' : '单曲循环',
        icon: 'none'
      })
      wx.setStorageSync('singleid', {
        'id': that.data.work_item.id,
        'url': that.data.audio_url,
        'title': that.data.work_item.work_title,
        'author': that.data.work_item.work_author,
        'audio_id': that.data.work_item.audio_id,
      })
    } else if (this.data.mode == 'one') {
      this.setData({
        mode: 'shuffle',
      })
      wx.showToast({
        title: this.data.fti ? '隨機播放' : '随机播放',
        icon: 'none'
      })
      mode = 'shuffle'
    } else if (this.data.mode == 'shuffle') {
      this.setData({
        mode: 'xunhuan',
      })
      wx.showToast({
        title: this.data.fti ? '循環播放' : '循环播放',
        icon: 'none'
      })
      mode = 'xunhuan'
    }
    try {
      wx.setStorageSync('play_mode', mode)
    } catch (e) {}
  },
  get_by_id: function (key, play) {
    if (!play) {
      wx.showLoading({
        title: '加载中...'
      })
    }
    var that = this
    var open_id = ''
    try {
      open_id = wx.getStorageSync('user_open_id')
    } catch (e) {}
    if (!open_id) {
      util.user_login()
    }
    if (open_id == '') {
      open_id = 'adcd'
    }
    wx.request({
      url: config.gsc_url + 'index/' + key + '/' + open_id + '?t=' + util.api_version(),
      enableHttp2: true,
      success(result) {
        if (!result || result.data.code != 0) {
          wx.showToast({
            title: that.data.fti ? '網絡異常~~' : '网络异常~~',
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
        show_content = show_content.replace(/　　/g, '')
        show_content = show_content.replace(/\n/g, '\n　　')
        show_content = show_content.replace(/\t/g, '\n　　')
        show_content = show_content.replace(/\r\n/g, '\n')
        show_content = show_content.replace(/\n\n/g, '\n')
        if (work.layout == 'indent') {
          work.content = work.content.replace(/　　/g, '')
          work.content = work.content.replace(/\n/g, '\n　　')
          work.content = work.content.replace(/\t/g, '\n　　')
          work.content = work.content.replace(/\r\n/g, '\n')
          work.content = work.content.replace(/\n\n/g, '\n')
        }
        var split_words_ = that.data.split_words
        if (that.data.fti) {
          show_content = util.traditionalized(show_content)
          split_words_ = util.traditionalized(split_words_)
          work.annotation = util.traditionalized(work.annotation)
          work.content = util.traditionalized(work.content)
          work.foreword = util.traditionalized(work.foreword)
          work.work_title = util.traditionalized(work.work_title)
          work.work_author = util.traditionalized(work.work_author)
          work.work_dynasty = util.traditionalized(work.work_dynasty)
        }
        var split_words = split_words_.split(',').filter((item, pos) => item && item.length > 0)
        var annotation_lines = work.annotation.split('\n')
        var annotation_dict = {}
        var annotation_reserve_dict = {}
        for (var i = 0; i < annotation_lines.length; i++) {
          var tmp = annotation_lines[i].split('：')
          if (tmp.length < 2) {
            continue
          }
          var tmp0 = that.process_annotation(tmp[0])
          annotation_dict[tmp0] = tmp.slice(1).join('：')
          annotation_reserve_dict[tmp.slice(1).join('：')] = tmp[0]
        }
        that.setData({
          annotation_dict: annotation_dict,
          annotation_reserve_dict: annotation_reserve_dict,
        })
        var annotation_words = Object.keys(annotation_dict).filter((item, pos) => item && item.length > 0)
        var words = annotation_words.concat(split_words)
        words = words.filter((item, pos) => words.indexOf(item) === pos)
        var work_content = work.content
        var work_foreword = work.foreword
        var work_title = work.work_title
        if (words.length > 0) {
          if (that.data.search_pattern == 'all' || that.data.search_pattern == 'content') {
            work.split_content = util.hl_content(work_content, words, annotation_words, split_words, true)
            if (work_foreword && work_foreword.length > 0) {
              work.split_foreword = util.hl_content(work_foreword, words, annotation_words, split_words, true)
            }
          } else {
            work.split_content = util.hl_content(work_content, words, annotation_words, split_words, false)
            if (work_foreword && work_foreword.length > 0) {
              work.split_foreword = util.hl_content(work_foreword, words, annotation_words, split_words, false)
            }
          }
          if (that.data.search_pattern == 'all' || that.data.search_pattern == 'title') {
            work.split_title = util.hl_content(work_title, words, annotation_words, split_words, true)
          }
        } else {
          work.split_content = []
          work.split_foreword = []
          work.split_title = []
        }
        var slide_value = 0
        var seek = 0
        if (background_audio_manager._audio_id == work.audio_id) {
          seek = background_audio_manager.currentTime
          slide_value = parseInt(seek / background_audio_manager.duration * 100)
        }
        that.setData({
          work_item: work,
          audio_id: work.audio_id,
          audio_url: config.qaudio_url + work.audio_id + '.m4a',
          current_work_item: work.work_title + '-' + work.work_author,
          current_tab: target_id,
          show_content: show_content,
          duration_show: '',
          current_time_show: '',
          seek2: {
            seek: seek,
            audio_id: work.audio_id,
          },
          slide_value: slide_value,
          annotation_detail: {
            show: false,
            top: 0,
            left: 0,
            detail: ''
          },
        })
        that.get_play_mode()
        var time2close = wx.getStorageSync('time2close')
        that.setData({
          time2close: time2close && time2close > 0 ? time2close : 0,
        })
        if (time2close && time2close > 0) {
          var last_micro_seconds = time2close - (new Date()).getTime() / 1000
          if (last_micro_seconds > 0) {
            that.setData({
              close_play_time: parseInt(last_micro_seconds / 60.0 + 0.5),
            })
          }
        }
        if (!play) {
          wx.hideLoading()
        }
        if (play && work.audio_id > 0) {
          setTimeout(() => {
            that.play_sound()
            if (work.work_title) {
              that.record_play(work.id, work.work_title + '-' + work.work_author)
            }
          }, 500);
        }
      },
      fail: function (res) {
        wx.showToast({
          title: that.data.fti ? '網絡異常~~' : '网络异常~~',
          icon: 'none'
        })
      }
    })
  },
  process_annotation: function (tmp0) {
    // 有些注释有引号
    if (tmp0.indexOf('“') != -1) {
      var tmp1 = tmp0.match(/“(.*)”/)
      if (tmp1 && tmp1.length > 1) {
        tmp0 = tmp1[1]
      }
    }
    if (tmp0.indexOf('"') != -1) {
      var tmp1 = tmp0.match(/"(.*)"/)
      if (tmp1 && tmp1.length > 1) {
        tmp0 = tmp1[1]
      }
    }
    if (tmp0.indexOf('「') != -1) {
      var tmp1 = tmp0.match(/「(.*)」/)
      if (tmp1 && tmp1.length > 1 && tmp1[1].length < 8) {
        tmp0 = tmp1[1]
      }
    }
    // 有些注释有拼音，去掉
    if (tmp0.indexOf('（') != -1) {
      tmp0 = tmp0.replaceAll(/（[a-z A-Z āáǎàōóǒòêēéěèīíǐìūúǔùǖǘǚǜüńňǹɑɡ]*(，.*)?）/g, '')
    }
    if (tmp0.indexOf('(') != -1) {
      tmp0 = tmp0.replaceAll(/\([a-z A-Z āáǎàōóǒòêēéěèīíǐìūúǔùǖǘǚǜüńňǹɑɡ]*(，.*)?\)/g, '')
    }
    return tmp0
  },
  do_operate_play: function (key, mode = 'xunhuan') {
    var that = this
    var audio_ids = wx.getStorageSync('audio_ids')
    if (!audio_ids && mode != 'one') {
      wx.showToast({
        title: '未找到播放列表~~',
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
        var title = 'i古诗词'
        if (that.data.fti) {
          title = 'i古詩詞'
        }
        background_audio_manager.epname = ' ' + title + ' '
        background_audio_manager.startTime = 0
        background_audio_manager._audio_id = play_id_url.audio_id
        background_audio_manager.seek(0)
        if (inner_audio_context) {
          inner_audio_context.pause()
          that.setData({
            speeching: false
          })
        }
        background_audio_manager.play()
        if (play_id_url.title) {
          that.record_play(play_id_url.id, play_id_url.title + '-' + play_id_url.author)
        }
      } catch (e) {
        wx.setStorageSync('singleid', {
          'id': that.data.work_item.id,
          'url': that.data.audio_url,
          'title': that.data.work_item.work_title,
          'author': that.data.work_item.work_author,
          'audio_id': that.data.work_item.audio_id,
        })
        background_audio_manager.src = that.data.audio_url
        background_audio_manager.title = that.data.work_item.work_title
        var title = 'i古诗词'
        if (that.data.fti) {
          title = 'i古詩詞'
        }
        background_audio_manager.epname = ' ' + title + ' '
        background_audio_manager.singer = that.data.work_item.work_author
        background_audio_manager.coverImgUrl = that.data.poster
        background_audio_manager._audio_id = that.data.work_item.audio_id
        if (inner_audio_context) {
          inner_audio_context.pause()
          that.setData({
            speeching: false
          })
        }
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
      that.get_by_id(play_id, true)
    }
  },
  operate_play: function (e) {
    this.do_operate_play(e.currentTarget.dataset.key, this.data.mode)
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
            speeching: true,
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
          title: that.data.fti ? '播放出錯:(' : '播放出错:(',
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
          speeching: true,
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
      title: this.data.fti ? '音頻加載中...' : '音频加载中...',
    })
    return this._do_speak(s, 0, [], work_item.id)
  },
  speak: function (e) {
    var speeching = e.currentTarget.dataset.speeching
    if (speeching) {
      if (inner_audio_context) {
        inner_audio_context.pause()
        this.setData({
          speeching: false
        })
      }
    } else {
      this.pause_play_back_audio()
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
      s.push('\n' + config.qaudio_url + this.data.work_item.audio_id + '.m4a')
    }
    wx.setClipboardData({
      data: s.join('\n'),
    })
  },
  operate_like: function (e) {
    var like = e.currentTarget.dataset.like
    var operate = like == 1 ? 'dislike' : 'like'
    var that = this
    wx.showLoading({
      title: '操作中...',
    })
    wx.getStorage({
      key: 'user_open_id',
      success: function (res) {
        var open_id = res.data
        var gsc_id = that.data.work_item.id
        if (open_id.length == 0 || gsc_id == 0) {
          wx.showToast({
            title: that.data.fti ? '操作失敗，請稍後再試' : '操作失败，请稍后再试',
            icon: 'none'
          })
          return
        }
        wx.request({
          url: config.service.host + '/user/' + operate + '/' + open_id + '/' + gsc_id,
          enableHttp2: true,
          success: function (res) {
            if (!res || res.data.code != 0) {
              wx.showToast({
                title: that.data.fti ? '網絡異常~~' : '网络异常~~',
                icon: 'none'
              })
              return
            }
            if (operate == 'like') {
              wx.getStorage({
                key: 'not_show_like_toast',
                success: function (res) {
                  var toast_num = parseInt(res.data)
                  if (toast_num < 3) {
                    wx.showToast({
                      title: that.data.fti ? '收藏成功，可在首頁下拉查看~' : '收藏成功，可在首页下拉查看~',
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
                    content: that.data.fti ? '可在首頁下拉進入收藏頁面查看' : '可在首页下拉进入收藏页面查看~',
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
            }
            wx.showToast({
              title: res.data.data,
              icon: 'none'
            })
          }
        })
      },
      fail: function () {
        wx.showToast({
          title: this.data.fti ? '請稍後再試' : '请稍后再试',
          icon: 'none'
        })
        util.user_login()
      }
    })
  },
  pause_play_back_audio: function () {
    background_audio_manager.pause()
    var currentTime = 0
    if (background_audio_manager.currentTime && background_audio_manager.currentTime > 1 && background_audio_manager._audio_id == this.data.work_item.audio_id) {
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
  play_back_audio: function (e) {
    var that = this
    if (that.data.playing && that.data.playing_audio_id == that.data.work_item.audio_id) {
      that.pause_play_back_audio()
    } else {
      if (that.data.mode == 'one') {
        wx.setStorageSync('singleid', {
          'id': that.data.work_item.id,
          'url': that.data.audio_url,
          'title': that.data.work_item.work_title,
          'author': that.data.work_item.work_author,
          'audio_id': that.data.work_item.audio_id,
        })
      }
      that.play_sound()
      if (that.data.work_item && that.data.work_item.work_title) {
        that.record_play(that.data.work_item.id, that.data.work_item.work_title + '-' + that.data.work_item.work_author)
      }
    }
  },
  record_play: function (id_, title) {
    setTimeout(() => {
      if (!background_audio_manager.paused) {
        this._record_play(id_, title)
      }
    }, 3000);
  },
  _record_play: function (id_, title) {
    var historyplay = wx.getStorageSync('historyplay')
    if (!historyplay) {
      historyplay = {}
    }
    if (historyplay.hasOwnProperty(id_)) {
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
    var id_ = e.currentTarget.dataset.id_
    var q = e.currentTarget.dataset.q
    var search_pattern = e.currentTarget.dataset.search_pattern
    var pages = getCurrentPages()
    var url = '/pages/catalog/catalog?id=' + id_ + '&q=' + q + '&sp=' + search_pattern
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
  change_content: function (e) {
    var target_id = e.currentTarget.dataset.item
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
    show_content = show_content.replace(/　　/g, '')
    show_content = show_content.replace(/\n/g, '\n　　')
    show_content = show_content.replace(/\t/g, '\n　　')
    show_content = show_content.replace(/\r\n/g, '\n')
    show_content = show_content.replace(/\n\n/g, '\n')
    if (this.data.fti) {
      show_content = util.traditionalized(show_content)
    }
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
      if (key > 297) {
        key = 1
      }
    }
    this.get_by_id(key, false)
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
    this.setData({
      fti: wx.getStorageSync('fti') ? true : false
    })
    if (options && options.hasOwnProperty('id')) {
      var id_ = options.id
      if (options.hasOwnProperty('from')) {
        this.setData({
          from_page: options.from,
        })
        if (options.from == 'like') {
          wx.setNavigationBarTitle({
            title: '我的收藏'
          })
        } else {
          if (this.data.fti) {
            wx.setNavigationBarTitle({
              title: 'i古詩詞'
            })
          } else {
            wx.setNavigationBarTitle({
              title: 'i古诗词'
            })
          }
        }
      }
    } else {
      id_ = parseInt(Math.random() * 297)
      if (id_ <= 0) {
        id_ = 1
      }
    }
    if (options && options.hasOwnProperty('split_words') && options.split_words) {
      this.setData({
        split_words: options.split_words,
      })
    }
    if (options && options.hasOwnProperty('search_pattern') && options.search_pattern) {
      this.setData({
        search_pattern: options.search_pattern,
      })
    }
    this.get_by_id(id_, false)
  },
  play_sound: function () {
    if (this.data.work_item) {
      background_audio_manager.title = this.data.work_item.work_title
      var title = 'i古诗词'
      if (this.data.fti) {
        title = 'i古詩詞'
      }
      background_audio_manager.epname = ' ' + title + ' '
      background_audio_manager.singer = this.data.work_item.work_author
      background_audio_manager.coverImgUrl = this.data.poster
      if (this.data.seek2.seek > 0 && this.data.seek2.audio_id == this.data.work_item.audio_id) {
        background_audio_manager.startTime = this.data.seek2.seek
      } else {
        background_audio_manager.startTime = 0
      }
      background_audio_manager.src = this.data.audio_url
      background_audio_manager._audio_id = this.data.work_item.audio_id
      if (inner_audio_context) {
        inner_audio_context.pause()
        this.setData({
          speeching: false
        })
      }
      background_audio_manager.play()
    } else {
      wx.showToast({
        title: this.data.fti ? '播放失敗，請稍後重試~~' : '播放失败，请稍后重试~~',
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
  listen_play: function (that) {
    background_audio_manager.onEnded(() => {
      that.do_operate_play('next', that.get_play_mode())
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
      if (util.app_is_hide()) {
        that.do_operate_play('next', that.get_play_mode())
      }
    })
    background_audio_manager.onError((e) => {
      that.setData({
        playing: false,
      })
      if (util.app_is_hide()) {
        that.do_operate_play('next', that.get_play_mode())
      }
    })
    background_audio_manager.onWaiting(() => {
      wx.showLoading({
        title: this.data.fti ? '音頻加載中...' : '音频加载中...',
      })
    })
    background_audio_manager.onCanplay(() => {
      wx.hideLoading()
    })
    background_audio_manager.onPlay(() => {
      if (inner_audio_context) {
        inner_audio_context.pause()
        this.setData({
          speeching: false
        })
      }
      this.setData({
        playing: true,
        playing_audio_id: background_audio_manager._audio_id,
      })
    })
    background_audio_manager.onPrev(() => {
      that.do_operate_play('up', that.get_play_mode())
    })
    background_audio_manager.onNext(() => {
      that.do_operate_play('next', that.get_play_mode())
    })
    background_audio_manager.onTimeUpdate(() => {
      if (that.data.sliding != 1) {
        that.audio_start()
      }
    })
  },
  listen_speeching: function (that) {
    inner_audio_context.onPlay(() => {
      that.pause_play_back_audio()
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
      inner_audio_context.destroy()
    })
    inner_audio_context.onEnded(() => {
      if (inner_audio_context._start_index == that.data.speeching_urls.length - 1) {
        var url = that.data.speeching_urls[0]
        inner_audio_context._start_index = 0
      } else {
        var url = that.data.speeching_urls[inner_audio_context._start_index + 1]
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
      inner_audio_context.destroy()
    })
  },
  onReady: function (e) {
    var that = this
    that.listen_play(that)
    var audio_ids = wx.getStorageSync('audio_ids')
    if (!audio_ids) {
      var app = getApp()
      app.get_audio_list()
    }
    var id_ = setInterval(() => {
      if (that.data.work_item) {
        that.set_current_playing()
        clearInterval(id_)
      }
    }, 200)
    inner_audio_context = wx.createInnerAudioContext()
    inner_audio_context._start_index = 0
    inner_audio_context.loop = false
    inner_audio_context.playbackRate = 0.8
    inner_audio_context.referrerPolicy = 'origin'
    that.listen_speeching(that)
  },
  set_current_playing: function () {
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
        that.set_current_playing()
        clearInterval(id_)
      }
    }, 200)
  },
  onHide: function () {
    inner_audio_context.stop()
    this.listen_play(this)
  },
  onUnload: function () {
    inner_audio_context.stop()
    this.listen_play(this)
  },
  long_press: function () {
    var that = this
    if (parseInt(that.data.work_item.id) <= 1) {
      var id_ = 8101
    } else {
      id_ = that.data.work_item.id
    }
    var key = parseInt(id_) - 1
    var pages = getCurrentPages()
    var url = '/pages/gsc/gsc?id=' + key
    if (pages.length == config.max_layer) {
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
    if (this.data.work_item.id % 2 == 0) {
      var share_image = '/static/share4.jpg'
    } else {
      var share_image = '/static/share5.jpg'
    }
    return {
      title: '《' + this.data.work_item.work_title + '》' + this.data.work_item.work_author + '   ' + this.data.work_item.content.substr(0, 24),
      path: '/pages/gsc/gsc?id=' + this.data.work_item.id + '&from=main',
      imageUrl: share_image,
      success: function (res) {
        util.show_success('分享成功')
      },
      fail: function (res) {
        util.show_success('取消分享')
      }
    }
  },
  onShareTimeline: function () {
    var prefix = ''
    if (this.data.audio_id > 0) {
      prefix = this.data.fti ? '音頻' : '【音频】'
    }
    return {
      title: prefix + '《' + this.data.work_item.work_title + '》' + this.data.work_item.work_dynasty + '·' + this.data.work_item.work_author + '   ' + this.data.work_item.content.substr(0, 28),
      query: 'id=' + this.data.work_item.id,
      imageUrl: '/static/share.jpg',
      success: function (res) {
        util.show_success('分享成功')
      },
      fail: function (res) {
        util.show_success('取消分享')
      }
    }
  },
  long_press_back: function () {
    wx.redirectTo({
      url: '/pages/catalog/catalog',
    })
  },
  audio_start: function () {
    var that = this
    try {
      var time2close = wx.getStorageSync('time2close')
      if (time2close && time2close > 0 && (new Date()).getTime() > time2close * 1000) {
        that.pause_play_back_audio()
        that.setData({
          time2close: 0,
          close_play_time: 0,
        })
        try {
          var set_timed_int = wx.getStorageSync('set_timed_int')
          if (!set_timed_int) {
            set_timed_int = 0
          }
        } catch (e) {
          set_timed_int = 0
        }
        wx.removeStorageSync('time2close')
        wx.removeStorageSync('close_play_time')
        if (set_timed_int > 0) {
          wx.showToast({
            title: that.data.fti ? '定時已到' : '定时已到~~',
            icon: 'none',
          })
          clearInterval(set_timed_int)
          wx.setStorageSync('set_timed_int', 0)
        }
        return
      }
      if (time2close && (new Date()).getTime() < time2close * 1000) {
        var last_micro_seconds = time2close - (new Date()).getTime() / 1000
        if (last_micro_seconds > 0) {
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
    })
  },
  slider_changing: function (e) {
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
  },
  onPageScroll: function (e) {
    var that = this
    var query = wx.createSelectorQuery().in(this)
    query.select('#location_id').boundingClientRect()
    query.exec(res => {
      if (res.length > 0 && res[0]) {
        if (res[0].top < -24) {
          wx.setNavigationBarTitle({
            title: that.data.work_item.work_title + '  ' + that.data.work_item.work_author + '  ' + that.data.work_item.content,
          })
        } else {
          if (that.data.from_page != 'like') {
            var title = 'i古诗词'
            if (that.data.fti) {
              title = 'i古詩詞'
            }
            wx.setNavigationBarTitle({
              title: title
            })
          } else {
            wx.setNavigationBarTitle({
              title: '我的收藏'
            })
          }
        }
      }
    })
  },
  do_fold: function (e) {
    this.setData({
      folding: !e.currentTarget.dataset.folding,
    })
  },
  show_anno: function (e) {
    this.setData({
      annotation_detail: {
        show: true,
        left: e.currentTarget.offsetLeft > win_width - (120 / 750 * win_width) ? e.currentTarget.offsetLeft - (120 / 750 * win_width) : e.currentTarget.offsetLeft,
        top: e.currentTarget.offsetTop + (45 / 750 * win_width),
        detail: this.data.annotation_reserve_dict[this.data.annotation_dict[e.currentTarget.dataset.anno]] + '：' + this.data.annotation_dict[e.currentTarget.dataset.anno],
      }
    })
  },
  close_anno: function () {
    this.setData({
      annotation_detail: {
        show: false,
      }
    })
  },
  change_fti: function () {
    var fti = !this.data.fti
    this.setData({
      fti: fti,
    })
    wx.setStorageSync('fti', fti)
    this.get_by_id(this.data.work_item.id)
  }
})