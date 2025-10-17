## Countdown Mod Card - 功能特性与配置文档
### 这是一款为 Home Assistant Lovelace 设计的现代化、紧凑型倒计时卡片。它提供了直观的交互方式和丰富的自定义选项，旨在将复杂的计时器操作变得简单而优雅

### 核心特性 (Core Features)
- 直观的滑动交互：通过在小时或分钟数字上垂直滑动，即可快速设置倒计时长短，无需繁琐的输入框。
- 实时刻度尺气泡：滑动时，屏幕侧方会浮现一个带有刻度尺的“气泡”窗口，实时显示并精确吸附到您设置的数值，操作精准且反馈清晰。
- 兼容性：已对本人其他卡片做了特别兼容popup-button-card & grid-template-card
- 动态状态显示：卡片会自动识别计时器状态（空闲、活动中），并切换对应的“开始/停止”按钮及图标。
- 智能时间格式：当计时器活动且剩余时间少于1分钟时，会自动切换为“分:秒”显示，让短时倒计时更易读。
- 自动重置：当计时器正常结束或被手动取消后，卡片上的显示数值会自动归零，为下一次使用做好准备。
- 完全可定制化：从卡片、标题、按钮到时间数字的样式，均可通过 CSS 进行深度定制。
- 模板支持：支持 Home Assistant 的全局卡片模板,部分配置支持hs动态模板，可以创建可复用的样式和配置。

#### 此项目全部功能实现代码由AI生成 Power By ChatGPT
---
### 卡片预览
- 操作演示
- ![](https://github.com/gasment/countdown-mod-card/blob/main/preview1.webp)
- 倒计时完成后触发实体操作
- ![](https://github.com/gasment/countdown-mod-card/blob/main/preview2.webp)
- 根据交互发生的位置，动态改变刻度气泡的左右侧弹出，触摸数字部分左侧则右弹出，触摸数字右侧则左弹出
- ![](https://github.com/gasment/countdown-mod-card/blob/main/preview3.webp)
### 安装说明：
方法一：
下载release中的countdown_mod_card.js文件，放入homeassistant 的 /config/www 下的任意文件夹内（给予执行权限），在HA设置->仪表盘中添加资源文件路径/local/xxxxx

方法二：
复制本项目仓库地址：https://github.com/gasment/countdown-mod-card ,在HACS添加Custom repositories，Repositories填写仓库地址，Type选择Dashboard； 搜索：countdown-mod-card，下载安装，按提示刷新页面

### HA实体与自动化配置
每个该卡片需要一个唯一记时器实体，以及一条自动化用于倒计时结束后的实体执行
- 记时器实体：创建一个计时器辅助元素，记录其timer实体ID
- 自动化，监听该计时器的timer.finished事件，继而触发后续操作，自动化yaml配置示例：
  ```
  alias: xxxx定时器
  description: ""
  triggers:
    - event_type: timer.finished
      event_data:
        entity_id: timer.your_entity_id  #你的计时器实体
      trigger: event
  actions:
    - action: switch.turn_off  #关闭操作
      data: {}
      target:
        entity_id: switch.your_entity_id  #你的开关实体
  mode: single
  ```
### 配置选项 (Configuration Options)
| 配置项 | 效果说明 | 使用说明 | 配置示例 |
| --- | --- | --- | --- |
| `type` | 声明卡片类型 | 必需，固定为`custom: countdown-mod-card`| `type: custom:countdown-mod-card`|
| `timer_entity` | 指定记时器实体 | 必需，配置为实体ID | `timer_entity: timer.my-timer` |
| `title` | 显示标题文本 | 可选，支持js模板 |`title: 定时·关`|
|`start_icon`|“开始”按钮显示的图标|可选，可配置mdi图标或文件路径|`start_icon: /local/icons/start.svg`|
|`stop_icon`|“停止”按钮显示的图标|可选，可配置mdi图标或文件路径|`stop_icon: /local/icons/stop.svg`|
|`hour_sensitivity`|设置小时的滑动灵敏度|可选，数值越小，越灵敏。默认值: 5|`hour_sensitivity: 5`|
|`minute_sensitivity`|设置分钟的滑动灵敏度| 可选，数值越小，越灵敏。默认值: 5|`minute_sensitivity: 5`|
|`hour_step`|小时数值的每格步进|可选，例如设为 2，则滑动时数值会按 0, 2, 4... 变化。默认值: 1|`hour_step: 1`|
|`minute_step`|分钟数值的每格步进|可选，例如设为 5，则滑动时数值会按 0, 5, 10... 变化。默认值: 1|`minute_step: 5`|
|`template`|要应用的全局模板名称|使用方法与button-card一致|`template: my-template`|
|`variables`|传递给模板的变量键值对|使用方法与button-card一致||
|`styles`|用于自定义卡片各部分样式的对象| 见下方说明||

#### 关于 styles 的说明:
styles 对象下可以包含 card, grid, title, timer, button 等键。每个键的值都是一个 CSS 规则数组
- styles -> card，定义卡片外部容器样式：
    ```
    styles:
      card:
        - background-color: white
        - border-radius: 10px
        - height: 45px
        - width: 130px
        - padding: 0px
    ```
- styles -> grid，定义各元素的网格布局，只支持3个固定元素：title/timer/button
    ```
    styles:
      grid:
        - grid-template-areas: |
            "title button"
            "timer button"
        - grid-template-columns: auto 55px
        - grid-template-rows: 20px 20px
        - justify-items: start
    ```
- styles -> title，定义标题文本样式
    ```
    styles:
      title:
        - font-size: 12px
        - margin-top: 4px
        - color: rgb(90,90,90)
        - margin-left: 10px
    ```
- styles -> timer，定义计时器样式
    ```
    styles:
      timer:
    - margin-left: 2px
    - font-size: 18px
    - color: |
        [[[
            if (states[`${config.timer_entity}`].state === "idle"){
            return "rgb(192,203,216)"
            } else {
            return "rgb(85,110,127)"
            }
        ]]]
    ```
- styles -> button，定义开始、停止按钮的样式
    ```
    styles:
      button:
        - background: rgba(0,0,0,0)
        - border-radius: 0px
        - width: 60px
        - height: 60px
        - padding: 0px
        - margin-top: 6px
    ```

预览卡片配置示例：
```
type: custom:countdown-mod-card
timer_entity: timer.ji_shi_qi_test
title: 定时 · 关
hour_sensitivity: 5
minute_sensitivity: 1
hour_step: 1
minute_step: 1
start_icon: /local/icon/start.svg  #自备图标
stop_icon: /local/icon/stop.svg  #自备图标
styles:
  title:
    - font-size: 12px
    - margin-top: 4px
    - color: rgb(85,110,127)
    - margin-left: 10px
  grid:
    - grid-template-areas: |
        "title button"
        "timer button"
    - grid-template-columns: auto 55px
    - grid-template-rows: 20px 20px
    - justify-items: start
  card:
    - background-color: rgb(233,239,251)
    - border-radius: 10px
    - height: 45px
    - width: 150px
    - padding: 0px
  timer:
    - margin-left: 2px
    - font-size: 18px
    - font-weight: bold
    - color: |
        [[[
            if (states[`${config.timer_entity}`].state === "idle"){
            return "rgb(192,203,216)"
            } else {
            return "rgb(85,110,127)"
            }
        ]]]
  button:
    - background: rgba(0,0,0,0)
    - border-radius: 0px
    - width: 60px
    - height: 60px
    - padding: 0px
    - margin-top: 6px
```
