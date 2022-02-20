import { Blive } from './core'

declare module 'koishi' {
  interface Channel {
    blive: Blive
  }
}