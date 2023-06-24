const { inspect } = require('util')
const { Random, Logger, sleep, h } = require('koishi')
const ApiGenerator = require('./api')
const Monitor = require('./monitor')
const UserIconGetter = require('./get-user-icon')

/**
 * @typedef {import('../types/core').LocalList} LocalList
 * @typedef {import('../types/core').DisplayList} DisplayList
 * @typedef {import('../types/core').DatabaseBlive} DatabaseBlive
 * @typedef {import('../types/core').DatabaseChannel} DatabaseChannel
 */

/**
 * @param  {...string} line
 */
const lines = (...line) => {
  return line.join('')
}

const liverInfo = (username, uid, id) => {
  return lines(
    `${username}（UID ${uid} / `,
    `${id ? `直播间 ${id}` : '直播间未开通'}）`,
  )
}

/**
 * @param {import('koishi').Context} ctx
 * @param {import('@index').Config} config
 */
module.exports = (ctx, config) => {
  const logger = new Logger('blive')
  const api = new ApiGenerator(ctx)
  const iconGetter = new UserIconGetter(ctx)

  /** @type {Monitor} */
  let monitor

  /** @type {LocalList} */
  const localList = {}

  let pollingHandler

  ctx.on('dispose', () => {
    ctx.on('blive/ready', () => {
      clearInterval(pollingHandler)
    })
  })

  ctx.on('ready', async () => {
    // When using database, assignee is get from database
    // whenever the bot is pushing the message.
    // So, there is no need to save assignee in MonitorList.
    if (config.useDatabase) {
      ctx.plugin(require('./database'))

      monitor = new Monitor()

      /** @type {DatabaseChannel[]} */
      const allMonitored = await ctx.database.get(
        'channel',
        {},
        ['platform', 'id', 'guildId', 'blive'],
      )

      for (const { platform, id: channelId, blive, guildId } of allMonitored) {
        if (!blive || Object.keys(blive).length == 0) continue

        for (const [id, { uid }] of Object.entries(blive)) {
          monitor.add({
            platform: platform,
            channelId: channelId,
            guildId: guildId,
            id: id,
            uid: uid,
          })
        }
      }
    }
    // When not using database, assignee is get directly from the config
    // and should be saved in MonitList.
    else {
      monitor = new Monitor()

      /** @type {import('../index').SubscriptionItem[]} */
      const subscriptions = config.subscriptions ?? []

      for (const { platform, assignee, room, channel, guild } of subscriptions) {
        const { id, uid, live } = await api.getStatus(parseInt(room))
        await sleep(50)

        const { username } = await api.getRoom(uid)

        monitor.add({
          platform: platform,
          channelId: channel,
          guildId: guild,
          assignee: assignee,
          id: id,
          uid: uid,
          live: live,
        })

        const cid = `${platform}:${channel}`
        if (!(cid in localList)) localList[cid] = {}
        localList[cid][id] = {
          uid: uid,
          username: username,
        }
        await sleep(50)
      }
    }

    pollingHandler = setInterval(async () => {
      logger.debug('Polling list: ' + inspect(monitor.list, { depth: null, colors: true }))

      for (const [id, status] of Object.entries(monitor.list)) {
        try {
          await sleep(Random.int(10, 50))
          const update = await api.getStatus(id)
          if (update.error) continue

          if (typeof status.live == 'undefined') {
            status.live = update.live
            continue
          }

          if (status.live == update.live) continue

          const user = await api.getUser(status.uid)
          if (user.error) continue

          status.live = update.live
          let userIcon
          if (config.showIcon) userIcon = await iconGetter.get(user.iconUrl)

          // Since this plugin is to support non-database mode,
          // the ctx.broadcast method cannot be used here as it's support to
          // non-database situation is not complete.

          /** @type {DatabaseChannel[]} */
          let broadcastList = []

          if (config.useDatabase) {
            broadcastList = await ctx.database.get('channel', {
              $or: status.channels.map((c) => ({ platform: c.platform, id: c.channelId })),
            }, ['platform', 'id', 'guildId', 'assignee', 'blive'])
          } else {
            broadcastList = status.channels.map((channel) => {
              const { platform, channelId, guildId, assignee } = channel
              return {
                platform: platform,
                id: channelId,
                guildId: guildId,
                assignee: assignee,
              }
            })
          }

          let nameUpdated = false

          for (const b of broadcastList) {
            ctx.bots[`${b.platform}:${b.assignee}`].sendMessage(
              b.id,
              status.live
                ? lines(
                  user.coverUrl ? `${h('image', { url: user.coverUrl })}\n` : '',
                  userIcon ? `${h('image', { url: userIcon })}\n` : '',
                  `${liverInfo(user.username, user.uid, user.id)} 开播了：\n`,
                  `${user.title}\n`,
                  `https://live.bilibili.com/${user.id}`,
                )
                : lines(
                  userIcon ? `${h('image', { url: userIcon })}\n` : '',
                  `${liverInfo(user.username, user.uid, user.id)} 的直播结束了。`,
                ),
              b.guildId,
            )

            if (config.useDatabase) {
              if (b.blive[user.id].username != user.username) {
                nameUpdated = true
                b.blive[user.id].username = user.username
              }
            } else {
              localList[`${b.platform}:${b.id}`][user.id].username = user.username
            }

            await sleep(ctx.root.options.delay.broadcast)
          }

          if (nameUpdated) {
            ctx.database.upsert('channel', broadcastList)
          }
        } catch (error) {
          logger.warn(error)
        }
      }
    }, config.pollInterval)

    ctx.emit('blive/ready')
  })

  ctx.command('blive', 'bilibili 直播订阅')
    .usage('请使用直播间号进行操作。可以通过 search 子命令进行相关的搜索。')

  // List all subscribed rooms.
  ctx.command('blive.list [page]', '查看已订阅的直播')
    .channelFields(['blive'])
    .action(async ({ session }, page) => {
      const cid = session.cid

      try {
        /** @type {DisplayList} */
        let list = []

        if (config.useDatabase) {
          /** @type {DbChannelBlive} */
          const channel = (await ctx.database.get('channel', {
            platform: session.platform, id: session.channelId,
          }, ['blive']))[0]

          if (!channel.blive || !Object.keys(channel.blive).length) return '本群没有订阅直播。'

          list = Object.entries(channel.blive)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        } else {
          if (!(cid in localList)) return '本群没有订阅直播。'

          list = Object.entries(localList[cid])
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        }

        let paging = false, maxPage = 1

        if (list.length > config.pageLimit) {
          paging = true
          maxPage = Math.ceil(list.length / config.pageLimit)
          page = parseInt(page)
          if (isNaN(page) || page < 1) page = 1
          if (page > maxPage) page = maxPage
          list = list.slice((page - 1) * config.pageLimit, page * config.pageLimit)
        }

        return lines(
          paging
            ? `本群已订阅的直播有（第 ${page}/${maxPage} 页）：\n`
            : '本群已订阅的直播有：\n',
          list.map(([id, { uid, username }]) => liverInfo(username, uid, id)).join('\n'),
        )
      } catch (err) {
        logger.warn(err)
        return '发生了未知错误，请稍后尝试。'
      }
    })

  // Some simple search utility.
  // This command does not involve database operations.
  ctx.command('blive.search <keyword>', '查询直播间')
    .option('room', '-r ' + '指定关键字为直播间号（默认）')
    .option('uid', '-u ' + '指定关键字为主播 UID')
    .option('name', '-n ' + '指定关键字为主播用户名')
    .action(async ({ session, options }, keyword) => {
      if (!keyword) return session.execute('help blive.search')

      if (options.room + options.uid + options.name > 1) {
        return '请仅指定一种关键字类型。'
      }

      if (!Object.keys(options).length) options.room = true

      if (options.name) {
        try {
          const search = await api.searchUser(keyword, config.searchPageLimit)
          if (search.error) return '发生了网络错误，请稍后再尝试。'

          if (!search.length) return `没有找到包含关键字 ${keyword} 的用户。`

          return lines(
            `查询 ${keyword} 的结果（共 ${search.length} 条`,
            search.length > config.searchPageLimit
              ? `，显示前 ${config.searchPageLimit} 条）\n`
              : '）\n'
            ,
            search.list
              .map(({ username, uid, id }) => liverInfo(username, uid, id))
              .join('\n'),
          )
        } catch (err) {
          logger.warn(err)
          return '发生了未知错误，请稍后尝试。'
        }
      } else {
        try {
          keyword = parseInt(keyword)
          if (isNaN(keyword)) return '提供的房间号不为数字。'

          if (options.room) {
            const status = await api.getStatus(keyword)
            if (status.error) return `没有找到房间号为 ${keyword} 的用户。`

            keyword = status.uid
          }

          const user = await api.getUser(keyword)
          if (user.error) {
            return lines(
              `查找 UID 为 ${keyword} 的用户时出现错误，`,
              '可能因为该用户不存在或其他未知原因。',
            )
          }

          const userIcon = await iconGetter.get(user.iconUrl)

          return lines(
            '查询结果：\n',
            h('image', { url: userIcon }),
            liverInfo(user.username, user.uid, user.id),
            `\n个性签名：${user.profile}`,
            user.hasRoom
              ? lines(
                '\n',
                user.live ? '直播间正在直播。' : '直播间未开播。',
              )
              : '',
          )
        } catch (err) {
          logger.warn(err)
          return '发生了未知错误，请稍后再尝试。'
        }
      }
    })

  // If is not using database, terminate command registration.
  // Following command is only available when using database.
  if (!config.useDatabase) return

  // Add room to subscription list.
  ctx.command('blive.add <id>', '订阅直播', { authority: 2 })
    .channelFields(['blive'])
    .action(async ({ session }, id) => {
      if (!id) return session.execute('help blive.add')

      try {
        /** @type {DatabaseBlive} */
        const channel = await session.observeChannel(['blive'])
        if (!channel.blive) channel.blive = {}

        if (config.useDatabase &&
          Object.keys(channel.blive).length > config.maxSubsPerChannel) {
          return `最多订阅 ${config.maxSubsPerChannel} 位主播，本群已达到上限。`
        }

        if (id in channel.blive) {
          const { username, uid } = channel.blive[id]
          return `本群已经订阅了主播 ${liverInfo(username, uid, id)}`
        }

        const status = await api.getStatus(id)
        if (status.error == -418) return '发生了网络错误，请稍后尝试。'
        if (status.error) return `查询的直播间 ${id} 不存在。`

        if (status.id in channel.blive) {
          const { username, uid } = channel.blive[status.id]
          return `本群已经订阅了主播 ${liverInfo(username, uid, status.id)}`
        }

        const user = await api.getUser(status.uid)
        if (user.error) return '发生了网络错误，请稍后尝试。'

        channel.blive[user.id] = {
          uid: user.uid,
          username: user.username,
        }

        monitor.add({
          platform: session.platform,
          channelId: session.channelId,
          guildId: session.guildId,
          id: user.id,
          uid: user.uid,
          live: status.live,
        })

        return `成功订阅主播 ${liverInfo(user.username, user.uid, user.id)} ！`
      } catch (err) {
        logger.warn(err)
        return '发生了未知错误，请稍后尝试。'
      }
    })

  // Remove room from subscription list.
  ctx.command('blive.remove <id>', '取消直播订阅', { authority: 2 })
    .channelFields(['blive'])
    .action(async ({ session }, id) => {
      if (!id) return session.execute('help blive.remove')

      try {
        /** @type {DatabaseBlive} */
        const channel = await session.observeChannel(['blive'])
        if (!channel.blive) channel.blive = {}

        if (id in channel.blive) {
          const user = channel.blive[id]
          delete channel.blive[id]
          monitor.remove({
            platform: session.platform,
            channelId: session.channelId,
            guildId: session.guildId,
            id: id,
          })
          return `成功取消订阅主播 ${liverInfo(user.username, user.uid, id)}。`
        }

        const status = await api.getStatus(id)
        if (status.error == -418) return '发生了网络错误，请稍后尝试。'
        if (status.error) return `查询的直播间 ${status.id} 不存在。`

        if (status.id in channel.blive) {
          const user = channel.blive[status.id]
          delete channel.blive[status.id]
          monitor.remove({
            platform: session.platform,
            channelId: session.channelId,
            id: status.id,
          })
          return `成功取消订阅主播 ${liverInfo(user.username, user.uid, status.id)}。`
        }

        return `本群没有订阅直播间 ${id}。`
      } catch (err) {
        logger.warn(err)
        return '发生了未知错误，请稍后尝试。'
      }
    })
}