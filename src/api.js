const { Logger } = require('koishi')
const { extractWbiKey, encodeWbi } = require('./bili-wbi')

/**
 * @template T
 * @typedef {import('../types/api').Result<T>} Result
 */

/**
 * @typedef {import('../types/api').StatusData} StatusData
 * @typedef {import('../types/api').RoomData} RoomData
 * @typedef {import('../types/api').UserData} UserData
 * @typedef {import('../types/api').SearchData} SearchData
 */

const mockHeader = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.37',
}

const logger = new Logger('blive')

class ApiSetup {
  /**
   * @param {import('koishi').Context} ctx
   * @param {import('../index').Config} config
   */
  constructor(ctx, config = {}) {
    /** @type {import('koishi').Quester} */
    this.http = ctx.http
    this.sessdata = config?.sessdata

    this.wbiKey = ''
    this.wbiKeyFailed = true
  }

  async tryRefreshWbiKey() {
    if (!this.wbiKey || this.wbiKeyFailed) {
      const data = await this.http.get('https://api.bilibili.com/x/web-interface/nav')
      this.wbiKey = extractWbiKey(data)
    }
  }

  /**
   * @param {number} id
   * @returns {Promise<Result<StatusData>>}
   */
  async getStatus(id) {
    try {
      const data = await this.http.get('https://api.live.bilibili.com/room/v1/Room/room_init', {
        params: { id },
        referer: 'https://space.bilibili.com',
        header: { ...mockHeader },
      })
      if (data.code) return { error: data.code }

      const payload = data.data
      return {
        id: payload.room_id,
        idShort: payload.short_id,
        uid: payload.uid,
        live: payload.live_status == 1 ? true : false,
      }
    } catch (err) {
      logger.warn('Something wrong happen in API - getStatus')
      logger.warn(err)
      return { error: -418 }
    }
  }

  /**
   * @param {number} uid
   * @returns {Promise<Result<RoomData>>}
   */
  async getRoom(uid) {
    try {
      const data = await this.http.get('https://api.live.bilibili.com/live_user/v1/Master/info', {
        params: { uid },
        header: { ...mockHeader },
      })

      if (data.code) return { error: data.code }

      const payload = data.data
      return {
        uid: payload.info.uid,
        username: payload.info.uname,
        iconUrl: payload.info.face,
        news: payload.room_news.content,
      }
    } catch (err) {
      logger.warn('Something wrong happen in API - getRoom')
      logger.warn(err)
      return { error: -418 }
    }
  }

  /**
   * @param {number} uid
   * @returns {Promise<Result<UserData>>}
   */
  async getUser(uid) {
    try {
      await this.tryRefreshWbiKey()

      const params = { mid: uid }
      const encoded = encodeWbi(params, this.wbiKey)

      const data = await this.http.get(`https://api.bilibili.com/x/space/wbi/acc/info?${encoded}`, {
        headers: {
          ...mockHeader,
          referer: 'https://space.bilibili.com',
          cookie: `SESSDATA=${this.sessdata};buvid3=114514`,
        },
      })

      if (data.code) {
        logger.warn('Bilibili seems to reject the request:')
        logger.warn(data)
        this.wbiKeyFailed = true
        return { error: data.code }
      }
      const payload = data.data
      const room = payload.live_room

      return {
        uid: payload.mid,
        username: payload.name,
        iconUrl: payload.face,
        profile: payload.sign,
        id: room?.roomid,
        url: room?.url,
        title: room?.title,
        coverUrl: room?.cover,
        hasRoom: room ? true : false,
        live: room ? (room.liveStatus ? true : false) : false,
      }
    } catch (err) {
      logger.warn('Something wrong happen in API - getUser')
      logger.warn(err)
      return { error: -418 }
    }
  }

  /**
   * @param {string} keyword
   * @param {number} limit
   * @returns {Promise<Result<SearchData>>}
   */
  async searchUser(keyword, limit) {
    try {
      const cookiesProbe = await this.http('https://bilibili.com', {
        method: 'get',
        header: { ...mockHeader },
        withCredentials: true,
      })
      const setCookie = cookiesProbe.headers.get('set-cookie')

      const data = await this.http.get('https://api.bilibili.com/x/web-interface/search/type', {
        params: {
          keyword,
          search_type: 'bili_user',
        },
        headers: {
          ...mockHeader,
          cookie: setCookie,
        },
      })

      const payload = data.data

      if (payload.numResults == 0) return {
        length: 0,
        list: [],
      }

      const result = []
      for (let i = 0; i < Math.min(limit, payload.result.length); i++) {
        const item = payload.result[i]
        result.push({
          uid: item.mid,
          username: item.uname,
          id: item.room_id,
        })
      }

      return {
        length: payload.numResults,
        list: result,
      }
    } catch (err) {
      logger.warn('Something wrong happen in API - searchUser')
      logger.warn(err)
      return { error: -418 }
    }
  }

  /**
   * @param {string} url
   * @returns {Promise<ArrayBuffer>}
   */
  async getImageBuffer(url) {
    try {
      const data = await this.http.get(url, {
        responseType: 'arraybuffer',
      })

      return data
    } catch (err) {
      logger.warn('Something wrong happen in API - getImageBuffer')
      logger.warn(err)
    }
  }
}

module.exports = ApiSetup