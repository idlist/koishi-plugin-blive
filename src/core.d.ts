interface BliverDetail {
  uid: number
  username: string
}

export type Blive = Record<string, BliverDetail>

export interface DbChannel extends DbChannelBlive {
  id: string
  guildId?: string
  platform: string
  assignee: string
  blive: Blive
}

export type DbChannelBlive = Pick<DbChannel, 'blive'>

export type LocalList = Record<string, Blive>

export type DisplayList = [string, BliverDetail][]