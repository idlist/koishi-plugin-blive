const { inspect } = require('util')
const { Random, Logger, sleep, s, t } = require('koishi')
const API = require('./api')
const Monitor = require('./monitor')
const getUserIcon = require('./get-user-icon')

const logger = new Logger('blive')

/**
 * @param {import('koishi').Context} ctx
 * @param {import('../index').Config} config
 */
module.exports = (ctx, config) => {
  /**
   * @type {Monitor}
   */
  let monitor

  /**
   * @type {import('./core').LocalList}
   */
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

      /**
       * @type {import('./core').DbChannel[]}
       */
      const allMonitors = await ctx.database.get(
        'channel',
        {},
        ['platform', 'id', 'guildId', 'blive'],
      )

      for (const { platform, id: channelId, blive, guildId } of allMonitors) {
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

      /**
       * @type {import('../index').SubscriptionItem[]}
       */
      const subscriptions = config.subscriptions ?? []

      for (const { platform, assignee, room, channel, guild } of subscriptions) {
        const { id, uid, live } = await API.getStatus(parseInt(room))
        await sleep(50)

        const { username } = await API.getRoom(uid)

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
          const update = await API.getStatus(id)
          if (update.error) continue

          if (typeof status.live == 'undefined') {
            status.live = update.live
            continue
          }

          if (status.live == update.live) continue

          const user = await API.getUser(status.uid)
          if (user.error) continue

          status.live = update.live
          let userIcon
          if (config.showIcon) userIcon = await getUserIcon(user.iconUrl)

          // Since theis plugin is to support non-database mode,
          // the ctx.broadcast method is not used as it's support to
          // non-database situation is not complete.

          /**
           * @type {import('./core').DbChannel[]}
           */
          let broadcastList = []

          if (config.useDatabase) {
            broadcastList = await ctx.database.get('channel', {
              $or: status.channels.map(c => ({ platform: c.platform, id: c.channelId })),
            }, ['platform', 'id', 'guildId', 'assignee', 'blive'])
          } else {
            broadcastList = status.channels.map(channel => {
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
            ctx.bots.get(`${b.platform}:${b.assignee}`).sendMessage(
              b.id,
              status.live
                // {0}{1}\n{2} 开播了：\n{3}\n{4}
                ? t('blive.live-start',
                  user.coverUrl ? s('image', { url: user.coverUrl }) + (userIcon ? '\n' : '') : '',
                  userIcon ? s('image', { url: userIcon }) : '',
                  t('blive.user', user.username, user.uid, user.id),
                  user.title,
                  `https://live.bilibili.com/${user.id}`,
                )
                // {0}{1} 的直播结束了。
                : t('blive.live-end',
                  userIcon ? s('image', { url: userIcon }) + '\n' : '',
                  t('blive.user', user.username, user.uid, user.id),
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

            await sleep(ctx.app.options.delay.broadcast)
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

  ctx.command('blive', t('blive.desc'))
    .usage(t('blive.hint'))

  // List all subscribed rooms.
  ctx.command('blive.list [page]', t('blive.list'))
    .channelFields(['blive'])
    .action(async ({ session }, page) => {
      const cid = session.cid

      try {
        /**
         * @type {import('./core').DisplayList}
         */
        let list = []

        if (config.useDatabase) {
          /**
           * @type {import('./core').DbChannelBlive}
           */
          const channel = (await ctx.database.get('channel', {
            platform: session.platform, id: session.channelId,
          }, ['blive']))[0]

          if (!channel.blive || !Object.keys(channel.blive).length) return t('blive.list-empty')

          list = Object.entries(channel.blive)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        } else {
          if (!(cid in localList)) return t('blive.list-empty')

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

        return (paging ? t('blive.list-prologue-paging', page, maxPage) : t('blive.list-prologue'))
          + list.map(([id, { uid, username }]) => t('blive.user', username, uid, id)).join('\n')
      } catch (err) {
        logger.warn(err)
        return t('blive.error-unknown')
      }
    })

  // Some simple search utility.
  // This command does not involve database operations.
  ctx.command('blive.search <keyword>', t('blive.search'))
    .option('room', '-r ' + t('blive.search-room'))
    .option('uid', '-u ' + t('blive.search-uid'))
    .option('name', '-n ' + t('blive.search-name'))
    .action(async ({ session, options }, keyword) => {
      if (!keyword) return session.execute('help blive.search')

      if (options.room + options.uid + options.name > 1) {
        return t('blive.search-multiple')
      }

      if (!Object.keys(options).length) options.room = true

      if (options.name) {
        try {
          const search = await API.searchUser(keyword, config.searchPageLimit)
          if (search.error) return t('blive.network-error')

          if (!search.length) return t('blive.search-name-no-result', keyword)

          return t('blive.search-result-list',
            keyword,
            search.length,
            search.length > config.searchPageLimit
              ? t('blive.search-result-limit', config.searchPageLimit)
              : '',
            search.list
              .map(user => t('blive.user',
                user.username,
                user.uid,
                user.id ? user.id : t('blive.not-have-room')))
              .join('\n'),
          )
        } catch (err) {
          logger.warn(err)
          return t('blive.error-unknown')
        }
      } else {
        try {
          keyword = parseInt(keyword)
          if (isNaN(keyword)) return t('blive.search-input-invalid')

          if (options.room) {
            const status = await API.getStatus(keyword)
            if (status.error) return t('blive.search-room-not-found', keyword)

            keyword = status.uid
          }

          const user = await API.getUser(keyword)
          if (user.error) return t('blive.search-uid-not-found', keyword)

          const userIcon = await getUserIcon(user.iconUrl)

          return t('blive.search-result-single',
            s('image', { url: userIcon }),
            user.username,
            user.uid,
            user.id ? user.id : t('blive.not-have-room'),
            user.profile,
            user.hasRoom ? '\n' + (user.live ? t('blive.on-live') : t('blive.not-on-live')) : '',
          )
        } catch (err) {
          logger.warn(err)
          return t('blive.error-unknown')
        }
      }
    })

  // If is not using database, interrupt command registration.
  // Following command is only available when using database.
  if (!config.useDatabase) return

  // Add room to subscription list.
  ctx.command('blive.add <id>', t('blive.add'), { authority: 2 })
    .channelFields(['blive'])
    .action(async ({ session }, id) => {
      if (!id) return session.execute('help blive.add')

      try {
        /**
         * @type {import('./core').DbChannelBlive}
         */
        const channel = await session.observeChannel(['blive'])
        if (!channel.blive) channel.blive = {}

        if (config.useDatabase &&
          Object.keys(channel.blive).length > config.maxSubsPerChannel) {
          return t('blive.subs-maxed-out', config.maxSubsPerChannel)
        }

        if (id in channel.blive) {
          const { username, uid } = channel.blive[id]
          return t('blive.add-duplicate', t('blive.user', username, uid, id))
        }

        const status = await API.getStatus(id)
        if (status.error == -418) return t('blive.error-network')
        if (status.error) return t('blive.id-not-found', id)

        if (status.id in channel.blive) {
          const { username, uid } = channel.blive[status.id]
          return t('blive.add-duplicate', t('blive.user', username, uid, status.id))
        }

        const user = await API.getUser(status.uid)
        if (user.error) return t('blive.error-network')

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

        return t('blive.add-success', t('blive.user', user.username, user.uid, user.id))
      } catch (err) {
        logger.warn(err)
        return t('blive.error-unknown')
      }
    })

  // Remove room from subscription list.
  ctx.command('blive.remove <id>', t('blive.remove'), { authority: 2 })
    .channelFields(['blive'])
    .action(async ({ session }, id) => {
      if (!id) return session.execute('help blive.remove')

      try {
        /**
        * @type {import('./core').DbChannelBlive}
        */
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
          return t('blive.remove-success', t('blive.user', user.username, user.uid, id))
        }

        const status = await API.getStatus(id)
        if (status.error == -418) return t('blive.error-network')
        if (status.error) return t('blive.id-not-found')

        if (status.id in channel.blive) {
          const user = channel.blive[status.id]
          delete channel.blive[status.id]
          monitor.remove({
            platform: session.platform,
            channelId: session.channelId,
            id: status.id,
          })
          return t('blive.remove-success', t('blive.user', user.username, user.uid, status.id))
        }

        return t('blive.id-not-subs', id)
      } catch (err) {
        logger.warn(err)
        return t('blive.error-unknown')
      }
    })
}