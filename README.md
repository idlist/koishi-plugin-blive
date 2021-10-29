# koishi-plugin-blive

[![npm](https://img.shields.io/npm/v/@idlist/koishi-plugin-blive?style=flat-square)](https://www.npmjs.com/package/@idlist/koishi-plugin-blive)
[![npm-download](https://img.shields.io/npm/dw/@idlist/koishi-plugin-blive?style=flat-square)](https://www.npmjs.com/package/@idlist/koishi-plugin-blive)

B 站直播订阅。在主播上下播时进行提醒。

> Original plugin by Dragon-Fish <824399619@qq.com>
>
> Original repository:
> https://github.com/koishijs/koishi-plugin-blive
>
> Refactored by i'DLisT <me@idl.ist> (https://idl.ist/)

## 安装方法

```shell
npm i koishi-plugin-blive
```

然后参照 [安装插件](https://koishi.js.org/guide/context.html#%E5%AE%89%E8%A3%85%E6%8F%92%E4%BB%B6) 继续安装。

## 使用方法

使用 `-help blive` 可以在 bot 内查看帮助。

这个插件有 **使用数据库** 与 **不使用数据库** 两种模式，默认使用数据库。

#### `blive.add <id>`

`id`: 房间号

需要 2 级权限。

新增订阅。仅在使用数据库时可用。

#### `blive.remove <id>`

`id`: 房间号

需要 2 级权限。

移除订阅。仅在使用数据库时可用。

#### `blive.list [page]`

`page`: 列表页码

显示订阅列表。

#### `blive.search <keyword>`

`keyword`: 关键字

搜索主播 / 直播间。

##### 选项

`--room`, `-r`: 使用房间号进行搜索（默认行为）。此时 `keyword` 为房间号。

`--uid`, `-u`: 使用主播 UID 进行搜索。此时 `keyword` 为 UID。

`--name`, `-n`: 使用用户名进行搜索。此时 `keyword` 为用户名关键字，默认将显示前 10 条结果，可使用配置项更改显示条数。

## 可选功能

在安装了 `sharp` 或者 `node-canvas` 的情况下，这个插件会用其缩小主播头像。优先级为 `sharp` > `node-canvas` > 什么也没有装。

## 插件配置项

这个插件无需任何配置项即可使用，同时也提供了一些可能会用到的配置项。一些不太可能会用到的配置项就摸了。你也可以在配置时借助 JSDoc 自行查看。

| 配置项 | 默认值 | 说明 |
| - | - | - |
| `useDatabase` | `true` | 是否使用数据库。 **\*1** |
| `asignees` | 0 | 由哪个 bot 广播开关播消息。**\*2** |
| `pollInterval` | 60000 | 访问 B 站 API 的时间间隔（单位毫秒）**\*3** |
| `pageLimit` | 10 | 分页显示群内订阅主播时，每页的最多显示条数。 |
| `searchPageLimit` | 10 | 在使用用户名搜索主播时的最多显示条数。 |
| `maxSubsPerChannel` | 10 | 每个群 / 频道最大订阅数量。仅在使用数据库时有效。 |
| `subscriptions` | `{}` | 订阅列表。仅在不使用数据库时有效。**\*4** |

**\*1** 在没有配置数据库的情况下，即使这个选项设置为 `true` 也无法启用数据库。

**\*2** 如果没有指定的话，`app.bots[0]` 将广播消息。

但是因为 Koishi 在多机器人下并不能保证 `app.bots[0]` 的行为一致，所以最好手动指定。

接受 `number`(0, 1, 2...), `string` (`platform:botId`), `string[]`。

**\*3** API 捅得地太频繁会被返回 429 (too many requests)。

**\*4** 这个列表遵循以下格式：

```js
{
  '直播间 ID 1': ['平台 1:群 1', '平台 1:群 2',...]
  '直播间 ID 2': ['平台 1:群 1', '平台 2:群 3' ...]
  ...
}
```

例如

```js
{
  '117': ['onebot:114514', 'onebot:1919810']
  '3449237': ['discord:3141592653589793']
}
```

这个格式设计成这样是因为我懒，因为这样我就不需要手动依直播间统合一道以减少对 API 的调用了。

## 已知问题

因为并没有多 bot 测试环境，所以并不清楚对于多 bot 的支持如何，可能会有问题。