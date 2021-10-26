const { s, t, sleep, Random } = require('koishi')

const API = require('./api')
require('./database')

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
 * @type {'canvas' | 'sharp' | 'none'}
 */
let imageProcessor = 'none'
if (hasModule('sharp')) imageProcessor = 'sharp'
if (hasModule('canvas')) imageProcessor = 'canvas'

const iconSize = 128

const getUserIcon = async (url) => {
  let userIcon

  if (imageProcessor == 'canvas') {
    const { loadImage, createCanvas } = require('canvas')

    const userIconImage = await loadImage(url)
    const canvas = createCanvas(iconSize, iconSize)
    const c = canvas.getContext('2d')
    c.drawImage(userIconImage, 0, 0, iconSize, iconSize)

    userIcon = 'base64://' + canvas.toBuffer('image/png').toString('base64')
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
   * @param {import('./index').MonitChannelItem} channelObj
   * @param {number | string} id
   * @param {string} uid
   * @param {boolean | undefined} live
   */
  add(channelObj, id, uid, live) {
    if (id in this) {
      this[id].channel.push(channelObj)
    } else {
      this[id] = {
        uid,
        live,
        channel: [channelObj]
      }
    }
    return this
  }
  /**
   * @param {import('./index').MonitChannelItem} channelObj
   * @param {number | string} id
   */
  remove(channelObj, id) {
    if (id in this) {
      this[id].channel = this[id].channel.filter(item => {
        return item.platform != channelObj.platform && item.channelId != channelObj.channelId
      })
      if (this[id].channel.length == 0) delete this[id]

      return this
    }
    return this
  }
}

module.exports.name = 'blive'

/**
 * @param {import('koishi').Context} ctx
 * @param {import('./index').ConfigObject} config
 */
module.exports.apply = (ctx, config) => {
  config = {
    useDatabase: true,
    asignees: [0],
    maxSubsPerChannel: 10,
    pageLimit: 10,
    searchPageLimit: 10,
    pollInterval: 60 * 1000,
    ...config
  }

  if (!Array.isArray(config.asignees)) {
    if (typeof config.asignees == 'number') {
      config.asignees = config.asignees.toString()
    }
    config.asignees = [config.asignees]
  }

  ctx = ctx.select('database').group()
  const logger = ctx.logger('blive')

  /**
   * @type {import('./index').MonitList}
   */
  const monits = new MonitList()

  /**
   * @type {import('./index').LocalList}
   */
  const localList = {}

  let pollingHandler

  ctx.on('connect', async () => {
    if (!ctx.database) {
      config.useDatabase = false
    }

    if (config.useDatabase) {
      /**
       * @type {import('./index').DatabaseChannel[]}
       */
      const allMonits = await ctx.database.get('channel', {}, ['id', 'blive'])

      for (const { id: cid, blive } of allMonits) {
        if (!blive || Object.keys(blive).length == 0) continue

        for (const [id, { uid }] of Object.entries(blive)) {
          const [platform, channelId] = cid.split(':')
          monits.add({ platform, channelId }, id, uid)
        }
      }
    } else {
      ctx.command('blive.add').dispose()
      ctx.command('blive.remove').dispose()

      const subscriptions = config.subscriptions ?? {}

      for (const [rawId, channels] of Object.entries(subscriptions)) {
        const { id, uid, live } = await API.getStatus(parseInt(rawId))
        await sleep(Random.int(10, 50))

        const { username } = await API.getRoom(uid)

        for (const cid of channels) {
          const [ platform, channelId ] = cid.split(':')
          monits.add({ platform, channelId }, id, uid, live)

          if (!(cid in localList)) localList[cid] = {}
          localList[cid][id] = {
            uid: uid,
            username: username
          }
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

          for (const asignee of config.asignees) {
            const bot = ctx.bots[asignee]
            const availableChannel = status.channel
              .filter(item => item.platform == bot.platform)
              .map(item => item.channelId)

            bot.broadcast(availableChannel,
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
                  t('blive.user', user.username, user.uid, user.id)))
          }
        } catch (err) {
          logger.warn(err)
        }
      }
    }, config.pollInterval)
  })

  ctx.on('disconnect', () => {
    clearInterval(pollingHandler)
  })

  ctx.command('blive', t('blive.desc'))
    .usage(t('blive.hint'))

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
          monits.remove({
            platform: session.platform,
            channelId: session.channelId
          }, id)
          return t('blive.remove-success', t('blive.user', user.username, user.uid, id))
        }

        const status = await API.getStatus(id)
        if (status.error == -418) return t('blive.error-network')
        if (status.error) return t('blive.id-not-found')

        if (status.id in channel.blive) {
          const user = channel.blive[status.id]
          delete channel.blive[status.id]
          monits.remove({
            platform: session.platform,
            channelId: session.channelId
          }, status.id)
          return t('blive.remove-success', t('blive.user', user.username, user.uid, status.id))
        }

        return t('blive.id-not-subs', id)
      } catch (err) {
        logger.warn(err)
        return t('blive.error-unknown')
      }
    })

  ctx.command('blive.list [page]', t('blive.list'))
    .channelFields(['blive'])
    .action(async ({ session }, page) => {
      const cid = `${session.platform}:${session.channelId}`

      try {
        /**
         * @type {import('./index').DisplayList}
         */
        let list = []

        if (config.useDatabase) {
          /**
           * @type {import('./index').DatabaseChannelBlive}
           */
          const channel = (await session.database.get('channel', {
            id: cid
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
              .join('\n'))
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
            user.hasRoom ? '\n' + (user.live ? t('blive.on-live') : t('blive.not-on-live')) : '')
        } catch (err) {
          logger.warn(err)
          return t('blive.error-unknown')
        }
      }
    })
}