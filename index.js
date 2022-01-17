const { s, t, sleep, Random, Logger } = require('koishi')
const API = require('./api')
const extendDatabase = require('./database')

t.set('blive', {
  'desc': 'bilibili 直播订阅',
  'hint': '请使用直播间号进行操作。可以通过 search 子命令进行相关的搜索。',

  'user': '{0} (UID {1} / 直播间 {2})',

  'add': '订阅直播',
  'add-success': '成功订阅主播 {0} ！',
  'add-duplicate': '本群已经订阅了主播 {0}。',
  'subs-maxed-out': '最多订阅 {0} 位主播，本群已达到上限。',
  'id-not-found': '查询的直播间 {0} 不存在。',

  'remove': '取消直播订阅',
  'remove-success': '成功取消订阅主播 {0}。',
  'id-not-subs': '本群没有订阅直播间 {0}。',

  'list': '查看已订阅的直播',
  'list-prologue': '本群已订阅的直播有：\n',
  'list-prologue-paging': '本群已订阅的直播有（第 {0}/{1} 页）：\n',
  'list-empty': '本群没有订阅直播。',

  'live-start': '{0}{1}\n{2} 开播了！\n标题：{3}\n{4}',
  'live-end': '{0}\n{1} 的直播结束了。',

  'search': '查询直播间',
  'search-room': '指定关键字为直播间号（默认）',
  'search-uid': '指定关键字为主播 UID',
  'search-name': '指定关键字为主播用户名',
  'search-multiple': '请仅指定一种关键字类型。',
  'search-input-invalid': '查询所使用的关键字无效。',
  'search-uid-not-found': '没有找到 UID 为 {0} 的用户。',
  'search-room-not-found': '没有找到房间号为 {0} 的用户。',
  'search-name-no-result': '没有找到包含关键字 {0} 的用户。',
  'search-result-single': '查询结果：\n{0}\n{1} （UID {2} / 直播间 {3}）\n个性签名：{4}{5}',
  'search-result-list': '查询 {0} 的结果（共 {1} 条{2}）：\n{3}',
  'search-result-limit': '，显示前 {0} 条',

  'not-have-room': '未开通',
  'on-live': '直播间正在直播。',
  'not-on-live': '直播间未开播。',

  'error-network': '发生了网络错误，请稍后再尝试。',
  'error-unknown': '发生了未知错误，请稍后再尝试。'
})

const logger = new Logger('blive')

/**
 * @param {string} module
 * @returns {boolean}
 */
const hasModule = module => {
  try {
    require(module)
    return true
  } catch {
    return false
  }
}

/**
 * @type {'canvas' | 'skia-canvas' | 'sharp' | 'none'}
 */
let imageProcessor = 'none'
if (hasModule('sharp')) imageProcessor = 'sharp'
if (hasModule('canvas')) imageProcessor = 'canvas'
if (hasModule('skia-canvas')) imageProcessor = 'skia-canvas'

const iconSize = 128

/**
 * @param {string} url
 * @returns {Promise<string>} Resized base64 image or https link
 */
const getUserIcon = async (url) => {
  let userIcon

  if (imageProcessor == 'canvas') {
    const { loadImage, createCanvas } = require('canvas')

    const userIconImage = await loadImage(url)
    const canvas = createCanvas(iconSize, iconSize)
    const c = canvas.getContext('2d')
    c.drawImage(userIconImage, 0, 0, iconSize, iconSize)

    userIcon = 'base64://' + canvas.toBuffer('image/png').toString('base64')
  } else if (imageProcessor == 'skia-canvas') {
    const { Canvas, loadImage } = require('skia-canvas')

    const userIconImage = await loadImage(url)
    const canvas = new Canvas(iconSize, iconSize)
    const c = canvas.getContext('2d')
    c.drawImage(userIconImage, 0, 0, iconSize, iconSize)

    userIcon = 'base64://' + canvas.toBufferSync('png').toString('base64')
  } else if (imageProcessor == 'sharp') {
    const sharp = require('sharp')

    const userIconBuffer = await API.getImageBuffer(url)

    userIcon = new sharp(userIconBuffer)
    userIcon.resize({ width: iconSize, height: iconSize })
    userIcon = 'base64://' + userIcon.toBuffer().toString('base64')
  } else {
    userIcon = url
  }

  return userIcon
}

