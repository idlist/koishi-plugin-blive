import { Context, Quester } from 'koishi'

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

declare namespace APIGenerator {
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
}

declare class APIGenerator {
  http: Quester
  constructor(ctx: Context): void
  getStatus(id: number): Promise<APIGenerator.StatusResult>
  getRoom(id: number): Promise<APIGenerator.RoomResult>
  getUser(id: number): Promise<APIGenerator.UserResult>
  searchUser(keyword: string, limit: number): Promise<APIGenerator.SearchResult>
  getImageBuffer(url: string): Promise<ArrayBuffer>
}

export = APIGenerator