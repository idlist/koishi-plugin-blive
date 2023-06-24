interface BliverDetail {
  uid: number
  username: string
}

export type Blive = Record<string, BliverDetail>

export interface DatabaseBlive {
  blive: Blive
}

export interface DatabaseChannel extends DatabaseBlive {
  platform: string
  id: string
  guildId?: string
  assignee: string
}

export type LocalList = Record<string, Blive>

export type DisplayList = [string, BliverDetail][]