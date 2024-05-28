import { Context } from 'koishi'

export interface SubscriptionItem {
  /**
   * 用于推送的机器人的平台。QQ 则为 `onebot`。
   */
  platform: string
  /**
   * 用于推送的机器人 ID。
   */
  assignee: string
  /**
   * 主播房间号。
   */
  room: string
  /**
   * 订阅此主播的群号。
   */
  channel: string
  /**
   * 订阅此主播的服务器号。仅开黑啦和 QQ 频道（onebot）需要此项。
   */
  guild?: string
}

export interface Config {
  sessdata: string
  /**
   * 是否使用数据库。
   *
   * 在没有配置数据库的情况下，即使这个选项设置为 `true` 也无法启用数据库。
   *
   * @default true
   */
  useDatabase?: boolean
  /**
   * 访问 B 站 API 的时间间隔（单位毫秒）
   *
   * API 捅得地太频繁会被返回 429 (too many requests)。
   *
   * @default 60000
   */
  pollInterval?: number
  /**
   * 在主播上下播时是否同时发送头像。
   *
   * 使用搜索指令时不受此选项的影响。
   *
   * @default true
   */
  showIcon?: boolean
  /**
   * 分页显示群内订阅主播时，每页的最多显示条数。
   *
   * @default 10
   */
  pageLimit?: number
  /**
   * 在使用用户名搜索主播时的最多显示条数。
   *
   * @default 10
   */
  searchPageLimit?: number
  /**
   * 每个群 / 频道最大订阅数量。仅在使用数据库时有效。
   *
   * @default 10
   */
  maxSubsPerChannel?: number
  /**
   * 订阅列表。仅在不使用数据库时有效。
   *
   * 格式参照 https://github.com/idlist/koishi-plugin-blive 的 README。
   *
   * @default []
   */
  subscriptions: SubscriptionItem[]
}

export declare const apply: (ctx: Context, config: Config) => void