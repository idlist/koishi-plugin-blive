const { Logger } = require('koishi')
const axios = require('axios').default

const urls = {
  status: 'https://api.live.bilibili.com/room/v1/Room/room_init',
  room: 'https://api.live.bilibili.com/live_user/v1/Master/info',
  user: 'https://api.bilibili.com/x/space/acc/info',
  search: 'https://api.bilibili.com/x/web-interface/search/type',
}

const mockHeader = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36 Edg/92.0.902.78',
}

const logger = new Logger('blive')

class API {
  /**
   * @param {number} id
   * @returns {Promise<import('./index').StatusResult>}
   */
  static async getStatus(id) {
    try {
      const { data } = await axios.get(urls.status, {
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
   * @param {numebr} uid
   * @returns {Promise<import('./index').RoomResult>}
   */
  static async getRoom(uid) {
    try {
      const { data } = await axios.get(urls.room, {
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
   * @returns {Promise<import('./index').UserResult>}
   */
  static async getUser(uid) {
    try {
      const { data } = await axios.get(urls.user, {
        params: { mid: uid },
        header: { ...mockHeader },
      })
      if (data.code) return { error: data.code }

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
   * @returns {Promise<import('./index').SearchResult>}
   */
  static async searchUser(keyword, limit) {
    try {
      const { data } = await axios.get(urls.search, {
        params: {
          keyword,
          search_type: 'bili_user',
        },
      })

      const payload = data.data

      if (payload.numResults == 0) return {
        length: 0,
        list: [],
      }

      /**
       * @type {import('./index').SearchDataItem[]}
       */
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
  static async getImageBuffer(url) {
    try {
      const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
      })

      return data
    } catch (err) {
      logger.warn('Something wrong happen in API - getImageBuffer')
      logger.warn(err)
    }
  }
}

module.exports = API