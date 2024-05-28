const { Schema: z } = require('koishi')
const core = require('./src/core')

module.exports.name = 'blive'

module.exports.inject = {
  optional: ['database'],
}

module.exports.schema = z.object({
  sessdata: z.string().required()
    .description('用于访问某些 API 的 Cookie（SESSDATA）项'),
  useDatabase: z.boolean().default(true)
    .description('是否使用数据库。在没有配置数据库的情况下，即使打开这个选项为也无法启用数据库。'),
  pollInterval: z.number().default(60000)
    .description('访问 B 站 API 的时间间隔（单位毫秒）。API 捅得地太频繁会被返回 429 (too many requests)。'),
  showIcon: z.boolean().default(true)
    .description('在主播上下播时是否同时发送头像。使用搜索指令时不受此选项的影响。'),
  pageLimit: z.number().default(10)
    .description('在使用用户名搜索主播时的最多显示条数。'),
  searchPageLimit: z.number().default(10)
    .description('在使用用户名搜索主播时的最多显示条数。'),
  maxSubsPerChannel: z.number().default(10)
    .description('每个群 / 频道最大订阅数量。仅在使用数据库时有效。'),
  subscriptions: z.array(z.object({
    platform: z.string().required()
      .description('用于推送的机器人的平台。QQ 则为 `onebot`。'),
    assignee: z.string().required()
      .description('用于推送的机器人 ID。'),
    room: z.string().required()
      .description('主播房间号。'),
    channel: z.string().required()
      .description('订阅此主播的群号 / 频道号。'),
    guild: z.string()
      .description('订阅此主播的服务器号。仅开黑啦和 QQ 频道（onebot）需要此项。'),
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

  if (ctx.database) ctx.plugin(core, config)
  else ctx.plugin(core, { ...config, useDatabase: false })

  ctx.on('internal/service', (name) => {
    if (name === 'database' && ctx.database && config.useDatabase) {
      ctx.registry.delete(core)
      ctx.plugin(core, config)
    }
    if (name === 'database' && !ctx.database) {
      ctx.registry.delete(core)
      ctx.plugin(core, { ...config, useDatabase: false })
    }
  })
}
