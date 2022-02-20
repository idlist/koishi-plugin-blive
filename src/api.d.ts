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

declare class API {
  static getStatus(id: number): Promise<StatusResult>
  static getRoom(id: number): Promise<RoomResult>
  static getUser(id: number): Promise<UserResult>
  static searchUser(keyword: string, limit: number): Promise<SearchResult>
  static getImageBuffer(url: string): Promise<ArrayBuffer>
}

export = API