/**
 * @type {import('./index').MonitList}
 */
class MonitList {
  /**
   * @param {import('./index').MonitItemChannel} target
   * @param {number | string} id room ID
   * @param {string} uid user ID
   * @param {boolean | undefined} live live status
   */
  add(target, id, uid, live) {
    if (id in this) {
      this[id].channels.push(target)
    } else {
      this[id] = {
        uid,
        live,
        channels: [target]
      }
    }
    return this
  }

  /**
   * @param {import('./index').MonitItemChannel} target
   * @param {number | string} id room ID
   */
  remove(target, id) {
    if (id in this) {
      this[id].channels = this[id].channels.filter(item => {
        return (
          item.platform != target.platform &&
          item.channelId != target.channelId
        )
      })
      if (this[id].channels.length == 0) delete this[id]

      return this
    }
    return this
  }
}

/**
 * @param {import('koishi').Context} ctx
 * @param {import('./index').ConfigObject} config
 */
const core = (ctx, config) => {
  /**
   * @type {import('./index').MonitList}
   */
  let monits

  /**
   * @type {import('./index').LocalList}
   */
  const localList = {}

  let pollingHandler

  const initCore = async () => {
    // When using database, assignee is get from database
    // whenever the bot is pushing the message.
    // So, there is no need to save assignee in MonitList.
    if (config.useDatabase) {
      extendDatabase(ctx)
      monits = new MonitList()

      /**
       * @type {import('./index').DatabaseChannel[]}
       */
      const allMonits = await ctx.database.get(
        'channel',
        {},
        ['platform', 'id', 'blive']
      )

      for (const { platform, id: channelId, blive } of allMonits) {
        if (!blive || Object.keys(blive).length == 0) continue

        for (const [id, { uid }] of Object.entries(blive)) {
          monits.add({
            platform: platform,
            channelId: channelId
          }, id, uid)
        }
      }
    }
    // When not using database, assignee is get directly from the config
    // and should be saved in MonitList.
    else {
      ctx.command('blive.add').dispose()
      ctx.command('blive.remove').dispose()

      monits = new MonitList()

      /**
       * @type {import('./index').Subscriptions}
       */
      const subscriptions = config.subscriptions ?? {}

      for (const [aid, rooms] of Object.entries(subscriptions)) {
        const [platform, assignee] = aid.split(':')

        for (const [rawId, channels] of Object.entries(rooms)) {
          const { id, uid, live } = await API.getStatus(parseInt(rawId))
          await sleep(50)

          const { username } = await API.getRoom(uid)

          for (const channelId of channels) {
            monits.add({
              platform: platform,
              channelId: channelId,
              assignee: assignee
            }, id, uid, live)

            const cid = `${platform}:${channelId}`
            if (!(cid in localList)) localList[cid] = {}
            localList[cid][id] = {
              uid: uid,
              username: username
            }
          }
          await sleep(50)
        }
      }
    }

    pollingHandler = setInterval(async () => {
      for (const [id, status] of Object.entries(monits)) {
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
          const userIcon = await getUserIcon(user.iconUrl)

          // Since theis plugin is to support non-database mode,
          // the ctx.broadcast method is not used as it's support to
          // non-database situation is not complete.

          let broadcastList = []

          if (config.useDatabase) {
            broadcastList = await ctx.database.get('channel', {
              $or: [
                ...status.channels.map(channelInfo => {
                  const { platform, channelId } = channelInfo
                  return { platform: platform, id: channelId }
                })
              ]
            }, ['platform', 'id', 'assignee'])
          } else {
            broadcastList = status.channels.map(channel => {
              const { platform, channelId, assignee } = channel
              return { platform: platform, id: channelId, assignee: assignee }
            })
          }

          for (const b of broadcastList) {
            ctx.bots.get(`${b.platform}:${b.assignee}`).sendMessage(b.id,
              status.live
                // {0}{1}\n{2} 开播了：\n{3}\n{4}
                ? t('blive.live-start',
                  user.coverUrl ? s('image', { url: user.coverUrl }) + '\n' : '',
                  s('image', { url: userIcon }),
                  t('blive.user', user.username, user.uid, user.id),
                  user.title,
                  user.url)
                // {0}\n{1} 的直播结束了。
                : t('blive.live-end',
                  s('image', { url: userIcon }),
                  t('blive.user', user.username, user.uid, user.id))
            )
            await sleep(ctx.app.options.delay.broadcast)
          }
        } catch (err) {
          logger.warn(err)
        }
      }
    }, config.pollInterval)
  }

  ctx.command('blive', t('blive.desc'))
    .usage(t('blive.hint'))

  // Add room to subscription list.
  // This command is only available when using database.
  ctx.command('blive.add <id>', t('blive.add'), { authority: 2 })
    .channelFields(['blive'])
    .action(async ({ session }, id) => {
      if (!id) return session.execute('help blive.add')

      try {
        /**
         * @type {import('./index').DatabaseChannelBlive}
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
          username: user.username
        }

        monits.add({
          platform: session.platform,
          channelId: session.channelId
        }, user.id, user.uid, status.live)

        return t('blive.add-success', t('blive.user', user.username, user.uid, user.id))
      } catch (err) {
        logger.warn(err)
        return t('blive.error-unknown')
      }
    })

  // Remove room from subscription list.
  // This command is only available when using database.
  ctx.command('blive.remove <id>', t('blive.remove'), { authority: 2 })
    .channelFields(['blive'])
    .action(async ({ session }, id) => {
      if (!id) return session.execute('help blive.remove')

      try {
        /**
        * @type {import('./index').DatabaseChannelBlive}
        */
        const channel = await session.observeChannel(['blive'])
        if (!channel.blive) channel.blive = {}

        if (id in channel.blive) {
          const user = channel.blive[id]
          delete channel.blive[id]
          monits.remove({ platform: session.platform, channelId: session.channelId }, id)
          return t('blive.remove-success', t('blive.user', user.username, user.uid, id))
        }

        const status = await API.getStatus(id)
        if (status.error == -418) return t('blive.error-network')
        if (status.error) return t('blive.id-not-found')

        if (status.id in channel.blive) {
          const user = channel.blive[status.id]
          delete channel.blive[status.id]
          monits.remove({ platform: session.platform, channelId: session.channelId }, status.id)
          return t('blive.remove-success', t('blive.user', user.username, user.uid, status.id))
        }

        return t('blive.id-not-subs', id)
      } catch (err) {
        logger.warn(err)
        return t('blive.error-unknown')
      }
    })

  // List all subscribed rooms.
  ctx.command('blive.list [page]', t('blive.list'))
    .channelFields(['blive'])
    .action(async ({ session }, page) => {
      const cid = session.cid

      try {
        /**
         * @type {import('./index').DisplayList}
         */
        let list = []

        if (config.useDatabase) {
          /**
           * @type {import('./index').DatabaseChannelBlive}
           */
          const channel = (await ctx.database.get('channel', {
            platform: session.platform, id: session.channelId
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
              .join('\n')
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
            user.hasRoom ? '\n' + (user.live ? t('blive.on-live') : t('blive.not-on-live')) : ''
          )
        } catch (err) {
          logger.warn(err)
          return t('blive.error-unknown')
        }
      }
    })

  ctx.on('ready', () => { initCore() })

  ctx.on('dispose', () => {
    clearInterval(pollingHandler)
  })
}

module.exports.name = 'blive'

/**
 * @param {import('koishi').Context} ctx
 * @param {import('./index').ConfigObject} config
 */
module.exports.apply = (ctx, config) => {
  config = {
    useDatabase: true,
    maxSubsPerChannel: 10,
    pageLimit: 10,
    searchPageLimit: 10,
    pollInterval: 60 * 1000,
    ...config
  }

  ctx = ctx.guild()

  ctx.on('ready', () => {
    ctx.plugin(core, { ...config, useDatabase: false })
  })

  ctx.on('service', async (name) => {
    if (name == 'database' && config.useDatabase) {
      await ctx.dispose(core)

      if (ctx.database) {
        ctx.plugin(core, config)
      } else {
        ctx.plugin(core, { ...config, useDatabase: false })
      }
    }
  })
}
