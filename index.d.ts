import { Context } from 'koishi'

interface ErrorCode {
  error: number
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

export type StatusResult = ErrorCode | StatusData
export type RoomResult = ErrorCode | RoomData
export type UserResult = ErrorCode | UserData
export type SearchResult = ErrorCode | SearchData

export interface MonitItem {
  uid: string,
  live: boolean | undefined
  channel: {
    platform: string
    channelId: string
  }[]
}

export type MonitList = Record<string, MonitItem>

type Blive = Record<string, {
  uid: number
  username: string
}>

export interface ChannelBlive {
  blive: Blive
}

export interface Channel extends ChannelBlive {
  id: string
}

export interface ConfigObject {
  /**
   * Specify which bot(s) is to broadcast the live starting / ending messages.
   *
   * If not specified, then the `app.bots[0]` is used to broadcast the messages.
   *
   * It is recommended to set a value for this instead of using the default value.
   *
   * @default 0
   */
  asignees?: number | string | string[]
  /**
   * Maximum subscriptions in one group / channel.
   *
   * @default 10
   */
  maxSubsPerChannel?: number
  /**
   * Maximum number of items for a page when listing subscriptions.
   *
   * @default 10
   */
  pageLimit?: number
  /**
   * Maximum number of items for a page when searching for user name.
   *
   * @default 10
   */
  searchPageLimit?: number
  /**
   * Interval for checking livers' status (in milliseconds).
   *
   * Too frequent requests would cause 429 (too many requests).
   *
   * @default 60000
   */
  pollInterval?: number
}

export const apply: (ctx: Context, config: ConfigObject) => void