interface ErrorCode {
  error: number
}

export type Result<T> = Partial<ErrorCode> & Partial<T>

export interface StatusData {
  id: number
  idShort: number
  uid: number
  live: boolean
}

export interface RoomData {
  uid: number
  username: string
  iconUrl: string
  news: string
}

export interface UserData {
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