const { Logger } = require('koishi')

const urls = {
  home: 'https://bilibili.com',
  status: 'https://api.live.bilibili.com/room/v1/Room/room_init',
  room: 'https://api.live.bilibili.com/live_user/v1/Master/info',
  user: 'https://api.bilibili.com/x/space/acc/info',
  search: 'https://api.bilibili.com/x/web-interface/search/type',
}

const mockHeader = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36 Edg/92.0.902.78',
}

const logger = new Logger('blive')

class APIGenerator {
  /**
   * @param {import('koishi').Context} ctx
   */
  constructor(ctx, sessdata) {
    /** @type {import('koishi').Quester} */
    this.http = ctx.http
    this.sessdata = sessdata
  }
  /**
   * @param {number} id
   * @returns {Promise<import('./api').StatusResult>}
   */
  async getStatus(id) {
    try {
      const data = await this.http.get(urls.status, {
        params: { id },
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
   * @returns {Promise<import('./api').RoomResult>}
   */
  async getRoom(uid) {
    try {
      const data = await this.http.get(urls.room, {
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
   * @returns {Promise<import('./api').UserResult>}
   */
  async getUser(uid) {
    try {
      const data = await this.http.get(urls.user, {
        params: { mid: uid },
        headers: {
          ...mockHeader,
          cookie: `SESSDATA=${this.sessdata}`,
        },
      })

      if (data.code) {
        logger.warn('Bilibili seems to reject the request:')
        logger.warn(data)
        return { error: data.code }
      }
      const payload = data.data

      return {
        uid: payload.mid,
        username: payload.name,
        iconUrl: payload.face,
        profile: payload.sign,
        id: payload.live_room.roomid,
        url: payload.live_room.url,
        title: payload.live_room.title,
        coverUrl: payload.live_room.cover,
        hasRoom: payload.live_room.roomStatus ? true : false,
        live: payload.live_room.liveStatus ? true : false,
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
   * @returns {Promise<import('./api').SearchResult>}
   */
  async searchUser(keyword, limit) {
    try {
      const cookiesProbe = await this.http.axios(urls.home, {
        method: 'get',
        header: { ...mockHeader },
        withCredentials: true,
      })

      const cookies = cookiesProbe.headers['set-cookie']
      const setCookies = cookies.map(c => c.split(';')[0]).join('; ')

      const data = await this.http.get(urls.search, {
        params: {
          keyword,
          search_type: 'bili_user',
        },
        headers: {
          ...mockHeader,
          cookie: setCookies,
        },
      })

      const payload = data.data

      if (payload.numResults == 0) return {
        length: 0,
        list: [],
      }

      /** @type {import('./api').SearchDataItem[]} */
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

module.exports = APIGenerator