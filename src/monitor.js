/**
 * @type {import('./monitor').Monitor}
 */
class Monitor {
  constructor() {
    this.list = {}
  }

  /**
   * @param {import('./monitor').MonitorAddArgs} room
   */
  add(room) {
    if (room.id in this) {
      this.list[room.id].channels.push(room)
    } else {
      this.list[room.id] = {
        uid: room.uid,
        live: room.live,
        channels: [room],
      }
    }
    return this
  }

  /**
   * @param {import('./monitor').MonitorDeleteArgs} room
   */
  remove(room) {
    const id = room.id

    if (id in this) {
      this.list[id].channels = this.list[id].channels.filter(item => {
        return (
          item.platform != room.platform &&
          item.channelId != room.channelId
        )
      })
      if (this.list[id].channels.length == 0) delete this.list[id]

      return this
    }
    return this
  }
}

module.exports = Monitor