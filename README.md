# koishi-plugin-blive

[![npm](https://img.shields.io/npm/v/koishi-plugin-blive?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-blive)
[![npm-download](https://img.shields.io/npm/dw/koishi-plugin-blive?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-blive)

B 站直播订阅。在主播上下播时进行提醒。

<details>
<summary>开发者信息</summary>

> Original plugin by Dragon-Fish <824399619@qq.com>
>
> Original repository:
> https://github.com/koishijs/koishi-plugin-blive
>
> Refactored by i'DLisT <me@idl.ist> (https://idl.ist/)

</details>

## 安装方法

通过网页控制台安装此插件，或通过命令行：

```shell
npm i koishi-plugin-blive
```

然后在配置文件或入口文件中将插件添加至你的机器人中。

## 使用方法

使用 `-help blive` 可以在 bot 内查看帮助。

这个插件有 **使用数据库** 与 **不使用数据库** 两种模式，默认使用数据库。

### blive.add \<id\>

`id`: 房间号

需要 2 级权限。

新增订阅。仅在使用数据库时可用。

### blive.remove \<id\>

`id`: 房间号

需要 2 级权限。

移除订阅。仅在使用数据库时可用。

### blive.list \[page\]

`page`: 列表页码

显示订阅列表。

### blive.search \<keyword\>

`keyword`: 关键字

搜索主播 / 直播间。

#### 选项

`--room`, `-r`: 使用房间号进行搜索（默认行为）。此时 `keyword` 为房间号。

`--uid`, `-u`: 使用主播 UID 进行搜索。此时 `keyword` 为 UID。

`--name`, `-n`: 使用用户名进行搜索。此时 `keyword` 为用户名关键字，默认将显示前 10 条结果，可使用配置项更改显示条数。

## 插件配置项

这个插件需要配置以下配置项以使用：

| 配置项 | 类型 | 说明 |
| - | - | - |
| `sessdata` | string | B 站登录 Cookie 中的 SESSDATA 项 **\*1** |

**\*1** 你可以通过各种查看 Cookie 的方法复制粘贴此项。请对此内容保密（如 .gitignore 相关文件）以保护你的账号。

| 配置项 | 默认值 | 说明 |
| - | - | - |
| `useDatabase` | `true` | 是否使用数据库。 **\*1** |
| `pollInterval` | 60000 | 访问 B 站 API 的时间间隔（单位毫秒）**\*2** |
| `showIcon` | `true` | 在主播上下播时是否同时发送头像。使用搜索指令时不受此选项的影响。 |
| `pageLimit` | 10 | 分页显示群内订阅主播时，每页的最多显示条数。 |
| `searchPageLimit` | 10 | 在使用用户名搜索主播时的最多显示条数。 |
| `maxSubsPerChannel` | 10 | 每个群 / 频道最大订阅数量。仅在使用数据库时有效。 |
| `subscriptions` | `[]` | 订阅列表。仅在不使用数据库时有效。**\*3** |

**\*1** 在没有配置数据库的情况下，即使这个选项设置为 `true` 也无法启用数据库。

**\*2** API 捅得地太频繁会被返回 429 (too many requests)。

**\*3** 这个列表为一个数组，每一项遵循以下格式：

```ts
interface SubscriptionItem {
  platform: string // 用于推送的机器人的平台。QQ 则为 `onebot`。
  assignee: string // 用于推送的机器人 ID。
  room: string     // 主播房间号。
  channel: string  // 订阅此主播的群号。
  guild?: string   // 订阅此主播的服务器号。仅 QQ 频道或开黑啦需要此项。
}
```

例如：

```js
{
  platform: 'onebot',
  assignee: '114514',
  room: '364364',
  channel: '12345678',
  // 因为不是 QQ 频道所以不填写 guild。
}
```

## 可选功能

在安装了 `sharp`、`node-canvas` 或 `skia-canvas` 的情况下，这个插件会用其缩小主播头像。优先级为 `sharp` > `skia-canvas` > `node-canvas` > 什么也没有装。

## 已知问题

因为并没有多 bot 和对 QQ 频道的测试环境，所以对这些情况的支持可能会有问题。

## 更新记录

<details>
<summary><b>v1.0</b> （用于 Koishi v4）</summary>

### v1.4.1

- 新增 `package.json` 中的 `koishi` 字段。

### v1.4.0

*此插件需要 Koishi 版本至少为 v4.9。如有需要，请使用 v1.3.3。*

- 由于 `template` API 于 Koishi 4.9 被移除，而新的 `ctx.i18n` 对主动推送的支持难度较高，因此字符串自定义功能被放弃。如果有此类需求请考虑 Fork 或提出对 `ctx.i18n` 进行支持的 Pull Request。
- 重载逻辑使用的事件从 `service` 变更为 `internal/service`，以及 `ctx.bots.get()` 变更为 `ctx.bots[]`。

### v1.3.3

*此版本没有上传到 npm，如需要使用请直接下载源码*

- **\[Breaking\]** 由于三相之力指示器事件，B 站对部分接口增加了 Cookie（SESSDATA）鉴权，导致此插件必须取得此内容才能正常工作。对应的配置项为 `sessdata`。

### v1.3.2

- 尝试移除 axios 而改用内置的 ctx.http。

### v1.3.1

- 尝试修复了更新 Koishi 4.7 之后报检测到重复插件的错误。现在不报了，但是重载逻辑不一定对，希望是对的。

### v1.3.0

- 尝试增加对 QQ 频道的支持。

### v1.2.0

- **\[Breaking\]** 修改了无数据库模式的格式，对于网页控制台更加友好了。考虑到其实并没有什么人使用无数据库模式，就不升大版本号了。

### v1.1.3

- 修复了 `Ctrl + F` 重构结果有几个变量没重命名到，导致多个群关注同一主播时推送不正常的问题。
- 增加了一些 `logger.debug`，可能查错会更加方便了（虽然本身 `JS` 插件无需转译，直接源码调试也方便）

### v1.1.2

- 修复了 `console.log` 忘了删的问题。

### v1.1.1

- 新增了自动更新数据库中储存的主播的用户名的功能。

### v1.1.0

- 修复了使用 `sharp` 的情况下头像无法被发出的问题。
- 新增配置项 `showIcon`，可以设置在开关播时是否同时发送头像了。
- 支持了 `Schema`，虽然配置项 `subscriptions` 因为形状太复杂而暂时无法支持。

### v1.0.1

- 修复了指令注册的机制，现在应该会正常识别有无数据库的情况了。

### v1.0.0

- 简单地适配了 v4，同时本地模式下 `subscriptions` 的格式有更改，需要手动指定 `assignee` （即手动指定由哪个 bot 推送消息）了。

如果需要继续在 v3 使用，请使用 v0.3。

</details>

<details>
<summary><b>v0.1 ~ v0.3</b> （用于 Koishi v3）</summary>

### v0.3.0

- 增加了在安装一些图像处理的依赖的情况下，可以用它们对 B 站的用户头像进行缩放的功能，以减少刷屏程度。

</details>