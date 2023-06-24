interface BliverDetail {
  uid: number
  username: string
}

type Blive = Record<string, BliverDetail>

declare module 'koishi' {
  interface Channel {
    blive: Blive
  }
}