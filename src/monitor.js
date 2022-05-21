const { Logger } = require('koishi')

const logger = new Logger('blive')

class Monitor {
  constructor() {
    /** @type {import('./monitor').MonitorList} */
    this.list = {}
  }

  /**
   * @param {import('./monitor').MonitorAddArgs} room
   */
  add(room) {
    if (room.id in this.list) {
      this.list[room.id].channels.push(room)
    } else {
      this.list[room.id] = {
        uid: room.uid,
        live: room.live,
        channels: [room],
      }
    }

    logger.debug(`Monitor: add ${room.id} to ${room.platform}:${room.channelId}.`)
    return this
  }

  /**
   * @param {import('./monitor').MonitorDeleteArgs} room
   */
  remove(room) {
    const id = room.id

    if (id in this.list) {
      this.list[id].channels = this.list[id].channels.filter(item => {
        return (
          item.platform != room.platform &&
          item.channelId != room.channelId &&
          (
            item.guildId &&
            item.guildId != room.guildId
          )
        )
      })
      if (this.list[id].channels.length == 0) delete this.list[id]

      logger.debug(`Monitor: remove ${room.id} from ${room.platform}:${room.channelId}.`)
      return this
    }

    logger.debug(`Monitor: try to remove ${room.id} from ${room.platform}:${room.channelId} but cannot found record.`)
    return this
  }
}

module.exports = Monitor