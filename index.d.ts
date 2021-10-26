import { Context } from 'koishi'

interface ErrorCode {
  error?: number
}

interface StatusData {
  id: number
  idShort: number
  uid: number
  live: boolean
}

interface RoomData {
  uid: number
  username: string
  iconUrl: string
  news: string
}

interface UserData {
  uid: number
  username: string
  iconUrl: string
  profile: string
  id: number
  url: string
  title: string
  coverUrl: string
  hasRoom: boolean
  live: boolean
}

export interface SearchDataItem {
  uid: number
  username: string
  id: number
}

export interface SearchData {
  length: number
  list: SearchDataItem[]
}

export type StatusResult = ErrorCode & StatusData
export type RoomResult = ErrorCode & RoomData
export type UserResult = ErrorCode & UserData
export type SearchResult = ErrorCode & SearchData

export interface MonitChannelItem {
  platform: string
  channelId: string
}

export interface MonitItem {
  uid: string,
  live: boolean | undefined
  channel: MonitChannelItem[]
}

export type MonitList = Record<string, MonitItem>

interface BliverDetail {
  uid: number
  username: string
}

type Blive = Record<string, BliverDetail>

export interface DatabaseChannelBlive {
  blive: Blive
}

export interface DatabaseChannel extends DatabaseChannelBlive {
  id: string
}

export type LocalList = Record<string, Blive>

export type DisplayList = [string, BliverDetail][]

export type Subscriptions = Record<string, string[]>

export interface ConfigObject {
  /**
   * 是否使用数据库。
   *
   * 在没有配置数据库的情况下，即使这个选项设置为 `true` 也无法启用数据库。
   *
   * @default true
   */
  useDatabase?: boolean
  /**
   * 由哪个 bot 广播开关播消息。如果没有指定的话，`app.bots[0]` 将广播消息。
   *
   * 因为 Koishi 在多机器人下并不能保证 `app.bots[0]` 的行为一致，所以最好手动指定。
   *
   * @default 0
   */
  asignees?: number | string | string[]
  /**
   * 访问 B 站 API 的时间间隔（单位毫秒）
   *
   * API 捅得地太频繁会被返回 429 (too many requests)。
   *
   * @default 60000
   */
  pollInterval?: number
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
   * @default {}
   */
  subscriptions: Subscriptions
}

export declare const apply: (ctx: Context, config: ConfigObject) => void