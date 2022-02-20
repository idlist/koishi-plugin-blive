/**
 * @type {import('../index').Monitor}
 */
class Monitor {
  /**
   * @param {import('../index').MonitorAddArguments} room
   */
  add(room) {
    if (room.id in this) {
      this[room.id].channels.push(room)
    } else {
      this[room.id] = {
        uid: room.uid,
        live: room.live,
        channels: [room],
      }
    }
    return this
  }

  /**
   * @param {import('../index').MonitorDeleteArguments} room
   */
  remove(room) {
    const id = room.id

    if (id in this) {
      this[id].channels = this[id].channels.filter(item => {
        return (
          item.platform != room.platform &&
          item.channelId != room.channelId
        )
      })
      if (this[id].channels.length == 0) delete this[id]

      return this
    }
    return this
  }
}

module.exports = Monitor