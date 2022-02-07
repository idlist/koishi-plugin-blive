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

然后在配置文件或入口文件中将插件添加至你的机器人中。

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

在安装了 `sharp`、`node-canvas` 或 `skia-canvas` 的情况下，这个插件会用其缩小主播头像。优先级为 `sharp` > `skia-canvas` > `node-canvas` > 什么也没有装。

## 插件配置项

这个插件无需任何配置项即可使用，同时也提供了一些可能会用到的配置项。一些不太可能会用到的配置项就摸了。你也可以在配置时借助 JSDoc 自行查看。

| 配置项 | 默认值 | 说明 |
| - | - | - |
| `useDatabase` | `true` | 是否使用数据库。 **\*1** |
| `pollInterval` | 60000 | 访问 B 站 API 的时间间隔（单位毫秒）**\*2** |
| `pageLimit` | 10 | 分页显示群内订阅主播时，每页的最多显示条数。 |
| `searchPageLimit` | 10 | 在使用用户名搜索主播时的最多显示条数。 |
| `maxSubsPerChannel` | 10 | 每个群 / 频道最大订阅数量。仅在使用数据库时有效。 |
| `subscriptions` | `{}` | 订阅列表。仅在不使用数据库时有效。**\*3** |

**\*1** 在没有配置数据库的情况下，即使这个选项设置为 `true` 也无法启用数据库。

**\*2** API 捅得地太频繁会被返回 429 (too many requests)。

**\*3** 这个列表遵循以下格式：

```js
{
  '机器人平台:机器人 ID 1': {
    '直播间 ID 1': ['群 1', '群 2',...]
    '直播间 ID 2': ['群 1', '群 3' ...]
  }
  ...
}
```

例如

```js
{
  'onebot:364364': {
    '117': ['114514', '1919810']
    '3449237': ['3141592653589793']
  }
}
```

这个格式设计成这样是因为我懒，因为这样我就不需要手动依直播间统合一道以减少对 API 的调用了。

## 已知问题

因为并没有多 bot 测试环境，所以并不清楚对于多 bot 的支持如何，可能会有问题。

## 更新记录

### v1.0.1

修复了指令注册的机制，现在应该会正常识别有无数据库的情况了。

### v1.0.0

简单地适配了 v4，同时本地模式下 `Subscription` 的格式有更改，需要手动指定 `assignee` （即手动指定由哪个 bot 推送消息）了。

如果需要继续在 v3 使用，请使用 v0.3。

### v0.3.0

增加了在安装一些图像处理的依赖的情况下，可以用它们对 B 站的用户头像进行缩放的功能，以减少刷屏程度。
