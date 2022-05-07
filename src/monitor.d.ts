declare namespace Monitor {
  export interface MonitorItemChannels {
    platform: string
    channelId: string
    guildId?: string
    assignee: string
  }

  export interface MonitorItem {
    uid: string,
    live: boolean | undefined
    channels: MonitorItemChannels[]
  }

  export type MonitorList = Record<string, Monitor.MonitorItem>

  export interface MonitorAddArgs extends MonitorItemChannels {
    id: number | string
    uid: string
    live?: boolean
  }

  export interface MonitorDeleteArgs extends MonitorItemChannels {
    id: number | string
  }
}

declare class Monitor {
  constructor()
  list: Monitor.MonitorList
  add(args: Monitor.MonitorAddArgs): this
  remove(args: Monitor.MonitorDeleteArgs): this
}

export = Monitor