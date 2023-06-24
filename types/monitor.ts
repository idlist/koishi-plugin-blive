export interface MonitorChannel {
  platform: string
  channelId: string
  guildId?: string
  assignee: string
}

export interface MonitorItem {
  uid: string,
  live: boolean | undefined
  channels: MonitorChannel[]
}

export type MonitorList = Record<string, MonitorItem>

export interface MonitorAddArgs extends MonitorChannel {
  id: number | string
  uid: string
  live?: boolean
}

export interface MonitorDeleteArgs extends MonitorChannel {
  id: number | string
}