const { t, Schema: S } = require('koishi')
const core = require('./src/core')

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
  'live-end': '{0}{1} 的直播结束了。',

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
  'error-unknown': '发生了未知错误，请稍后再尝试。',
})

module.exports.name = 'blive'

module.exports.schema = S.object({
  useDatabase: S.boolean().default(true)
    .description('是否使用数据库。在没有配置数据库的情况下，即使打开这个选项为也无法启用数据库。'),
  pollInterval: S.number().default(60000)
    .description('访问 B 站 API 的时间间隔（单位毫秒）。API 捅得地太频繁会被返回 429 (too many requests)。'),
  showIcon: S.boolean().default(true)
    .description('在主播上下播时是否同时发送头像。使用搜索指令时不受此选项的影响。'),
  pageLimit: S.number().default(10)
    .description('在使用用户名搜索主播时的最多显示条数。'),
  searchPageLimit: S.number().default(10)
    .description('在使用用户名搜索主播时的最多显示条数。'),
  maxSubsPerChannel: S.number().default(10)
    .description('每个群 / 频道最大订阅数量。仅在使用数据库时有效。'),
  subscriptions: S.array(S.object({
    platform: S.string().required()
      .description('用于推送的机器人的平台。QQ 则为 `onebot`。'),
    assignee: S.string().required()
      .description('用于推送的机器人 ID。'),
    room: S.string().required()
      .description('主播房间号。'),
    channel: S.string().required()
      .description('订阅此主播的群号。'),
  }))
    .description('订阅列表。仅在不使用数据库时有效。格式参照 [README](https://github.com/idlist/koishi-plugin-blive) 。'),
})

/**
 * @param {import('koishi').Context} ctx
 * @param {import('./index').Config} config
 */
module.exports.apply = (ctx, config) => {
  config = {
    useDatabase: true,
    pollInterval: 60 * 1000,
    showIcon: true,
    pageLimit: 10,
    searchPageLimit: 10,
    maxSubsPerChannel: 10,
    ...config,
  }

  ctx = ctx.guild()

  ctx.on('ready', () => {
    ctx.plugin(core, { ...config, useDatabase: false })
  })

  ctx.on('service', (name) => {
    if (name == 'database' && config.useDatabase) {
      ctx.dispose(core)

      if (ctx.database) {
        ctx.plugin(core, config)
      } else {
        ctx.plugin(core, { ...config, useDatabase: false })
      }
    }
  })
}
