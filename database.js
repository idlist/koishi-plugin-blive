const { Database, Channel } = require('koishi')

Channel.extend(() => ({ blive: {} }))

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
  tables.channel.blive = new Domain.Json()
})