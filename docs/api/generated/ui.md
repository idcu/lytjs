# @lytjs/ui

官方 UI 组件库（Button、Input、Dialog 等）

## 目录

- [Alert](#alert)
- [Avatar](#avatar)
- [Badge](#badge)
- [BreadcrumbItem](#breadcrumbitem)
- [Breadcrumb](#breadcrumb)
- [Button](#button)
- [CalendarEvent](#calendarevent)
- [Calendar](#calendar)
- [Card](#card)
- [Carousel](#carousel)
- [CarouselItem](#carouselitem)
- [Cascader](#cascader)
- [Checkbox](#checkbox)
- [CheckboxGroup](#checkboxgroup)
- [ColorPicker](#colorpicker)
- [ContainerSetupProps](#containersetupprops)
- [Container](#container)
- [getDaysInMonth](#getdaysinmonth)
- [getFirstDayOfMonth](#getfirstdayofmonth)
- [formatDate](#formatdate)
- [isSameDay](#issameday)
- [DatePicker](#datepicker)
- [DescriptionsItemData](#descriptionsitemdata)
- [Descriptions](#descriptions)
- [DescriptionsItem](#descriptionsitem)
- [Dialog](#dialog)
- [Divider](#divider)
- [Drawer](#drawer)
- [Empty](#empty)
- [FormLocale](#formlocale)
- [createFormLocale](#createformlocale)
- [formatMessage](#formatmessage)
- [Form](#form)
- [validateType](#validatetype)
- [FormItem](#formitem)
- [Icon](#icon)
- [Image](#image)
- [Input](#input)
- [InputNumber](#inputnumber)
- [Link](#link)
- [MenuSetupProps](#menusetupprops)
- [MenuSlots](#menuslots)
- [MenuItemInfo](#menuiteminfo)
- [Menu](#menu)
- [MessageType](#messagetype)
- [MessageOptions](#messageoptions)
- [MessageInstance](#messageinstance)
- [createMessage](#createmessage)
- [Message](#message)
- [Modal](#modal)
- [NotificationItem](#notificationitem)
- [NotificationManager](#notificationmanager)
- [Notification](#notification)
- [PaginationSetupProps](#paginationsetupprops)
- [Pagination](#pagination)
- [Popconfirm](#popconfirm)
- [Progress](#progress)
- [Radio](#radio)
- [RadioGroup](#radiogroup)
- [Rate](#rate)
- [FormatCommand](#formatcommand)
- [RichTextEditor](#richtexteditor)
- [Select](#select)
- [Slider](#slider)
- [Spin](#spin)
- [Step](#step)
- [Steps](#steps)
- [Switch](#switch)
- [Table](#table)
- [TabsType](#tabstype)
- [TabPane](#tabpane)
- [DragState](#dragstate)
- [TabPane](#tabpane)
- [Tabs](#tabs)
- [Tag](#tag)
- [Timeline](#timeline)
- [TimelineItem](#timelineitem)
- [TimePickerSetupProps](#timepickersetupprops)
- [TimePicker](#timepicker)
- [Toast](#toast)
- [Tooltip](#tooltip)
- [Transfer](#transfer)
- [TransitionSetupProps](#transitionsetupprops)
- [TransitionSlots](#transitionslots)
- [Transition](#transition)
- [TransitionGroupSetupProps](#transitiongroupsetupprops)
- [TransitionGroupSlots](#transitiongroupslots)
- [TransitionGroup](#transitiongroup)
- [FlattenNode](#flattennode)
- [Tree](#tree)
- [TreeSelectNode](#treeselectnode)
- [TreeSelectSetupProps](#treeselectsetupprops)
- [NodeDict](#nodedict)
- [TreeSelect](#treeselect)
- [ComponentSize](#componentsize)
- [ComponentStatus](#componentstatus)
- [Placement](#placement)
- [Align](#align)
- [Direction](#direction)
- [ContentPosition](#contentposition)
- [ToastType](#toasttype)
- [AlertType](#alerttype)
- [TableAlign](#tablealign)
- [TableSortOrder](#tablesortorder)
- [NativeType](#nativetype)
- [Target](#target)
- [ButtonNativeType](#buttonnativetype)
- [ButtonSetupProps](#buttonsetupprops)
- [ButtonProps](#buttonprops)
- [ButtonSlots](#buttonslots)
- [InputSetupProps](#inputsetupprops)
- [InputProps](#inputprops)
- [InputSlots](#inputslots)
- [DialogSetupProps](#dialogsetupprops)
- [DialogProps](#dialogprops)
- [DialogSlots](#dialogslots)
- [DialogSetupProps](#dialogsetupprops)
- [ModalProps](#modalprops)
- [ModalSlots](#modalslots)
- [ModalSetupProps](#modalsetupprops)
- [SelectOption](#selectoption)
- [SelectSetupProps](#selectsetupprops)
- [SelectProps](#selectprops)
- [SelectSlots](#selectslots)
- [TabPaneSetupProps](#tabpanesetupprops)
- [TabPaneSlots](#tabpaneslots)
- [TabPaneProps](#tabpaneprops)
- [TabsSetupProps](#tabssetupprops)
- [TabsProps](#tabsprops)
- [TabsSlots](#tabsslots)
- [CascaderOption](#cascaderoption)
- [CascaderSetupProps](#cascadersetupprops)
- [CascaderProps](#cascaderprops)
- [CascaderSlots](#cascaderslots)
- [DatePickerType](#datepickertype)
- [DatePickerShortcut](#datepickershortcut)
- [DatePickerSetupProps](#datepickersetupprops)
- [DatePickerProps](#datepickerprops)
- [DatePickerSlots](#datepickerslots)
- [TableColumn](#tablecolumn)
- [TableRowData](#tablerowdata)
- [TableData](#tabledata)
- [TableSortCallback](#tablesortcallback)
- [TableRowClickCallback](#tablerowclickcallback)
- [TableSetupProps](#tablesetupprops)
- [TableProps](#tableprops)
- [TableSlots](#tableslots)
- [IconProps](#iconprops)
- [IconSetupProps](#iconsetupprops)
- [IconSlots](#iconslots)
- [BadgeProps](#badgeprops)
- [BadgeSlots](#badgeslots)
- [BadgeSetupProps](#badgesetupprops)
- [TagProps](#tagprops)
- [TagSlots](#tagslots)
- [TagSetupProps](#tagsetupprops)
- [SpinProps](#spinprops)
- [SpinSetupProps](#spinsetupprops)
- [SpinSlots](#spinslots)
- [EmptyProps](#emptyprops)
- [EmptySetupProps](#emptysetupprops)
- [EmptySlots](#emptyslots)
- [LinkProps](#linkprops)
- [LinkSetupProps](#linksetupprops)
- [LinkSlots](#linkslots)
- [ContainerProps](#containerprops)
- [ContainerSlots](#containerslots)
- [DividerProps](#dividerprops)
- [DividerSetupProps](#dividersetupprops)
- [DividerSlots](#dividerslots)
- [ToastProps](#toastprops)
- [ToastSlots](#toastslots)
- [ToastSetupProps](#toastsetupprops)
- [FormValidateStatus](#formvalidatestatus)
- [FormRule](#formrule)
- [FormRules](#formrules)
- [FormSetupProps](#formsetupprops)
- [FormProps](#formprops)
- [FormSlots](#formslots)
- [FormItemSetupProps](#formitemsetupprops)
- [FormItemProps](#formitemprops)
- [FormItemSlots](#formitemslots)
- [MenuItem](#menuitem)
- [MenuSetupProps](#menusetupprops)
- [MenuProps](#menuprops)
- [MenuSlots](#menuslots)
- [AlertEffect](#alerteffect)
- [AlertSetupProps](#alertsetupprops)
- [AlertProps](#alertprops)
- [AlertSlots](#alertslots)
- [TooltipProps](#tooltipprops)
- [TooltipSetupProps](#tooltipsetupprops)
- [TooltipSlots](#tooltipslots)
- [CheckboxProps](#checkboxprops)
- [CheckboxSlots](#checkboxslots)
- [CheckboxSetupProps](#checkboxsetupprops)
- [RadioProps](#radioprops)
- [RadioSlots](#radioslots)
- [RadioSetupProps](#radiosetupprops)
- [SwitchProps](#switchprops)
- [SwitchSlots](#switchslots)
- [SwitchSetupProps](#switchsetupprops)
- [InputNumberProps](#inputnumberprops)
- [InputNumberSlots](#inputnumberslots)
- [InputNumberSetupProps](#inputnumbersetupprops)
- [TransferOption](#transferoption)
- [TransferProps](#transferprops)
- [TransferSetupProps](#transfersetupprops)
- [TransferSlots](#transferslots)
- [TreeNode](#treenode)
- [TreeProps](#treeprops)
- [TreeSetupProps](#treesetupprops)
- [TreeSlots](#treeslots)
- [TreeSelectNode](#treeselectnode)
- [TreeSelectProps](#treeselectprops)
- [TreeSelectSetupProps](#treeselectsetupprops)
- [TreeSelectSlots](#treeselectslots)
- [UploadFileStatus](#uploadfilestatus)
- [UploadFile](#uploadfile)
- [UploadProps](#uploadprops)
- [UploadSetupProps](#uploadsetupprops)
- [UploadSlots](#uploadslots)
- [ImageFit](#imagefit)
- [ImageProps](#imageprops)
- [ImageSlots](#imageslots)
- [ImageSetupProps](#imagesetupprops)
- [NotificationType](#notificationtype)
- [NotificationPosition](#notificationposition)
- [NotificationOptions](#notificationoptions)
- [NotificationProps](#notificationprops)
- [NotificationSlots](#notificationslots)
- [NotificationSetupProps](#notificationsetupprops)
- [CalendarView](#calendarview)
- [CalendarEvent](#calendarevent)
- [CalendarProps](#calendarprops)
- [CalendarSlots](#calendarslots)
- [CalendarSetupProps](#calendarsetupprops)
- [ColorPickerProps](#colorpickerprops)
- [ColorPickerSlots](#colorpickerslots)
- [ColorPickerSetupProps](#colorpickersetupprops)
- [DescriptionsItemData](#descriptionsitemdata)
- [DescriptionsProps](#descriptionsprops)
- [DescriptionsSetupProps](#descriptionssetupprops)
- [DescriptionsSlots](#descriptionsslots)
- [DescriptionsItemProps](#descriptionsitemprops)
- [DescriptionsItemSetupProps](#descriptionsitemsetupprops)
- [DescriptionsItemSlots](#descriptionsitemslots)
- [DrawerDirection](#drawerdirection)
- [DrawerProps](#drawerprops)
- [DrawerSlots](#drawerslots)
- [DrawerSetupProps](#drawersetupprops)
- [RateProps](#rateprops)
- [RateSlots](#rateslots)
- [RateSetupProps](#ratesetupprops)
- [CheckboxGroupProps](#checkboxgroupprops)
- [CheckboxGroupSlots](#checkboxgroupslots)
- [CheckboxGroupSetupProps](#checkboxgroupsetupprops)
- [RadioGroupProps](#radiogroupprops)
- [RadioGroupSlots](#radiogroupslots)
- [RadioGroupSetupProps](#radiogroupsetupprops)
- [ProgressProps](#progressprops)
- [ProgressSlots](#progressslots)
- [ProgressSetupProps](#progresssetupprops)
- [SliderProps](#sliderprops)
- [SliderSlots](#sliderslots)
- [SliderSetupProps](#slidersetupprops)
- [AvatarProps](#avatarprops)
- [AvatarSlots](#avatarslots)
- [AvatarSetupProps](#avatarsetupprops)
- [CardProps](#cardprops)
- [CardSlots](#cardslots)
- [CardSetupProps](#cardsetupprops)
- [TimelineItem](#timelineitem)
- [TimelineProps](#timelineprops)
- [TimelineSlots](#timelineslots)
- [TimelineSetupProps](#timelinesetupprops)
- [TimelineItemProps](#timelineitemprops)
- [TimelineItemSlots](#timelineitemslots)
- [TimelineItemSetupProps](#timelineitemsetupprops)
- [Step](#step)
- [StepsProps](#stepsprops)
- [StepsSlots](#stepsslots)
- [StepsSetupProps](#stepssetupprops)
- [StepProps](#stepprops)
- [StepSlots](#stepslots)
- [StepSetupProps](#stepsetupprops)
- [CarouselProps](#carouselprops)
- [CarouselSlots](#carouselslots)
- [CarouselSetupProps](#carouselsetupprops)
- [CarouselItemProps](#carouselitemprops)
- [CarouselItemSlots](#carouselitemslots)
- [CarouselItemSetupProps](#carouselitemsetupprops)
- [PopconfirmProps](#popconfirmprops)
- [PopconfirmSlots](#popconfirmslots)
- [PopconfirmSetupProps](#popconfirmsetupprops)
- [RichTextEditorProps](#richtexteditorprops)
- [RichTextEditorSlots](#richtexteditorslots)
- [RichTextEditorSetupProps](#richtexteditorsetupprops)
- [Upload](#upload)
- [VaporBadgeProps](#vaporbadgeprops)
- [VaporBadge](#vaporbadge)
- [VaporButtonProps](#vaporbuttonprops)
- [VaporButton](#vaporbutton)
- [VaporInputProps](#vaporinputprops)
- [VaporInput](#vaporinput)
- [VaporListProps](#vaporlistprops)
- [VaporList](#vaporlist)
- [MenuItem](#menuitem)
- [VaporMenuItemProps](#vapormenuitemprops)
- [VaporSubMenuProps](#vaporsubmenuprops)
- [VaporMenuProps](#vapormenuprops)
- [VaporMenuItem](#vapormenuitem)
- [VaporSubMenu](#vaporsubmenu)
- [VaporMenu](#vapormenu)
- [SelectOption](#selectoption)
- [VaporSelectProps](#vaporselectprops)
- [VaporSelect](#vaporselect)
- [TabPane](#tabpane)
- [VaporTabPaneProps](#vaportabpaneprops)
- [VaporTabsProps](#vaportabsprops)
- [VaporTabPane](#vaportabpane)
- [VaporTabs](#vaportabs)
- [VaporTagProps](#vaportagprops)
- [VaporTag](#vaportag)
- [LytUI](#lytui)

## Alert

**Variable**

## Avatar

**Variable**

## Badge

**Variable**

## BreadcrumbItem

**Variable**

## Breadcrumb

**Variable**

## Button

**Variable**

## CalendarEvent

**Interface**

### 成员

| 名称  | 类型      | 描述 | 可选 |
| ----- | --------- | ---- | ---- |
| title | `string`  |      | 否   |
| start | `Date`    |      | 否   |
| end   | `Date`    |      | 是   |
| color | `string`  |      | 是   |
| data  | `unknown` |      | 是   |

## Calendar

**Variable**

## Card

**Variable**

## Carousel

**Variable**

## CarouselItem

**Variable**

CarouselItem 走马灯项组件

## Cascader

**Variable**

## Checkbox

**Variable**

## CheckboxGroup

**Variable**

CheckboxGroup 组件

## ColorPicker

**Variable**

## ContainerSetupProps

**Interface**

### 成员

| 名称  | 类型      | 描述 | 可选 |
| ----- | --------- | ---- | ---- |
| fluid | `boolean` |      | 否   |
| class | `string`  |      | 否   |
| style | `string`  |      | 否   |

## Container

**Variable**

## getDaysInMonth

**Function**

### 签名

```typescript
getDaysInMonth: number;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| year  | `number` |      | 否   | -      |
| month | `number` |      | 否   | -      |

### 返回值

**类型:** `number`

## getFirstDayOfMonth

**Function**

### 签名

```typescript
getFirstDayOfMonth: number;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| year  | `number` |      | 否   | -      |
| month | `number` |      | 否   | -      |

### 返回值

**类型:** `number`

## formatDate

**Function**

### 签名

```typescript
formatDate: string;
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值         |
| ------ | -------- | ---- | ---- | -------------- |
| date   | `Date`   |      | 否   | -              |
| format | `string` |      | 是   | `'YYYY-MM-DD'` |

### 返回值

**类型:** `string`

## isSameDay

**Function**

### 签名

```typescript
isSameDay: boolean;
```

### 参数

| 参数  | 类型   | 描述 | 可选 | 默认值 |
| ----- | ------ | ---- | ---- | ------ |
| date1 | `Date` |      | 否   | -      |
| date2 | `Date` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## DatePicker

**Variable**

## DescriptionsItemData

**Interface**

### 成员

| 名称         | 类型                     | 描述 | 可选 |
| ------------ | ------------------------ | ---- | ---- |
| label        | `string`                 |      | 否   |
| value        | `string`                 |      | 否   |
| span         | `number`                 |      | 是   |
| labelStyle   | `Record<string, string>` |      | 是   |
| contentStyle | `Record<string, string>` |      | 是   |

## Descriptions

**Variable**

## DescriptionsItem

**Variable**

## Dialog

**Variable**

## Divider

**Variable**

## Drawer

**Variable**

## Empty

**Variable**

## FormLocale

**Interface**

### 成员

| 名称      | 类型     | 描述 | 可选 |
| --------- | -------- | ---- | ---- |
| required  | `string` |      | 否   |
| pattern   | `string` |      | 否   |
| min       | `string` |      | 否   |
| max       | `string` |      | 否   |
| type      | `string` |      | 否   |
| validator | `string` |      | 否   |
| default   | `string` |      | 否   |

## createFormLocale

**Function**

### 签名

```typescript
createFormLocale: FormLocale;
```

### 参数

| 参数   | 类型                  | 描述 | 可选 | 默认值 |
| ------ | --------------------- | ---- | ---- | ------ |
| locale | `Partial<FormLocale>` |      | 否   | -      |

### 返回值

**类型:** `FormLocale`

## formatMessage

**Function**

### 签名

```typescript
formatMessage: string;
```

### 参数

| 参数     | 类型                               | 描述 | 可选 | 默认值 |
| -------- | ---------------------------------- | ---- | ---- | ------ |
| template | `string`                           |      | 否   | -      |
| params   | `Record<string, string \| number>` |      | 否   | -      |

### 返回值

**类型:** `string`

## Form

**Variable**

## validateType

**Function**

### 签名

```typescript
validateType: boolean;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| value | `unknown` |      | 否   | -      |
| type  | `string`  |      | 否   | -      |

### 返回值

**类型:** `boolean`

## FormItem

**Variable**

## Icon

**Variable**

## Image

**Variable**

## Input

**Variable**

## InputNumber

**Variable**

InputNumber 组件

## Link

**Variable**

Link 组件

## MenuSetupProps

**Interface**

### 成员

| 名称            | 类型                                     | 描述 | 可选 |
| --------------- | ---------------------------------------- | ---- | ---- |
| mode            | `string`                                 |      | 否   |
| defaultActive   | `string`                                 |      | 否   |
| defaultOpeneds  | `string[]`                               |      | 否   |
| uniqueOpened    | `boolean`                                |      | 否   |
| class           | `string`                                 |      | 否   |
| id              | `string`                                 |      | 否   |
| ariaLabel       | `string`                                 |      | 否   |
| ariaDescribedBy | `string`                                 |      | 否   |
| onSelect        | `((index: string) => void) \| undefined` |      | 否   |
| onOpen          | `((index: string) => void) \| undefined` |      | 否   |
| onClose         | `((index: string) => void) \| undefined` |      | 否   |

## MenuSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## MenuItemInfo

**Interface**

### 成员

| 名称        | 类型                  | 描述 | 可选 |
| ----------- | --------------------- | ---- | ---- |
| index       | `string`              |      | 否   |
| label       | `string`              |      | 否   |
| disabled    | `boolean`             |      | 否   |
| hasChildren | `boolean`             |      | 否   |
| element     | `HTMLElement \| null` |      | 否   |

## Menu

**Variable**

## MessageType

**Type**

### 签名

```typescript
MessageType: 'success' | 'warning' | 'info' | 'error';
```

## MessageOptions

**Interface**

### 成员

| 名称      | 类型          | 描述 | 可选 |
| --------- | ------------- | ---- | ---- |
| message   | `string`      |      | 否   |
| type      | `MessageType` |      | 是   |
| duration  | `number`      |      | 是   |
| showClose | `boolean`     |      | 是   |
| onClose   | `() => void`  |      | 是   |

## MessageInstance

**Interface**

### 成员

| 名称  | 类型         | 描述 | 可选 |
| ----- | ------------ | ---- | ---- |
| id    | `number`     |      | 否   |
| close | `() => void` |      | 否   |

## createMessage

**Function**

### 签名

```typescript
createMessage: MessageInstance;
```

### 参数

| 参数    | 类型             | 描述 | 可选 | 默认值 |
| ------- | ---------------- | ---- | ---- | ------ |
| options | `MessageOptions` |      | 否   | -      |

### 返回值

**类型:** `MessageInstance`

## Message

**Variable**

## Modal

**Variable**

## NotificationItem

**Interface**

### 成员

| 名称      | 类型         | 描述 | 可选 |
| --------- | ------------ | ---- | ---- |
| id        | `number`     |      | 否   |
| type      | `string`     |      | 否   |
| title     | `string`     |      | 否   |
| message   | `string`     |      | 否   |
| duration  | `number`     |      | 否   |
| position  | `string`     |      | 否   |
| showClose | `boolean`    |      | 否   |
| onClose   | `() => void` |      | 是   |
| onOpen    | `() => void` |      | 是   |

## NotificationManager

**Class**

### 成员

| 名称          | 类型 | 描述 | 可选 |
| ------------- | ---- | ---- | ---- |
| notifications | -    |      | 否   |
| nextId        | -    |      | 否   |
| open          | -    |      | 否   |
| close         | -    |      | 否   |
| success       | -    |      | 否   |
| warning       | -    |      | 否   |
| error         | -    |      | 否   |
| info          | -    |      | 否   |
| closeAll      | -    |      | 否   |

## Notification

**Variable**

## PaginationSetupProps

**Interface**

### 成员

| 名称            | 类型                                                         | 描述 | 可选 |
| --------------- | ------------------------------------------------------------ | ---- | ---- |
| current         | `number`                                                     |      | 否   |
| pageSize        | `number`                                                     |      | 否   |
| total           | `number`                                                     |      | 否   |
| pageSizes       | `number[]`                                                   |      | 否   |
| layout          | `string`                                                     |      | 否   |
| background      | `boolean`                                                    |      | 否   |
| simple          | `boolean`                                                    |      | 否   |
| class           | `string`                                                     |      | 否   |
| id              | `string`                                                     |      | 否   |
| ariaLabel       | `string`                                                     |      | 否   |
| ariaDescribedBy | `string`                                                     |      | 否   |
| onChange        | `((current: number, pageSize: number) => void) \| undefined` |      | 否   |
| onSizeChange    | `((size: number) => void) \| undefined`                      |      | 否   |

## Pagination

**Variable**

## Popconfirm

**Variable**

## Progress

**Variable**

## Radio

**Variable**

## RadioGroup

**Variable**

## Rate

**Variable**

## FormatCommand

**Type**

### 签名

```typescript
FormatCommand: | 'bold'
  | 'italic'
  | 'underline'
  | 'strikeThrough'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'indent'
  | 'outdent'
  | 'removeFormat'
```

## RichTextEditor

**Variable**

## Select

**Variable**

## Slider

**Variable**

## Spin

**Variable**

## Step

**Variable**

Step 步骤项组件

## Steps

**Variable**

Steps 步骤条组件

## Switch

**Variable**

Switch 组件

## Table

**Variable**

## TabsType

**Type**

### 签名

```typescript
TabsType: '' | 'card' | 'border-card';
```

## TabPane

**Interface**

### 成员

| 名称     | 类型                | 描述 | 可选 |
| -------- | ------------------- | ---- | ---- |
| props    | `TabPaneSetupProps` |      | 否   |
| children | `VNode[]`           |      | 否   |

## DragState

**Interface**

### 成员

| 名称       | 类型      | 描述 | 可选 |
| ---------- | --------- | ---- | ---- |
| isDragging | `boolean` |      | 否   |
| dragIndex  | `number`  |      | 否   |
| dropIndex  | `number`  |      | 否   |

## TabPane

**Variable**

## Tabs

**Variable**

## Tag

**Variable**

Tag 组件

## Timeline

**Variable**

Timeline 时间轴组件

## TimelineItem

**Variable**

TimelineItem 时间轴项组件

## TimePickerSetupProps

**Interface**

### 成员

| 名称        | 类型                                                                 | 描述 | 可选 |
| ----------- | -------------------------------------------------------------------- | ---- | ---- |
| modelValue  | `string \| [string, string] \| null`                                 |      | 否   |
| placeholder | `string`                                                             |      | 否   |
| disabled    | `boolean`                                                            |      | 否   |
| clearable   | `boolean`                                                            |      | 否   |
| format      | `string`                                                             |      | 否   |
| isRange     | `boolean`                                                            |      | 否   |
| step        | `string`                                                             |      | 否   |
| minTime     | `string`                                                             |      | 否   |
| maxTime     | `string`                                                             |      | 否   |
| class       | `string`                                                             |      | 否   |
| onChange    | `((value: string \| [string, string] \| null) => void) \| undefined` |      | 否   |
| onOpen      | `(() => void) \| undefined`                                          |      | 否   |
| onClose     | `(() => void) \| undefined`                                          |      | 否   |

## TimePicker

**Variable**

## Toast

**Variable**

Toast 组件

## Tooltip

**Variable**

## Transfer

**Variable**

## TransitionSetupProps

**Interface**

### 成员

| 名称     | 类型      | 描述 | 可选 |
| -------- | --------- | ---- | ---- |
| name     | `string`  |      | 否   |
| appear   | `boolean` |      | 否   |
| mode     | `string`  |      | 否   |
| duration | `number`  |      | 否   |
| class    | `string`  |      | 否   |

## TransitionSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## Transition

**Variable**

## TransitionGroupSetupProps

**Interface**

### 成员

| 名称     | 类型     | 描述 | 可选 |
| -------- | -------- | ---- | ---- |
| name     | `string` |      | 否   |
| tag      | `string` |      | 否   |
| duration | `number` |      | 否   |
| class    | `string` |      | 否   |

## TransitionGroupSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## TransitionGroup

**Variable**

## FlattenNode

**Interface**

### 成员

| 名称            | 类型                  | 描述 | 可选 |
| --------------- | --------------------- | ---- | ---- |
| parent          | `FlattenNode \| null` |      | 否   |
| level           | `number`              |      | 否   |
| isLeaf          | `boolean`             |      | 否   |
| isExpanded      | `boolean`             |      | 否   |
| isChecked       | `boolean`             |      | 否   |
| isIndeterminate | `boolean`             |      | 否   |
| isSelected      | `boolean`             |      | 否   |

## Tree

**Variable**

## TreeSelectNode

**Interface**

### 成员

| 名称     | 类型               | 描述 | 可选 |
| -------- | ------------------ | ---- | ---- |
| value    | `string \| number` |      | 否   |
| label    | `string`           |      | 否   |
| children | `TreeSelectNode[]` |      | 是   |
| disabled | `boolean`          |      | 是   |

## TreeSelectSetupProps

**Interface**

### 成员

| 名称                | 类型                                                                     | 描述 | 可选 |
| ------------------- | ------------------------------------------------------------------------ | ---- | ---- |
| data                | `TreeSelectNode[]`                                                       |      | 否   |
| value               | `string \| number`                                                       |      | 否   |
| placeholder         | `string`                                                                 |      | 否   |
| multiple            | `boolean`                                                                |      | 否   |
| clearable           | `boolean`                                                                |      | 否   |
| filterable          | `boolean`                                                                |      | 否   |
| filterPlaceholder   | `string`                                                                 |      | 否   |
| nodeKey             | `string`                                                                 |      | 否   |
| defaultExpandAll    | `boolean`                                                                |      | 否   |
| defaultExpandedKeys | `(string \| number)[]`                                                   |      | 否   |
| class               | `string`                                                                 |      | 否   |
| style               | `string \| Record<string, string>`                                       |      | 否   |
| id                  | `string`                                                                 |      | 否   |
| ariaLabel           | `string`                                                                 |      | 否   |
| ariaDescribedBy     | `string`                                                                 |      | 否   |
| onChange            | `((value: string \| number, node: TreeSelectNode) => void) \| undefined` |      | 否   |

## NodeDict

**Type**

### 签名

```typescript
NodeDict: Record<string, unknown>;
```

## TreeSelect

**Variable**

## ComponentSize

**Type**

### 签名

```typescript
ComponentSize: 'small' | 'medium' | 'large';
```

## ComponentStatus

**Type**

### 签名

```typescript
ComponentStatus: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
```

## Placement

**Type**

### 签名

```typescript
Placement: 'top' | 'bottom' | 'left' | 'right';
```

## Align

**Type**

### 签名

```typescript
Align: 'left' | 'center' | 'right';
```

## Direction

**Type**

### 签名

```typescript
Direction: 'horizontal' | 'vertical';
```

## ContentPosition

**Type**

### 签名

```typescript
ContentPosition: 'left' | 'center' | 'right';
```

## ToastType

**Type**

### 签名

```typescript
ToastType: 'success' | 'warning' | 'info' | 'error';
```

## AlertType

**Type**

### 签名

```typescript
AlertType: 'success' | 'warning' | 'info' | 'error';
```

## TableAlign

**Type**

### 签名

```typescript
TableAlign: 'left' | 'center' | 'right';
```

## TableSortOrder

**Type**

### 签名

```typescript
TableSortOrder: 'ascending' | 'descending' | '';
```

## NativeType

**Type**

### 签名

```typescript
NativeType: 'button' | 'submit' | 'reset';
```

## Target

**Type**

### 签名

```typescript
Target: '_blank' | '_self' | '_parent' | '_top';
```

## ButtonNativeType

**Type**

### 签名

```typescript
ButtonNativeType: 'button' | 'submit' | 'reset';
```

## ButtonSetupProps

**Interface**

### 成员

| 名称            | 类型                             | 描述 | 可选 |
| --------------- | -------------------------------- | ---- | ---- |
| type            | `ComponentStatus`                |      | 否   |
| size            | `ComponentSize`                  |      | 否   |
| disabled        | `boolean`                        |      | 否   |
| loading         | `boolean`                        |      | 否   |
| plain           | `boolean`                        |      | 否   |
| round           | `boolean`                        |      | 否   |
| circle          | `boolean`                        |      | 否   |
| nativeType      | `ButtonNativeType`               |      | 否   |
| class           | `string`                         |      | 否   |
| style           | `string`                         |      | 否   |
| ariaLabel       | `string`                         |      | 否   |
| ariaDescribedBy | `string`                         |      | 否   |
| tabIndex        | `number`                         |      | 是   |
| onClick         | `(event: MouseEvent) => void`    |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void` |      | 是   |

## ButtonProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| type            | `ComponentStatus`                  |      | 是   |
| size            | `ComponentSize`                    |      | 是   |
| disabled        | `boolean`                          |      | 是   |
| loading         | `boolean`                          |      | 是   |
| plain           | `boolean`                          |      | 是   |
| round           | `boolean`                          |      | 是   |
| circle          | `boolean`                          |      | 是   |
| nativeType      | `ButtonNativeType`                 |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| tabIndex        | `number`                           |      | 是   |
| onClick         | `(event: MouseEvent) => void`      |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`   |      | 是   |

## ButtonSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| loading | `() => VNode[]` |      | 是   |
| icon    | `() => VNode[]` |      | 是   |

## InputSetupProps

**Interface**

### 成员

| 名称            | 类型                          | 描述 | 可选 |
| --------------- | ----------------------------- | ---- | ---- |
| modelValue      | `string \| number`            |      | 否   |
| type            | `string`                      |      | 否   |
| placeholder     | `string`                      |      | 否   |
| disabled        | `boolean`                     |      | 否   |
| readonly        | `boolean`                     |      | 否   |
| clearable       | `boolean`                     |      | 否   |
| showPassword    | `boolean`                     |      | 否   |
| maxlength       | `number`                      |      | 是   |
| minlength       | `number`                      |      | 是   |
| size            | `ComponentSize`               |      | 否   |
| prefixIcon      | `string`                      |      | 否   |
| suffixIcon      | `string`                      |      | 否   |
| class           | `string`                      |      | 否   |
| style           | `string`                      |      | 否   |
| ariaLabel       | `string`                      |      | 否   |
| ariaDescribedBy | `string`                      |      | 否   |
| ariaInvalid     | `boolean`                     |      | 否   |
| ariaRequired    | `boolean`                     |      | 否   |
| autocomplete    | `string`                      |      | 否   |
| name            | `string`                      |      | 否   |
| id              | `string`                      |      | 否   |
| tabIndex        | `number`                      |      | 是   |
| onInput         | `(value: string) => void`     |      | 是   |
| onChange        | `(value: string) => void`     |      | 是   |
| onFocus         | `(event: FocusEvent) => void` |      | 是   |
| onBlur          | `(event: FocusEvent) => void` |      | 是   |
| onClear         | `() => void`                  |      | 是   |

## InputProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `string \| number`                 |      | 是   |
| type            | `string`                           |      | 是   |
| placeholder     | `string`                           |      | 是   |
| disabled        | `boolean`                          |      | 是   |
| readonly        | `boolean`                          |      | 是   |
| clearable       | `boolean`                          |      | 是   |
| showPassword    | `boolean`                          |      | 是   |
| maxlength       | `number`                           |      | 是   |
| minlength       | `number`                           |      | 是   |
| size            | `ComponentSize`                    |      | 是   |
| prefixIcon      | `string`                           |      | 是   |
| suffixIcon      | `string`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| ariaInvalid     | `boolean`                          |      | 是   |
| ariaRequired    | `boolean`                          |      | 是   |
| autocomplete    | `string`                           |      | 是   |
| name            | `string`                           |      | 是   |
| id              | `string`                           |      | 是   |
| tabIndex        | `number`                           |      | 是   |
| onInput         | `(value: string) => void`          |      | 是   |
| onChange        | `(value: string) => void`          |      | 是   |
| onFocus         | `(event: FocusEvent) => void`      |      | 是   |
| onBlur          | `(event: FocusEvent) => void`      |      | 是   |
| onClear         | `() => void`                       |      | 是   |

## InputSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| prefix  | `() => VNode[]` |      | 是   |
| suffix  | `() => VNode[]` |      | 是   |
| prepend | `() => VNode[]` |      | 是   |
| append  | `() => VNode[]` |      | 是   |

## DialogSetupProps

**Interface**

### 成员

| 名称               | 类型                                                | 描述 | 可选 |
| ------------------ | --------------------------------------------------- | ---- | ---- |
| modelValue         | `boolean`                                           |      | 否   |
| title              | `string`                                            |      | 否   |
| width              | `string \| number`                                  |      | 否   |
| showClose          | `boolean`                                           |      | 否   |
| closeOnClickModal  | `boolean`                                           |      | 否   |
| closeOnPressEscape | `boolean`                                           |      | 否   |
| lockScroll         | `boolean`                                           |      | 否   |
| class              | `string`                                            |      | 否   |
| onBeforeOpen       | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onBeforeClose      | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onOpen             | `() => void`                                        |      | 是   |
| onClose            | `() => void`                                        |      | 是   |
| onConfirm          | `() => void`                                        |      | 是   |
| onCancel           | `() => void`                                        |      | 是   |

## DialogProps

**Interface**

### 成员

| 名称               | 类型                                                | 描述 | 可选 |
| ------------------ | --------------------------------------------------- | ---- | ---- |
| modelValue         | `boolean`                                           |      | 是   |
| title              | `string`                                            |      | 是   |
| width              | `string \| number`                                  |      | 是   |
| showClose          | `boolean`                                           |      | 是   |
| closeOnClickModal  | `boolean`                                           |      | 是   |
| closeOnPressEscape | `boolean`                                           |      | 是   |
| lockScroll         | `boolean`                                           |      | 是   |
| class              | `string`                                            |      | 是   |
| style              | `string \| Record<string, string>`                  |      | 是   |
| id                 | `string`                                            |      | 是   |
| ariaLabel          | `string`                                            |      | 是   |
| ariaDescribedBy    | `string`                                            |      | 是   |
| ariaModal          | `boolean`                                           |      | 是   |
| onBeforeOpen       | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onBeforeClose      | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onOpen             | `() => void`                                        |      | 是   |
| onClose            | `() => void`                                        |      | 是   |
| onConfirm          | `() => void`                                        |      | 是   |
| onCancel           | `() => void`                                        |      | 是   |
| onKeydown          | `(event: KeyboardEvent) => void`                    |      | 是   |

## DialogSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| header  | `() => VNode[]` |      | 是   |
| default | `() => VNode[]` |      | 是   |
| footer  | `() => VNode[]` |      | 是   |

## DialogSetupProps

**Interface**

### 成员

| 名称               | 类型                                                | 描述 | 可选 |
| ------------------ | --------------------------------------------------- | ---- | ---- |
| modelValue         | `boolean`                                           |      | 否   |
| title              | `string`                                            |      | 否   |
| width              | `string \| number`                                  |      | 否   |
| showClose          | `boolean`                                           |      | 否   |
| closeOnClickModal  | `boolean`                                           |      | 否   |
| closeOnPressEscape | `boolean`                                           |      | 否   |
| lockScroll         | `boolean`                                           |      | 否   |
| class              | `string`                                            |      | 否   |
| id                 | `string`                                            |      | 否   |
| ariaLabel          | `string`                                            |      | 否   |
| ariaDescribedBy    | `string`                                            |      | 否   |
| ariaModal          | `boolean`                                           |      | 否   |
| onBeforeOpen       | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onBeforeClose      | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onOpen             | `() => void`                                        |      | 是   |
| onClose            | `() => void`                                        |      | 是   |
| onConfirm          | `() => void`                                        |      | 是   |
| onCancel           | `() => void`                                        |      | 是   |
| onKeydown          | `(event: KeyboardEvent) => void`                    |      | 是   |

## ModalProps

**Interface**

### 成员

| 名称               | 类型                                                | 描述 | 可选 |
| ------------------ | --------------------------------------------------- | ---- | ---- |
| modelValue         | `boolean`                                           |      | 是   |
| title              | `string`                                            |      | 是   |
| width              | `string \| number`                                  |      | 是   |
| top                | `string`                                            |      | 是   |
| showClose          | `boolean`                                           |      | 是   |
| closeOnClickModal  | `boolean`                                           |      | 是   |
| closeOnPressEscape | `boolean`                                           |      | 是   |
| lockScroll         | `boolean`                                           |      | 是   |
| draggable          | `boolean`                                           |      | 是   |
| fullscreen         | `boolean`                                           |      | 是   |
| appendToBody       | `boolean`                                           |      | 是   |
| customClass        | `string`                                            |      | 是   |
| class              | `string`                                            |      | 是   |
| id                 | `string`                                            |      | 是   |
| ariaLabel          | `string`                                            |      | 是   |
| ariaDescribedBy    | `string`                                            |      | 是   |
| ariaModal          | `boolean`                                           |      | 是   |
| onBeforeOpen       | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onBeforeClose      | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onOpen             | `() => void`                                        |      | 是   |
| onClose            | `() => void`                                        |      | 是   |
| onConfirm          | `() => void`                                        |      | 是   |
| onCancel           | `() => void`                                        |      | 是   |
| onKeydown          | `(event: KeyboardEvent) => void`                    |      | 是   |

## ModalSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| header  | `() => VNode[]` |      | 是   |
| default | `() => VNode[]` |      | 是   |
| footer  | `() => VNode[]` |      | 是   |

## ModalSetupProps

**Interface**

### 成员

| 名称               | 类型                                                | 描述 | 可选 |
| ------------------ | --------------------------------------------------- | ---- | ---- |
| modelValue         | `boolean`                                           |      | 否   |
| title              | `string`                                            |      | 否   |
| width              | `string \| number`                                  |      | 否   |
| top                | `string`                                            |      | 否   |
| showClose          | `boolean`                                           |      | 否   |
| closeOnClickModal  | `boolean`                                           |      | 否   |
| closeOnPressEscape | `boolean`                                           |      | 否   |
| lockScroll         | `boolean`                                           |      | 否   |
| draggable          | `boolean`                                           |      | 否   |
| fullscreen         | `boolean`                                           |      | 否   |
| appendToBody       | `boolean`                                           |      | 否   |
| customClass        | `string`                                            |      | 否   |
| class              | `string`                                            |      | 否   |
| id                 | `string`                                            |      | 否   |
| ariaLabel          | `string`                                            |      | 否   |
| ariaDescribedBy    | `string`                                            |      | 否   |
| ariaModal          | `boolean`                                           |      | 否   |
| onBeforeOpen       | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onBeforeClose      | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onOpen             | `() => void`                                        |      | 是   |
| onClose            | `() => void`                                        |      | 是   |
| onConfirm          | `() => void`                                        |      | 是   |
| onCancel           | `() => void`                                        |      | 是   |
| onKeydown          | `(event: KeyboardEvent) => void`                    |      | 是   |

## SelectOption

**Interface**

### 成员

| 名称     | 类型               | 描述 | 可选 |
| -------- | ------------------ | ---- | ---- |
| label    | `string`           |      | 否   |
| value    | `string \| number` |      | 否   |
| disabled | `boolean`          |      | 是   |

## SelectSetupProps

**Interface**

### 成员

| 名称            | 类型                                                        | 描述 | 可选 |
| --------------- | ----------------------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| (string \| number)[]`                  |      | 否   |
| options         | `SelectOption[]`                                            |      | 否   |
| placeholder     | `string`                                                    |      | 否   |
| disabled        | `boolean`                                                   |      | 否   |
| clearable       | `boolean`                                                   |      | 否   |
| multiple        | `boolean`                                                   |      | 否   |
| size            | `ComponentSize`                                             |      | 否   |
| class           | `string`                                                    |      | 否   |
| id              | `string`                                                    |      | 否   |
| ariaLabel       | `string`                                                    |      | 否   |
| ariaDescribedBy | `string`                                                    |      | 否   |
| ariaInvalid     | `boolean`                                                   |      | 否   |
| ariaRequired    | `boolean`                                                   |      | 否   |
| tabIndex        | `number`                                                    |      | 是   |
| onChange        | `(value: string \| number \| (string \| number)[]) => void` |      | 是   |
| onClear         | `() => void`                                                |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`                            |      | 是   |
| onVisibleChange | `(visible: boolean) => void`                                |      | 是   |

## SelectProps

**Interface**

### 成员

| 名称            | 类型                                                        | 描述 | 可选 |
| --------------- | ----------------------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| (string \| number)[]`                  |      | 是   |
| options         | `SelectOption[]`                                            |      | 是   |
| placeholder     | `string`                                                    |      | 是   |
| disabled        | `boolean`                                                   |      | 是   |
| clearable       | `boolean`                                                   |      | 是   |
| multiple        | `boolean`                                                   |      | 是   |
| size            | `ComponentSize`                                             |      | 是   |
| class           | `string`                                                    |      | 是   |
| style           | `string \| Record<string, string>`                          |      | 是   |
| id              | `string`                                                    |      | 是   |
| ariaLabel       | `string`                                                    |      | 是   |
| ariaDescribedBy | `string`                                                    |      | 是   |
| ariaInvalid     | `boolean`                                                   |      | 是   |
| ariaRequired    | `boolean`                                                   |      | 是   |
| tabIndex        | `number`                                                    |      | 是   |
| onChange        | `(value: string \| number \| (string \| number)[]) => void` |      | 是   |
| onClear         | `() => void`                                                |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`                            |      | 是   |
| onVisibleChange | `(visible: boolean) => void`                                |      | 是   |

## SelectSlots

**Interface**

### 成员

| 名称    | 类型                                | 描述 | 可选 |
| ------- | ----------------------------------- | ---- | ---- |
| default | `() => VNode[]`                     |      | 是   |
| option  | `(option: SelectOption) => VNode[]` |      | 是   |
| empty   | `() => VNode[]`                     |      | 是   |

## TabPaneSetupProps

**Interface**

### 成员

| 名称     | 类型      | 描述 | 可选 |
| -------- | --------- | ---- | ---- |
| label    | `string`  |      | 否   |
| name     | `string`  |      | 否   |
| disabled | `boolean` |      | 否   |
| closable | `boolean` |      | 否   |

## TabPaneSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## TabPaneProps

**Interface**

### 成员

| 名称     | 类型      | 描述 | 可选 |
| -------- | --------- | ---- | ---- |
| label    | `string`  |      | 否   |
| name     | `string`  |      | 否   |
| disabled | `boolean` |      | 是   |
| closable | `boolean` |      | 是   |

## TabsSetupProps

**Interface**

### 成员

| 名称            | 类型                                                                             | 描述 | 可选 |
| --------------- | -------------------------------------------------------------------------------- | ---- | ---- |
| modelValue      | `string`                                                                         |      | 否   |
| type            | `'' \| 'card' \| 'border-card'`                                                  |      | 否   |
| closable        | `boolean`                                                                        |      | 否   |
| addable         | `boolean`                                                                        |      | 否   |
| editable        | `boolean`                                                                        |      | 否   |
| draggable       | `boolean`                                                                        |      | 否   |
| class           | `string`                                                                         |      | 否   |
| style           | `string \| Record<string, string>`                                               |      | 是   |
| id              | `string`                                                                         |      | 否   |
| ariaLabel       | `string`                                                                         |      | 否   |
| ariaDescribedBy | `string`                                                                         |      | 否   |
| onChange        | `(name: string) => void`                                                         |      | 是   |
| onTabClick      | `(pane: { props: TabPaneSetupProps; children: VNode[] }, index: number) => void` |      | 是   |
| onTabRemove     | `(name: string) => void`                                                         |      | 是   |
| onTabAdd        | `() => void`                                                                     |      | 是   |
| onTabDragStart  | `(index: number) => void`                                                        |      | 是   |
| onTabDragEnd    | `(fromIndex: number, toIndex: number) => void`                                   |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`                                                 |      | 是   |

## TabsProps

**Interface**

### 成员

| 名称            | 类型                                                                        | 描述 | 可选 |
| --------------- | --------------------------------------------------------------------------- | ---- | ---- |
| modelValue      | `string`                                                                    |      | 是   |
| type            | `'card' \| 'border-card'`                                                   |      | 是   |
| class           | `string`                                                                    |      | 是   |
| style           | `string \| Record<string, string>`                                          |      | 是   |
| closable        | `boolean`                                                                   |      | 是   |
| addable         | `boolean`                                                                   |      | 是   |
| editable        | `boolean`                                                                   |      | 是   |
| draggable       | `boolean`                                                                   |      | 是   |
| id              | `string`                                                                    |      | 是   |
| ariaLabel       | `string`                                                                    |      | 是   |
| ariaDescribedBy | `string`                                                                    |      | 是   |
| onChange        | `(name: string) => void`                                                    |      | 是   |
| onTabClick      | `(pane: { props: TabPaneProps; children: VNode[] }, index: number) => void` |      | 是   |
| onTabRemove     | `(name: string) => void`                                                    |      | 是   |
| onTabAdd        | `() => void`                                                                |      | 是   |
| onTabDragStart  | `(index: number) => void`                                                   |      | 是   |
| onTabDragEnd    | `(fromIndex: number, toIndex: number) => void`                              |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`                                            |      | 是   |

## TabsSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## CascaderOption

**Interface**

### 成员

| 名称     | 类型               | 描述 | 可选 |
| -------- | ------------------ | ---- | ---- |
| value    | `string \| number` |      | 否   |
| label    | `string`           |      | 否   |
| children | `CascaderOption[]` |      | 是   |
| disabled | `boolean`          |      | 是   |
| isLeaf   | `boolean`          |      | 是   |
| loading  | `boolean`          |      | 是   |

## CascaderSetupProps

**Interface**

### 成员

| 名称            | 类型                                                                            | 描述 | 可选 |
| --------------- | ------------------------------------------------------------------------------- | ---- | ---- |
| options         | `CascaderOption[]`                                                              |      | 否   |
| modelValue      | `(string \| number)[] \| Array<(string \| number)[]>`                           |      | 否   |
| placeholder     | `string`                                                                        |      | 否   |
| disabled        | `boolean`                                                                       |      | 否   |
| clearable       | `boolean`                                                                       |      | 否   |
| multiple        | `boolean`                                                                       |      | 否   |
| filterable      | `boolean`                                                                       |      | 否   |
| checkStrictly   | `boolean`                                                                       |      | 否   |
| showAllLevels   | `boolean`                                                                       |      | 否   |
| collapseTags    | `boolean`                                                                       |      | 否   |
| separator       | `string`                                                                        |      | 否   |
| class           | `string`                                                                        |      | 否   |
| id              | `string`                                                                        |      | 否   |
| ariaLabel       | `string`                                                                        |      | 否   |
| ariaDescribedBy | `string`                                                                        |      | 否   |
| load            | `(node: CascaderOption, resolve: (children: CascaderOption[]) => void) => void` |      | 是   |
| onChange        | `(value: (string \| number)[] \| Array<(string \| number)[]>) => void`          |      | 是   |
| onExpandChange  | `(value: (string \| number)[]) => void`                                         |      | 是   |
| onVisibleChange | `(visible: boolean) => void`                                                    |      | 是   |
| onRemoveTag     | `(value: Array<(string \| number)[]>) => void`                                  |      | 是   |
| onClear         | `() => void`                                                                    |      | 是   |

## CascaderProps

**Interface**

### 成员

| 名称            | 类型                                                                            | 描述 | 可选 |
| --------------- | ------------------------------------------------------------------------------- | ---- | ---- |
| options         | `CascaderOption[]`                                                              |      | 是   |
| modelValue      | `(string \| number)[] \| Array<(string \| number)[]>`                           |      | 是   |
| placeholder     | `string`                                                                        |      | 是   |
| disabled        | `boolean`                                                                       |      | 是   |
| clearable       | `boolean`                                                                       |      | 是   |
| multiple        | `boolean`                                                                       |      | 是   |
| filterable      | `boolean`                                                                       |      | 是   |
| checkStrictly   | `boolean`                                                                       |      | 是   |
| showAllLevels   | `boolean`                                                                       |      | 是   |
| collapseTags    | `boolean`                                                                       |      | 是   |
| separator       | `string`                                                                        |      | 是   |
| class           | `string`                                                                        |      | 是   |
| style           | `string \| Record<string, string>`                                              |      | 是   |
| id              | `string`                                                                        |      | 是   |
| ariaLabel       | `string`                                                                        |      | 是   |
| ariaDescribedBy | `string`                                                                        |      | 是   |
| load            | `(node: CascaderOption, resolve: (children: CascaderOption[]) => void) => void` |      | 是   |
| onChange        | `(value: (string \| number)[] \| Array<(string \| number)[]>) => void`          |      | 是   |
| onExpandChange  | `(value: (string \| number)[]) => void`                                         |      | 是   |
| onVisibleChange | `(visible: boolean) => void`                                                    |      | 是   |
| onRemoveTag     | `(value: (string \| number)[]) => void`                                         |      | 是   |
| onClear         | `() => void`                                                                    |      | 是   |

## CascaderSlots

**Interface**

### 成员

| 名称    | 类型                                  | 描述 | 可选 |
| ------- | ------------------------------------- | ---- | ---- |
| default | `(option: CascaderOption) => VNode[]` |      | 是   |
| empty   | `() => VNode[]`                       |      | 是   |

## DatePickerType

**Type**

### 签名

```typescript
DatePickerType: 'date' | 'datetime' | 'daterange' | 'datetimerange';
```

## DatePickerShortcut

**Interface**

### 成员

| 名称    | 类型             | 描述 | 可选 |
| ------- | ---------------- | ---- | ---- |
| text    | `string`         |      | 否   |
| value   | `Date \| Date[]` |      | 否   |
| onClick | `() => void`     |      | 是   |

## DatePickerSetupProps

**Interface**

### 成员

| 名称         | 类型                                                            | 描述 | 可选 |
| ------------ | --------------------------------------------------------------- | ---- | ---- |
| modelValue   | `string \| Date \| (string \| Date)[] \| null`                  |      | 否   |
| placeholder  | `string`                                                        |      | 否   |
| disabled     | `boolean`                                                       |      | 否   |
| clearable    | `boolean`                                                       |      | 否   |
| format       | `string`                                                        |      | 否   |
| type         | `DatePickerType`                                                |      | 否   |
| disabledDate | `(date: Date) => boolean`                                       |      | 是   |
| shortcuts    | `DatePickerShortcut[]`                                          |      | 否   |
| class        | `string`                                                        |      | 否   |
| onChange     | `(value: string \| Date \| (string \| Date)[] \| null) => void` |      | 是   |
| onOpen       | `() => void`                                                    |      | 是   |
| onClose      | `() => void`                                                    |      | 是   |

## DatePickerProps

**Interface**

### 成员

| 名称         | 类型                                                            | 描述 | 可选 |
| ------------ | --------------------------------------------------------------- | ---- | ---- |
| modelValue   | `string \| Date \| (string \| Date)[] \| null`                  |      | 是   |
| placeholder  | `string`                                                        |      | 是   |
| disabled     | `boolean`                                                       |      | 是   |
| clearable    | `boolean`                                                       |      | 是   |
| format       | `string`                                                        |      | 是   |
| type         | `DatePickerType`                                                |      | 是   |
| disabledDate | `(date: Date) => boolean`                                       |      | 是   |
| shortcuts    | `DatePickerShortcut[]`                                          |      | 是   |
| class        | `string`                                                        |      | 是   |
| style        | `string \| Record<string, string>`                              |      | 是   |
| onChange     | `(value: string \| Date \| (string \| Date)[] \| null) => void` |      | 是   |
| onOpen       | `() => void`                                                    |      | 是   |
| onClose      | `() => void`                                                    |      | 是   |

## DatePickerSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| footer  | `() => VNode[]` |      | 是   |

## TableColumn

**Interface**

### 成员

| 名称      | 类型                                                                     | 描述 | 可选 |
| --------- | ------------------------------------------------------------------------ | ---- | ---- |
| prop      | `string`                                                                 |      | 是   |
| label     | `string`                                                                 |      | 否   |
| width     | `string \| number`                                                       |      | 是   |
| align     | `TableAlign`                                                             |      | 是   |
| sortable  | `boolean`                                                                |      | 是   |
| formatter | `(row: TableRowData, column: TableColumn, cellValue: unknown) => string` |      | 是   |

## TableRowData

**Type**

### 签名

```typescript
TableRowData: Record<string, unknown>;
```

## TableData

**Type**

### 签名

```typescript
TableData: TableRowData[]
```

## TableSortCallback

**Type**

### 签名

```typescript
TableSortCallback: (column: TableColumn, prop: string, order: TableSortOrder) => void
```

## TableRowClickCallback

**Type**

### 签名

```typescript
TableRowClickCallback: (row: TableRowData, index: number) => void
```

## TableSetupProps

**Interface**

### 成员

| 名称                | 类型                        | 描述 | 可选 |
| ------------------- | --------------------------- | ---- | ---- |
| data                | `TableData`                 |      | 否   |
| columns             | `TableColumn[]`             |      | 否   |
| stripe              | `boolean`                   |      | 否   |
| border              | `boolean`                   |      | 否   |
| rowKey              | `string`                    |      | 否   |
| showSelection       | `boolean`                   |      | 否   |
| highlightCurrentRow | `boolean`                   |      | 否   |
| class               | `string`                    |      | 否   |
| id                  | `string`                    |      | 否   |
| ariaLabel           | `string`                    |      | 否   |
| ariaDescribedBy     | `string`                    |      | 否   |
| onRowClick          | `TableRowClickCallback`     |      | 是   |
| onSortChange        | `TableSortCallback`         |      | 是   |
| onSelectionChange   | `(rows: TableData) => void` |      | 是   |

## TableProps

**Interface**

### 成员

| 名称                | 类型                               | 描述 | 可选 |
| ------------------- | ---------------------------------- | ---- | ---- |
| data                | `TableData`                        |      | 是   |
| columns             | `TableColumn[]`                    |      | 是   |
| stripe              | `boolean`                          |      | 是   |
| border              | `boolean`                          |      | 是   |
| height              | `string \| number`                 |      | 是   |
| maxHeight           | `string \| number`                 |      | 是   |
| rowKey              | `string`                           |      | 是   |
| showSelection       | `boolean`                          |      | 是   |
| highlightCurrentRow | `boolean`                          |      | 是   |
| class               | `string`                           |      | 是   |
| style               | `string \| Record<string, string>` |      | 是   |
| id                  | `string`                           |      | 是   |
| ariaLabel           | `string`                           |      | 是   |
| ariaDescribedBy     | `string`                           |      | 是   |
| onRowClick          | `TableRowClickCallback`            |      | 是   |
| onSortChange        | `TableSortCallback`                |      | 是   |
| onSelectionChange   | `(rows: TableData) => void`        |      | 是   |

## TableSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| empty   | `() => VNode[]` |      | 是   |

## IconProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| name            | `string`                           |      | 是   |
| size            | `string`                           |      | 是   |
| color           | `string`                           |      | 是   |
| spin            | `boolean`                          |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## IconSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| name            | `string`                           |      | 是   |
| size            | `string`                           |      | 是   |
| color           | `string`                           |      | 是   |
| spin            | `boolean`                          |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## IconSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## BadgeProps

**Interface**

### 成员

| 名称     | 类型                               | 描述 | 可选 |
| -------- | ---------------------------------- | ---- | ---- |
| count    | `number`                           |      | 是   |
| maxCount | `number`                           |      | 是   |
| dot      | `boolean`                          |      | 是   |
| showZero | `boolean`                          |      | 是   |
| type     | `ComponentStatus`                  |      | 是   |
| offset   | `[number, number]`                 |      | 是   |
| class    | `string`                           |      | 是   |
| style    | `string \| Record<string, string>` |      | 是   |

## BadgeSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## BadgeSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| count           | `number`                           |      | 否   |
| maxCount        | `number`                           |      | 否   |
| dot             | `boolean`                          |      | 否   |
| showZero        | `boolean`                          |      | 否   |
| type            | `string`                           |      | 否   |
| offset          | `number[]`                         |      | 是   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |

## TagProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| type            | `ComponentStatus`                  |      | 是   |
| closable        | `boolean`                          |      | 是   |
| color           | `string`                           |      | 是   |
| size            | `ComponentSize`                    |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| onClose         | `() => void`                       |      | 是   |

## TagSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## TagSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| type            | `ComponentStatus`                  |      | 否   |
| closable        | `boolean`                          |      | 否   |
| color           | `string`                           |      | 否   |
| size            | `ComponentSize`                    |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |
| onClose         | `() => void`                       |      | 是   |

## SpinProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| spinning        | `boolean`                          |      | 是   |
| size            | `'small' \| 'default' \| 'large'`  |      | 是   |
| tip             | `string`                           |      | 是   |
| delay           | `number`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## SpinSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| spinning        | `boolean`                          |      | 是   |
| size            | `'small' \| 'default' \| 'large'`  |      | 是   |
| tip             | `string`                           |      | 是   |
| delay           | `number`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## SpinSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| tip     | `() => VNode[]` |      | 是   |

## EmptyProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| description     | `string`                           |      | 是   |
| image           | `string`                           |      | 是   |
| imageSize       | `number`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## EmptySetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| description     | `string`                           |      | 是   |
| image           | `string`                           |      | 是   |
| imageSize       | `number`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## EmptySlots

**Interface**

### 成员

| 名称        | 类型            | 描述 | 可选 |
| ----------- | --------------- | ---- | ---- |
| default     | `() => VNode[]` |      | 是   |
| image       | `() => VNode[]` |      | 是   |
| description | `() => VNode[]` |      | 是   |

## LinkProps

**Interface**

### 成员

| 名称            | 类型                                         | 描述 | 可选 |
| --------------- | -------------------------------------------- | ---- | ---- |
| type            | `ComponentStatus`                            |      | 是   |
| disabled        | `boolean`                                    |      | 是   |
| underline       | `boolean`                                    |      | 是   |
| href            | `string`                                     |      | 是   |
| target          | `'_blank' \| '_self' \| '_parent' \| '_top'` |      | 是   |
| class           | `string`                                     |      | 是   |
| style           | `string \| Record<string, string>`           |      | 是   |
| id              | `string`                                     |      | 是   |
| ariaLabel       | `string`                                     |      | 是   |
| ariaDescribedBy | `string`                                     |      | 是   |
| onClick         | `(event: MouseEvent) => void`                |      | 是   |

## LinkSetupProps

**Interface**

### 成员

| 名称            | 类型                                         | 描述 | 可选 |
| --------------- | -------------------------------------------- | ---- | ---- |
| type            | `ComponentStatus`                            |      | 是   |
| disabled        | `boolean`                                    |      | 是   |
| underline       | `boolean`                                    |      | 是   |
| href            | `string`                                     |      | 是   |
| target          | `'_blank' \| '_self' \| '_parent' \| '_top'` |      | 是   |
| class           | `string`                                     |      | 是   |
| style           | `string \| Record<string, string>`           |      | 是   |
| id              | `string`                                     |      | 是   |
| ariaLabel       | `string`                                     |      | 是   |
| ariaDescribedBy | `string`                                     |      | 是   |
| onClick         | `(event: MouseEvent) => void`                |      | 是   |

## LinkSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## ContainerProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| fluid           | `boolean`                          |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## ContainerSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## DividerProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| type            | `'horizontal' \| 'vertical'`       |      | 是   |
| contentPosition | `'left' \| 'center' \| 'right'`    |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## DividerSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| type            | `'horizontal' \| 'vertical'`       |      | 是   |
| contentPosition | `'left' \| 'center' \| 'right'`    |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## DividerSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## ToastProps

**Interface**

### 成员

| 名称            | 类型                                          | 描述 | 可选 |
| --------------- | --------------------------------------------- | ---- | ---- |
| type            | `'success' \| 'warning' \| 'info' \| 'error'` |      | 是   |
| message         | `string`                                      |      | 是   |
| duration        | `number`                                      |      | 是   |
| showClose       | `boolean`                                     |      | 是   |
| class           | `string`                                      |      | 是   |
| style           | `string \| Record<string, string>`            |      | 是   |
| id              | `string`                                      |      | 是   |
| ariaLabel       | `string`                                      |      | 是   |
| ariaDescribedBy | `string`                                      |      | 是   |
| onClose         | `() => void`                                  |      | 是   |

## ToastSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## ToastSetupProps

**Interface**

### 成员

| 名称            | 类型                                          | 描述 | 可选 |
| --------------- | --------------------------------------------- | ---- | ---- |
| message         | `string`                                      |      | 否   |
| type            | `'success' \| 'warning' \| 'info' \| 'error'` |      | 否   |
| duration        | `number`                                      |      | 否   |
| position        | `string`                                      |      | 否   |
| icon            | `string`                                      |      | 否   |
| closable        | `boolean`                                     |      | 否   |
| class           | `string`                                      |      | 否   |
| id              | `string`                                      |      | 否   |
| ariaLabel       | `string`                                      |      | 否   |
| ariaDescribedBy | `string`                                      |      | 否   |
| style           | `string \| Record<string, string>`            |      | 是   |
| onClose         | `() => void`                                  |      | 是   |

## FormValidateStatus

**Type**

### 签名

```typescript
FormValidateStatus: 'success' | 'error' | 'validating' | '';
```

## FormRule

**Interface**

### 成员

| 名称           | 类型                                                                                                     | 描述 | 可选 |
| -------------- | -------------------------------------------------------------------------------------------------------- | ---- | ---- |
| required       | `boolean`                                                                                                |      | 是   |
| message        | `string`                                                                                                 |      | 是   |
| pattern        | `RegExp`                                                                                                 |      | 是   |
| validator      | `( value: unknown, model: Record<string, unknown>, ) => boolean \| string \| Promise<boolean \| string>` |      | 是   |
| asyncValidator | `(value: unknown, model: Record<string, unknown>) => Promise<boolean \| string>`                         |      | 是   |
| min            | `number`                                                                                                 |      | 是   |
| max            | `number`                                                                                                 |      | 是   |
| type           | `'string' \| 'number' \| 'boolean' \| 'array' \| 'date' \| 'email' \| 'url'`                             |      | 是   |
| trigger        | `'blur' \| 'change' \| ''`                                                                               |      | 是   |

## FormRules

**Interface**

## FormSetupProps

**Interface**

### 成员

| 名称            | 类型                                      | 描述 | 可选 |
| --------------- | ----------------------------------------- | ---- | ---- |
| model           | `Record<string, unknown>`                 |      | 否   |
| rules           | `FormRules`                               |      | 否   |
| labelWidth      | `string`                                  |      | 否   |
| labelPosition   | `'left' \| 'right' \| 'top'`              |      | 否   |
| class           | `string`                                  |      | 否   |
| id              | `string`                                  |      | 否   |
| ariaLabel       | `string`                                  |      | 否   |
| ariaDescribedBy | `string`                                  |      | 否   |
| onSubmit        | `(data: Record<string, unknown>) => void` |      | 是   |

## FormProps

**Interface**

### 成员

| 名称            | 类型                                      | 描述 | 可选 |
| --------------- | ----------------------------------------- | ---- | ---- |
| model           | `Record<string, unknown>`                 |      | 是   |
| rules           | `FormRules`                               |      | 是   |
| labelWidth      | `string`                                  |      | 是   |
| labelPosition   | `'left' \| 'right' \| 'top'`              |      | 是   |
| class           | `string`                                  |      | 是   |
| style           | `string \| Record<string, string>`        |      | 是   |
| id              | `string`                                  |      | 是   |
| ariaLabel       | `string`                                  |      | 是   |
| ariaDescribedBy | `string`                                  |      | 是   |
| onSubmit        | `(data: Record<string, unknown>) => void` |      | 是   |

## FormSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## FormItemSetupProps

**Interface**

### 成员

| 名称            | 类型                 | 描述 | 可选 |
| --------------- | -------------------- | ---- | ---- |
| label           | `string`             |      | 否   |
| prop            | `string`             |      | 否   |
| required        | `boolean`            |      | 否   |
| rules           | `FormRule[]`         |      | 否   |
| error           | `string`             |      | 否   |
| validateStatus  | `FormValidateStatus` |      | 否   |
| id              | `string`             |      | 否   |
| ariaLabel       | `string`             |      | 否   |
| ariaDescribedBy | `string`             |      | 否   |

## FormItemProps

**Interface**

### 成员

| 名称            | 类型                 | 描述 | 可选 |
| --------------- | -------------------- | ---- | ---- |
| label           | `string`             |      | 是   |
| prop            | `string`             |      | 是   |
| required        | `boolean`            |      | 是   |
| rules           | `FormRule[]`         |      | 是   |
| error           | `string`             |      | 是   |
| validateStatus  | `FormValidateStatus` |      | 是   |
| id              | `string`             |      | 是   |
| ariaLabel       | `string`             |      | 是   |
| ariaDescribedBy | `string`             |      | 是   |

## FormItemSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| label   | `() => VNode[]` |      | 是   |
| error   | `() => VNode[]` |      | 是   |

## MenuItem

**Interface**

### 成员

| 名称     | 类型         | 描述 | 可选 |
| -------- | ------------ | ---- | ---- |
| index    | `string`     |      | 否   |
| label    | `string`     |      | 否   |
| icon     | `string`     |      | 是   |
| disabled | `boolean`    |      | 是   |
| children | `MenuItem[]` |      | 是   |

## MenuSetupProps

**Interface**

### 成员

| 名称            | 类型                         | 描述 | 可选 |
| --------------- | ---------------------------- | ---- | ---- |
| mode            | `'horizontal' \| 'vertical'` |      | 否   |
| defaultActive   | `string`                     |      | 否   |
| defaultOpeneds  | `string[]`                   |      | 否   |
| uniqueOpened    | `boolean`                    |      | 否   |
| class           | `string`                     |      | 否   |
| id              | `string`                     |      | 否   |
| ariaLabel       | `string`                     |      | 否   |
| ariaDescribedBy | `string`                     |      | 否   |
| onSelect        | `(index: string) => void`    |      | 是   |
| onOpen          | `(index: string) => void`    |      | 是   |
| onClose         | `(index: string) => void`    |      | 是   |

## MenuProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| mode            | `'horizontal' \| 'vertical'`       |      | 是   |
| defaultActive   | `string`                           |      | 是   |
| defaultOpeneds  | `string[]`                         |      | 是   |
| uniqueOpened    | `boolean`                          |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| onSelect        | `(index: string) => void`          |      | 是   |
| onOpen          | `(index: string) => void`          |      | 是   |
| onClose         | `(index: string) => void`          |      | 是   |

## MenuSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## AlertEffect

**Type**

### 签名

```typescript
AlertEffect: 'light' | 'dark';
```

## AlertSetupProps

**Interface**

### 成员

| 名称            | 类型          | 描述 | 可选 |
| --------------- | ------------- | ---- | ---- |
| title           | `string`      |      | 否   |
| description     | `string`      |      | 否   |
| type            | `AlertType`   |      | 否   |
| closable        | `boolean`     |      | 否   |
| showIcon        | `boolean`     |      | 否   |
| effect          | `AlertEffect` |      | 否   |
| class           | `string`      |      | 否   |
| id              | `string`      |      | 否   |
| ariaLabel       | `string`      |      | 否   |
| ariaDescribedBy | `string`      |      | 否   |
| onClose         | `() => void`  |      | 是   |

## AlertProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| type            | `AlertType`                        |      | 是   |
| title           | `string`                           |      | 是   |
| description     | `string`                           |      | 是   |
| closable        | `boolean`                          |      | 是   |
| showIcon        | `boolean`                          |      | 是   |
| effect          | `AlertEffect`                      |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| onClose         | `() => void`                       |      | 是   |

## AlertSlots

**Interface**

### 成员

| 名称        | 类型            | 描述 | 可选 |
| ----------- | --------------- | ---- | ---- |
| default     | `() => VNode[]` |      | 是   |
| title       | `() => VNode[]` |      | 是   |
| description | `() => VNode[]` |      | 是   |

## TooltipProps

**Interface**

### 成员

| 名称            | 类型                                     | 描述 | 可选 |
| --------------- | ---------------------------------------- | ---- | ---- |
| content         | `string`                                 |      | 是   |
| placement       | `'top' \| 'bottom' \| 'left' \| 'right'` |      | 是   |
| disabled        | `boolean`                                |      | 是   |
| class           | `string`                                 |      | 是   |
| style           | `string \| Record<string, string>`       |      | 是   |
| id              | `string`                                 |      | 是   |
| ariaLabel       | `string`                                 |      | 是   |
| ariaDescribedBy | `string`                                 |      | 是   |

## TooltipSetupProps

**Interface**

### 成员

| 名称            | 类型                                     | 描述 | 可选 |
| --------------- | ---------------------------------------- | ---- | ---- |
| content         | `string`                                 |      | 是   |
| placement       | `'top' \| 'bottom' \| 'left' \| 'right'` |      | 是   |
| trigger         | `string`                                 |      | 是   |
| disabled        | `boolean`                                |      | 是   |
| openDelay       | `number`                                 |      | 是   |
| closeDelay      | `number`                                 |      | 是   |
| showArrow       | `boolean`                                |      | 是   |
| class           | `string`                                 |      | 是   |
| style           | `string \| Record<string, string>`       |      | 是   |
| id              | `string`                                 |      | 是   |
| ariaLabel       | `string`                                 |      | 是   |
| ariaDescribedBy | `string`                                 |      | 是   |

## TooltipSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| content | `() => VNode[]` |      | 是   |

## CheckboxProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `boolean \| string \| number`      |      | 是   |
| label           | `string`                           |      | 是   |
| disabled        | `boolean`                          |      | 是   |
| indeterminate   | `boolean`                          |      | 是   |
| name            | `string`                           |      | 是   |
| id              | `string`                           |      | 是   |
| checked         | `boolean`                          |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| ariaInvalid     | `boolean`                          |      | 是   |
| ariaRequired    | `boolean`                          |      | 是   |
| tabIndex        | `number`                           |      | 是   |
| onChange        | `(value: boolean) => void`         |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`   |      | 是   |

## CheckboxSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## CheckboxSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `boolean \| string \| number`      |      | 否   |
| label           | `string`                           |      | 否   |
| trueLabel       | `string \| number`                 |      | 是   |
| falseLabel      | `string \| number`                 |      | 是   |
| disabled        | `boolean`                          |      | 否   |
| checked         | `boolean`                          |      | 否   |
| indeterminate   | `boolean`                          |      | 否   |
| name            | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| class           | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| ariaInvalid     | `boolean`                          |      | 否   |
| ariaRequired    | `boolean`                          |      | 否   |
| tabIndex        | `number`                           |      | 是   |
| onChange        | `(value: boolean) => void`         |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`   |      | 是   |

## RadioProps

**Interface**

### 成员

| 名称            | 类型                                           | 描述 | 可选 |
| --------------- | ---------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| boolean`                  |      | 是   |
| label           | `string`                                       |      | 是   |
| disabled        | `boolean`                                      |      | 是   |
| name            | `string`                                       |      | 是   |
| id              | `string`                                       |      | 是   |
| class           | `string`                                       |      | 是   |
| style           | `string \| Record<string, string>`             |      | 是   |
| ariaLabel       | `string`                                       |      | 是   |
| ariaDescribedBy | `string`                                       |      | 是   |
| ariaInvalid     | `boolean`                                      |      | 是   |
| ariaRequired    | `boolean`                                      |      | 是   |
| tabIndex        | `number`                                       |      | 是   |
| onChange        | `(value: string \| number \| boolean) => void` |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`               |      | 是   |

## RadioSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## RadioSetupProps

**Interface**

### 成员

| 名称            | 类型                                           | 描述 | 可选 |
| --------------- | ---------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| boolean`                  |      | 否   |
| label           | `string \| number \| boolean`                  |      | 是   |
| disabled        | `boolean`                                      |      | 否   |
| name            | `string`                                       |      | 否   |
| id              | `string`                                       |      | 否   |
| class           | `string`                                       |      | 否   |
| style           | `string \| Record<string, string>`             |      | 是   |
| ariaLabel       | `string`                                       |      | 否   |
| ariaDescribedBy | `string`                                       |      | 否   |
| ariaInvalid     | `boolean`                                      |      | 否   |
| ariaRequired    | `boolean`                                      |      | 否   |
| tabIndex        | `number`                                       |      | 是   |
| onChange        | `(value: string \| number \| boolean) => void` |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`               |      | 是   |

## SwitchProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `boolean`                          |      | 是   |
| disabled        | `boolean`                          |      | 是   |
| activeText      | `string`                           |      | 是   |
| inactiveText    | `string`                           |      | 是   |
| activeColor     | `string`                           |      | 是   |
| inactiveColor   | `string`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| ariaInvalid     | `boolean`                          |      | 是   |
| ariaRequired    | `boolean`                          |      | 是   |
| tabIndex        | `number`                           |      | 是   |
| onChange        | `(value: boolean) => void`         |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`   |      | 是   |

## SwitchSlots

**Interface**

### 成员

| 名称     | 类型            | 描述 | 可选 |
| -------- | --------------- | ---- | ---- |
| default  | `() => VNode[]` |      | 是   |
| active   | `() => VNode[]` |      | 是   |
| inactive | `() => VNode[]` |      | 是   |

## SwitchSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `boolean`                          |      | 否   |
| disabled        | `boolean`                          |      | 否   |
| loading         | `boolean`                          |      | 否   |
| size            | `string`                           |      | 否   |
| activeText      | `string`                           |      | 否   |
| inactiveText    | `string`                           |      | 否   |
| activeColor     | `string`                           |      | 否   |
| inactiveColor   | `string`                           |      | 否   |
| activeValue     | `boolean \| string \| number`      |      | 否   |
| inactiveValue   | `boolean \| string \| number`      |      | 否   |
| name            | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| class           | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| ariaInvalid     | `boolean`                          |      | 否   |
| ariaRequired    | `boolean`                          |      | 否   |
| tabIndex        | `number`                           |      | 是   |
| onChange        | `(value: boolean) => void`         |      | 是   |
| onKeydown       | `(event: KeyboardEvent) => void`   |      | 是   |

## InputNumberProps

**Interface**

### 成员

| 名称             | 类型                                   | 描述 | 可选 |
| ---------------- | -------------------------------------- | ---- | ---- |
| modelValue       | `number`                               |      | 是   |
| min              | `number`                               |      | 是   |
| max              | `number`                               |      | 是   |
| step             | `number`                               |      | 是   |
| stepStrictly     | `boolean`                              |      | 是   |
| disabled         | `boolean`                              |      | 是   |
| size             | `ComponentSize`                        |      | 是   |
| controls         | `boolean`                              |      | 是   |
| controlsPosition | `string`                               |      | 是   |
| precision        | `number`                               |      | 是   |
| name             | `string`                               |      | 是   |
| label            | `string`                               |      | 是   |
| placeholder      | `string`                               |      | 是   |
| class            | `string`                               |      | 是   |
| style            | `string \| Record<string, string>`     |      | 是   |
| id               | `string`                               |      | 是   |
| ariaLabel        | `string`                               |      | 是   |
| ariaDescribedBy  | `string`                               |      | 是   |
| ariaRequired     | `boolean`                              |      | 是   |
| ariaInvalid      | `boolean`                              |      | 是   |
| tabIndex         | `number`                               |      | 是   |
| onChange         | `(value: number \| undefined) => void` |      | 是   |
| onInput          | `(value: number \| undefined) => void` |      | 是   |
| onKeydown        | `(event: KeyboardEvent) => void`       |      | 是   |

## InputNumberSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## InputNumberSetupProps

**Interface**

### 成员

| 名称             | 类型                                   | 描述 | 可选 |
| ---------------- | -------------------------------------- | ---- | ---- |
| modelValue       | `number \| undefined`                  |      | 否   |
| min              | `number`                               |      | 否   |
| max              | `number`                               |      | 否   |
| step             | `number`                               |      | 否   |
| stepStrictly     | `boolean`                              |      | 否   |
| precision        | `number \| undefined`                  |      | 否   |
| size             | `string`                               |      | 否   |
| disabled         | `boolean`                              |      | 否   |
| controls         | `boolean`                              |      | 否   |
| controlsPosition | `string`                               |      | 否   |
| name             | `string`                               |      | 否   |
| label            | `string`                               |      | 否   |
| placeholder      | `string`                               |      | 否   |
| class            | `string`                               |      | 否   |
| style            | `string \| Record<string, string>`     |      | 是   |
| id               | `string`                               |      | 否   |
| ariaLabel        | `string`                               |      | 否   |
| ariaDescribedBy  | `string`                               |      | 否   |
| ariaRequired     | `boolean`                              |      | 否   |
| ariaInvalid      | `boolean`                              |      | 否   |
| tabIndex         | `number`                               |      | 是   |
| onChange         | `(value: number \| undefined) => void` |      | 是   |
| onInput          | `(value: number \| undefined) => void` |      | 是   |
| onKeydown        | `(event: KeyboardEvent) => void`       |      | 是   |

## TransferOption

**Interface**

### 成员

| 名称     | 类型               | 描述 | 可选 |
| -------- | ------------------ | ---- | ---- |
| key      | `string \| number` |      | 否   |
| label    | `string`           |      | 否   |
| disabled | `boolean`          |      | 是   |

## TransferProps

**Interface**

### 成员

| 名称                | 类型                                                                                                      | 描述 | 可选 |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ---- | ---- |
| data                | `TransferOption[]`                                                                                        |      | 是   |
| modelValue          | `(string \| number)[]`                                                                                    |      | 是   |
| filterable          | `boolean`                                                                                                 |      | 是   |
| filterPlaceholder   | `string`                                                                                                  |      | 是   |
| titles              | `string[]`                                                                                                |      | 是   |
| buttonTexts         | `string[]`                                                                                                |      | 是   |
| leftDefaultChecked  | `(string \| number)[]`                                                                                    |      | 是   |
| rightDefaultChecked | `(string \| number)[]`                                                                                    |      | 是   |
| class               | `string`                                                                                                  |      | 是   |
| style               | `string \| Record<string, string>`                                                                        |      | 是   |
| id                  | `string`                                                                                                  |      | 是   |
| ariaLabel           | `string`                                                                                                  |      | 是   |
| ariaDescribedBy     | `string`                                                                                                  |      | 是   |
| onChange            | `( value: (string \| number)[], direction: 'left' \| 'right', movedKeys: (string \| number)[], ) => void` |      | 是   |
| onLeftCheckChange   | `(checked: (string \| number)[]) => void`                                                                 |      | 是   |
| onRightCheckChange  | `(checked: (string \| number)[]) => void`                                                                 |      | 是   |

## TransferSetupProps

**Interface**

### 成员

| 名称                | 类型                                                                                                      | 描述 | 可选 |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ---- | ---- |
| data                | `TransferOption[]`                                                                                        |      | 否   |
| modelValue          | `(string \| number)[]`                                                                                    |      | 否   |
| filterable          | `boolean`                                                                                                 |      | 否   |
| filterPlaceholder   | `string`                                                                                                  |      | 否   |
| titles              | `string[]`                                                                                                |      | 否   |
| buttonTexts         | `string[]`                                                                                                |      | 否   |
| leftDefaultChecked  | `(string \| number)[]`                                                                                    |      | 否   |
| rightDefaultChecked | `(string \| number)[]`                                                                                    |      | 否   |
| class               | `string`                                                                                                  |      | 否   |
| id                  | `string`                                                                                                  |      | 否   |
| ariaLabel           | `string`                                                                                                  |      | 否   |
| ariaDescribedBy     | `string`                                                                                                  |      | 否   |
| style               | `string \| Record<string, string>`                                                                        |      | 是   |
| onChange            | `( value: (string \| number)[], direction: 'left' \| 'right', movedKeys: (string \| number)[], ) => void` |      | 是   |
| onLeftCheckChange   | `(checked: (string \| number)[]) => void`                                                                 |      | 是   |
| onRightCheckChange  | `(checked: (string \| number)[]) => void`                                                                 |      | 是   |

## TransferSlots

**Interface**

### 成员

| 名称    | 类型                                  | 描述 | 可选 |
| ------- | ------------------------------------- | ---- | ---- |
| default | `(option: TransferOption) => VNode[]` |      | 是   |
| footer  | `() => VNode[]`                       |      | 是   |

## TreeNode

**Interface**

### 成员

| 名称          | 类型               | 描述 | 可选 |
| ------------- | ------------------ | ---- | ---- |
| id            | `string \| number` |      | 否   |
| label         | `string`           |      | 否   |
| children      | `TreeNode[]`       |      | 是   |
| disabled      | `boolean`          |      | 是   |
| isLeaf        | `boolean`          |      | 是   |
| loading       | `boolean`          |      | 是   |
| expanded      | `boolean`          |      | 是   |
| checked       | `boolean`          |      | 是   |
| indeterminate | `boolean`          |      | 是   |

## TreeProps

**Interface**

### 成员

| 名称                | 类型                                                                                                        | 描述 | 可选 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ---- | ---- |
| data                | `TreeNode[]`                                                                                                |      | 是   |
| showLine            | `boolean`                                                                                                   |      | 是   |
| showCheckbox        | `boolean`                                                                                                   |      | 是   |
| checkable           | `boolean`                                                                                                   |      | 是   |
| draggable           | `boolean`                                                                                                   |      | 是   |
| defaultExpandAll    | `boolean`                                                                                                   |      | 是   |
| defaultExpandedKeys | `(string \| number)[]`                                                                                      |      | 是   |
| defaultCheckedKeys  | `(string \| number)[]`                                                                                      |      | 是   |
| nodeKey             | `string`                                                                                                    |      | 是   |
| class               | `string`                                                                                                    |      | 是   |
| style               | `string \| Record<string, string>`                                                                          |      | 是   |
| id                  | `string`                                                                                                    |      | 是   |
| ariaLabel           | `string`                                                                                                    |      | 是   |
| ariaDescribedBy     | `string`                                                                                                    |      | 是   |
| onCheck             | `(data: TreeNode[], checked: boolean) => void`                                                              |      | 是   |
| onSelect            | `(data: TreeNode) => void`                                                                                  |      | 是   |
| onExpand            | `(data: TreeNode, expanded: boolean) => void`                                                               |      | 是   |
| onNodeClick         | `(data: TreeNode) => void`                                                                                  |      | 是   |
| onDragStart         | `(data: TreeNode, event: DragEvent) => void`                                                                |      | 是   |
| onDragEnd           | `(data: TreeNode, event: DragEvent) => void`                                                                |      | 是   |
| onDrop              | `( data: TreeNode, target: TreeNode, position: 'before' \| 'after' \| 'inner', event: DragEvent, ) => void` |      | 是   |

## TreeSetupProps

**Interface**

### 成员

| 名称                | 类型                                                                                                        | 描述 | 可选 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ---- | ---- |
| data                | `TreeNode[]`                                                                                                |      | 否   |
| showLine            | `boolean`                                                                                                   |      | 否   |
| showCheckbox        | `boolean`                                                                                                   |      | 否   |
| checkable           | `boolean`                                                                                                   |      | 否   |
| draggable           | `boolean`                                                                                                   |      | 否   |
| defaultExpandAll    | `boolean`                                                                                                   |      | 否   |
| defaultExpandedKeys | `(string \| number)[]`                                                                                      |      | 否   |
| defaultCheckedKeys  | `(string \| number)[]`                                                                                      |      | 否   |
| nodeKey             | `string`                                                                                                    |      | 否   |
| class               | `string`                                                                                                    |      | 否   |
| style               | `string \| Record<string, string>`                                                                          |      | 是   |
| id                  | `string`                                                                                                    |      | 否   |
| ariaLabel           | `string`                                                                                                    |      | 否   |
| ariaDescribedBy     | `string`                                                                                                    |      | 否   |
| onCheck             | `(data: TreeNode[], checked: boolean) => void`                                                              |      | 是   |
| onSelect            | `(data: TreeNode) => void`                                                                                  |      | 是   |
| onExpand            | `(data: TreeNode, expanded: boolean) => void`                                                               |      | 是   |
| onNodeClick         | `(data: TreeNode) => void`                                                                                  |      | 是   |
| onDragStart         | `(data: TreeNode, event: DragEvent) => void`                                                                |      | 是   |
| onDragEnd           | `(data: TreeNode, event: DragEvent) => void`                                                                |      | 是   |
| onDrop              | `( data: TreeNode, target: TreeNode, position: 'before' \| 'after' \| 'inner', event: DragEvent, ) => void` |      | 是   |

## TreeSlots

**Interface**

### 成员

| 名称    | 类型                          | 描述 | 可选 |
| ------- | ----------------------------- | ---- | ---- |
| default | `(data: TreeNode) => VNode[]` |      | 是   |
| empty   | `() => VNode[]`               |      | 是   |

## TreeSelectNode

**Interface**

### 成员

| 名称     | 类型               | 描述 | 可选 |
| -------- | ------------------ | ---- | ---- |
| value    | `string \| number` |      | 否   |
| label    | `string`           |      | 否   |
| children | `TreeSelectNode[]` |      | 是   |
| disabled | `boolean`          |      | 是   |
| isLeaf   | `boolean`          |      | 是   |

## TreeSelectProps

**Interface**

### 成员

| 名称            | 类型                                                        | 描述 | 可选 |
| --------------- | ----------------------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| (string \| number)[]`                  |      | 是   |
| options         | `TreeSelectNode[]`                                          |      | 是   |
| placeholder     | `string`                                                    |      | 是   |
| disabled        | `boolean`                                                   |      | 是   |
| clearable       | `boolean`                                                   |      | 是   |
| multiple        | `boolean`                                                   |      | 是   |
| checkStrictly   | `boolean`                                                   |      | 是   |
| filterable      | `boolean`                                                   |      | 是   |
| showCheckbox    | `boolean`                                                   |      | 是   |
| class           | `string`                                                    |      | 是   |
| id              | `string`                                                    |      | 是   |
| ariaLabel       | `string`                                                    |      | 是   |
| ariaDescribedBy | `string`                                                    |      | 是   |
| onChange        | `(value: string \| number \| (string \| number)[]) => void` |      | 是   |
| onClear         | `() => void`                                                |      | 是   |

## TreeSelectSetupProps

**Interface**

### 成员

| 名称            | 类型                                                        | 描述 | 可选 |
| --------------- | ----------------------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| (string \| number)[]`                  |      | 否   |
| options         | `TreeSelectNode[]`                                          |      | 否   |
| placeholder     | `string`                                                    |      | 否   |
| disabled        | `boolean`                                                   |      | 否   |
| clearable       | `boolean`                                                   |      | 否   |
| multiple        | `boolean`                                                   |      | 否   |
| checkStrictly   | `boolean`                                                   |      | 否   |
| filterable      | `boolean`                                                   |      | 否   |
| showCheckbox    | `boolean`                                                   |      | 否   |
| class           | `string`                                                    |      | 否   |
| id              | `string`                                                    |      | 否   |
| ariaLabel       | `string`                                                    |      | 否   |
| ariaDescribedBy | `string`                                                    |      | 否   |
| onChange        | `(value: string \| number \| (string \| number)[]) => void` |      | 是   |
| onClear         | `() => void`                                                |      | 是   |

## TreeSelectSlots

**Interface**

### 成员

| 名称    | 类型                                | 描述 | 可选 |
| ------- | ----------------------------------- | ---- | ---- |
| default | `(node: TreeSelectNode) => VNode[]` |      | 是   |

## UploadFileStatus

**Type**

### 签名

```typescript
UploadFileStatus: 'pending' | 'uploading' | 'success' | 'error';
```

## UploadFile

**Interface**

### 成员

| 名称       | 类型               | 描述 | 可选 |
| ---------- | ------------------ | ---- | ---- |
| name       | `string`           |      | 否   |
| size       | `number`           |      | 否   |
| status     | `UploadFileStatus` |      | 否   |
| percentage | `number`           |      | 是   |
| url        | `string`           |      | 是   |
| uid        | `number`           |      | 否   |
| raw        | `File`             |      | 是   |

## UploadProps

**Interface**

### 成员

| 名称            | 类型                                             | 描述 | 可选 |
| --------------- | ------------------------------------------------ | ---- | ---- |
| action          | `string`                                         |      | 是   |
| headers         | `Record<string, string>`                         |      | 是   |
| data            | `Record<string, unknown>`                        |      | 是   |
| multiple        | `boolean`                                        |      | 是   |
| accept          | `string`                                         |      | 是   |
| autoUpload      | `boolean`                                        |      | 是   |
| disabled        | `boolean`                                        |      | 是   |
| limit           | `number`                                         |      | 是   |
| class           | `string`                                         |      | 是   |
| style           | `string \| Record<string, string>`               |      | 是   |
| id              | `string`                                         |      | 是   |
| ariaLabel       | `string`                                         |      | 是   |
| ariaDescribedBy | `string`                                         |      | 是   |
| onChange        | `(files: UploadFile[]) => void`                  |      | 是   |
| onSuccess       | `(response: unknown, file: UploadFile) => void`  |      | 是   |
| onError         | `(error: Error, file: UploadFile) => void`       |      | 是   |
| onProgress      | `(percentage: number, file: UploadFile) => void` |      | 是   |
| onRemove        | `(file: UploadFile) => void`                     |      | 是   |
| beforeUpload    | `(file: File) => boolean \| Promise<boolean>`    |      | 是   |

## UploadSetupProps

**Interface**

### 成员

| 名称            | 类型                                                          | 描述 | 可选 |
| --------------- | ------------------------------------------------------------- | ---- | ---- |
| action          | `string`                                                      |      | 否   |
| headers         | `Record<string, string>`                                      |      | 否   |
| data            | `Record<string, unknown>`                                     |      | 否   |
| multiple        | `boolean`                                                     |      | 否   |
| accept          | `string`                                                      |      | 否   |
| autoUpload      | `boolean`                                                     |      | 否   |
| disabled        | `boolean`                                                     |      | 否   |
| limit           | `number`                                                      |      | 否   |
| class           | `string`                                                      |      | 否   |
| id              | `string`                                                      |      | 否   |
| ariaLabel       | `string`                                                      |      | 否   |
| ariaDescribedBy | `string`                                                      |      | 否   |
| style           | `string \| Record<string, string>`                            |      | 是   |
| onChange        | `(files: UploadFile[]) => void`                               |      | 是   |
| onSuccess       | `(response: unknown, file: UploadFile) => void`               |      | 是   |
| onError         | `(error: Error, file: UploadFile) => void`                    |      | 是   |
| onProgress      | `(percentage: number, file: UploadFile) => void`              |      | 是   |
| onRemove        | `(file: UploadFile) => void`                                  |      | 是   |
| beforeUpload    | `(file: File) => boolean \| void \| Promise<boolean \| void>` |      | 是   |

## UploadSlots

**Interface**

### 成员

| 名称    | 类型                            | 描述 | 可选 |
| ------- | ------------------------------- | ---- | ---- |
| default | `() => VNode[]`                 |      | 是   |
| trigger | `() => VNode[]`                 |      | 是   |
| tip     | `() => VNode[]`                 |      | 是   |
| file    | `(file: UploadFile) => VNode[]` |      | 是   |

## ImageFit

**Type**

### 签名

```typescript
ImageFit: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
```

## ImageProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| src             | `string`                           |      | 是   |
| alt             | `string`                           |      | 是   |
| fit             | `ImageFit`                         |      | 是   |
| width           | `string \| number`                 |      | 是   |
| height          | `string \| number`                 |      | 是   |
| lazy            | `boolean`                          |      | 是   |
| preview         | `boolean`                          |      | 是   |
| errorSrc        | `string`                           |      | 是   |
| placeholderSrc  | `string`                           |      | 是   |
| round           | `boolean`                          |      | 是   |
| radius          | `string \| number`                 |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| onLoad          | `() => void`                       |      | 是   |
| onError         | `() => void`                       |      | 是   |

## ImageSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## ImageSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| src             | `string`                           |      | 否   |
| alt             | `string`                           |      | 否   |
| fit             | `string`                           |      | 否   |
| width           | `string \| number`                 |      | 否   |
| height          | `string \| number`                 |      | 否   |
| lazy            | `boolean`                          |      | 否   |
| preview         | `boolean`                          |      | 否   |
| errorSrc        | `string`                           |      | 否   |
| placeholderSrc  | `string`                           |      | 否   |
| round           | `boolean`                          |      | 否   |
| radius          | `string \| number`                 |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |
| onLoad          | `() => void`                       |      | 是   |
| onError         | `() => void`                       |      | 是   |

## NotificationType

**Type**

### 签名

```typescript
NotificationType: 'success' | 'warning' | 'error' | 'info';
```

## NotificationPosition

**Type**

### 签名

```typescript
NotificationPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
```

## NotificationOptions

**Interface**

### 成员

| 名称            | 类型                   | 描述 | 可选 |
| --------------- | ---------------------- | ---- | ---- |
| type            | `NotificationType`     |      | 是   |
| title           | `string`               |      | 否   |
| message         | `string`               |      | 是   |
| duration        | `number`               |      | 是   |
| position        | `NotificationPosition` |      | 是   |
| showClose       | `boolean`              |      | 是   |
| id              | `string`               |      | 是   |
| ariaLabel       | `string`               |      | 是   |
| ariaDescribedBy | `string`               |      | 是   |
| onClose         | `() => void`           |      | 是   |
| onOpen          | `() => void`           |      | 是   |

## NotificationProps

**Interface**

### 成员

| 名称            | 类型                   | 描述 | 可选 |
| --------------- | ---------------------- | ---- | ---- |
| position        | `NotificationPosition` |      | 是   |
| class           | `string`               |      | 是   |
| id              | `string`               |      | 是   |
| ariaLabel       | `string`               |      | 是   |
| ariaDescribedBy | `string`               |      | 是   |

## NotificationSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## NotificationSetupProps

**Interface**

### 成员

| 名称            | 类型                   | 描述 | 可选 |
| --------------- | ---------------------- | ---- | ---- |
| position        | `NotificationPosition` |      | 否   |
| class           | `string`               |      | 是   |
| id              | `string`               |      | 否   |
| ariaLabel       | `string`               |      | 否   |
| ariaDescribedBy | `string`               |      | 否   |

## CalendarView

**Type**

### 签名

```typescript
CalendarView: 'month' | 'week' | 'day';
```

## CalendarEvent

**Interface**

### 成员

| 名称  | 类型      | 描述 | 可选 |
| ----- | --------- | ---- | ---- |
| title | `string`  |      | 否   |
| start | `Date`    |      | 否   |
| end   | `Date`    |      | 是   |
| color | `string`  |      | 是   |
| data  | `unknown` |      | 是   |

## CalendarProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `string \| Date`                   |      | 是   |
| view            | `CalendarView`                     |      | 是   |
| events          | `CalendarEvent[]`                  |      | 是   |
| disabledDates   | `(date: Date) => boolean`          |      | 是   |
| firstDayOfWeek  | `number`                           |      | 是   |
| weekNames       | `string[]`                         |      | 是   |
| monthNames      | `string[]`                         |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| onChange        | `(date: Date) => void`             |      | 是   |
| onEventClick    | `(event: CalendarEvent) => void`   |      | 是   |
| onDateClick     | `(date: Date) => void`             |      | 是   |

## CalendarSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## CalendarSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `Date \| string`                   |      | 否   |
| view            | `string`                           |      | 否   |
| events          | `CalendarEvent[]`                  |      | 否   |
| disabledDates   | `(date: Date) => boolean`          |      | 是   |
| firstDayOfWeek  | `number`                           |      | 否   |
| weekNames       | `string[]`                         |      | 否   |
| monthNames      | `string[]`                         |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |
| onChange        | `(date: Date) => void`             |      | 是   |
| onEventClick    | `(event: CalendarEvent) => void`   |      | 是   |
| onDateClick     | `(date: Date) => void`             |      | 是   |

## ColorPickerProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `string`                           |      | 是   |
| showAlpha       | `boolean`                          |      | 是   |
| showClear       | `boolean`                          |      | 是   |
| showPreset      | `boolean`                          |      | 是   |
| showHistory     | `boolean`                          |      | 是   |
| presets         | `string[]`                         |      | 是   |
| history         | `string[]`                         |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| onChange        | `(color: string) => void`          |      | 是   |
| onClear         | `() => void`                       |      | 是   |

## ColorPickerSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## ColorPickerSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `string`                           |      | 否   |
| showAlpha       | `boolean`                          |      | 否   |
| showClear       | `boolean`                          |      | 否   |
| showPreset      | `boolean`                          |      | 否   |
| showHistory     | `boolean`                          |      | 否   |
| presets         | `string[]`                         |      | 否   |
| history         | `string[]`                         |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |
| onChange        | `(color: string) => void`          |      | 是   |
| onClear         | `() => void`                       |      | 是   |

## DescriptionsItemData

**Interface**

### 成员

| 名称         | 类型                     | 描述 | 可选 |
| ------------ | ------------------------ | ---- | ---- |
| label        | `string`                 |      | 否   |
| value        | `string`                 |      | 否   |
| span         | `number`                 |      | 是   |
| labelStyle   | `Record<string, string>` |      | 是   |
| contentStyle | `Record<string, string>` |      | 是   |

## DescriptionsProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| title           | `string`                           |      | 是   |
| column          | `number`                           |      | 是   |
| border          | `boolean`                          |      | 是   |
| size            | `ComponentSize`                    |      | 是   |
| layout          | `'horizontal' \| 'vertical'`       |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## DescriptionsSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| title           | `string`                           |      | 否   |
| column          | `number`                           |      | 否   |
| border          | `boolean`                          |      | 否   |
| size            | `ComponentSize`                    |      | 否   |
| layout          | `'horizontal' \| 'vertical'`       |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |

## DescriptionsSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| title   | `() => VNode[]` |      | 是   |

## DescriptionsItemProps

**Interface**

### 成员

| 名称            | 类型                     | 描述 | 可选 |
| --------------- | ------------------------ | ---- | ---- |
| label           | `string`                 |      | 是   |
| span            | `number`                 |      | 是   |
| labelStyle      | `Record<string, string>` |      | 是   |
| contentStyle    | `Record<string, string>` |      | 是   |
| id              | `string`                 |      | 是   |
| ariaLabel       | `string`                 |      | 是   |
| ariaDescribedBy | `string`                 |      | 是   |

## DescriptionsItemSetupProps

**Interface**

### 成员

| 名称            | 类型                     | 描述 | 可选 |
| --------------- | ------------------------ | ---- | ---- |
| label           | `string`                 |      | 否   |
| span            | `number`                 |      | 否   |
| labelStyle      | `Record<string, string>` |      | 是   |
| contentStyle    | `Record<string, string>` |      | 是   |
| id              | `string`                 |      | 否   |
| ariaLabel       | `string`                 |      | 否   |
| ariaDescribedBy | `string`                 |      | 否   |

## DescriptionsItemSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| label   | `() => VNode[]` |      | 是   |

## DrawerDirection

**Type**

### 签名

```typescript
DrawerDirection: 'ltr' | 'rtl' | 'ttb' | 'btt';
```

## DrawerProps

**Interface**

### 成员

| 名称               | 类型                                                | 描述 | 可选 |
| ------------------ | --------------------------------------------------- | ---- | ---- |
| modelValue         | `boolean`                                           |      | 是   |
| title              | `string`                                            |      | 是   |
| size               | `string \| number`                                  |      | 是   |
| direction          | `DrawerDirection`                                   |      | 是   |
| showClose          | `boolean`                                           |      | 是   |
| closeOnClickModal  | `boolean`                                           |      | 是   |
| closeOnPressEscape | `boolean`                                           |      | 是   |
| lockScroll         | `boolean`                                           |      | 是   |
| appendToBody       | `boolean`                                           |      | 是   |
| withHeader         | `boolean`                                           |      | 是   |
| customClass        | `string`                                            |      | 是   |
| class              | `string`                                            |      | 是   |
| id                 | `string`                                            |      | 是   |
| ariaLabel          | `string`                                            |      | 是   |
| ariaDescribedBy    | `string`                                            |      | 是   |
| ariaModal          | `boolean`                                           |      | 是   |
| onBeforeOpen       | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onBeforeClose      | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onOpen             | `() => void`                                        |      | 是   |
| onClose            | `() => void`                                        |      | 是   |

## DrawerSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| header  | `() => VNode[]` |      | 是   |
| footer  | `() => VNode[]` |      | 是   |

## DrawerSetupProps

**Interface**

### 成员

| 名称               | 类型                                                | 描述 | 可选 |
| ------------------ | --------------------------------------------------- | ---- | ---- |
| modelValue         | `boolean`                                           |      | 否   |
| title              | `string`                                            |      | 否   |
| size               | `string \| number`                                  |      | 否   |
| direction          | `DrawerDirection`                                   |      | 否   |
| showClose          | `boolean`                                           |      | 否   |
| closeOnClickModal  | `boolean`                                           |      | 否   |
| closeOnPressEscape | `boolean`                                           |      | 否   |
| lockScroll         | `boolean`                                           |      | 否   |
| appendToBody       | `boolean`                                           |      | 否   |
| withHeader         | `boolean`                                           |      | 否   |
| customClass        | `string`                                            |      | 否   |
| class              | `string`                                            |      | 否   |
| id                 | `string`                                            |      | 否   |
| ariaLabel          | `string`                                            |      | 否   |
| ariaDescribedBy    | `string`                                            |      | 否   |
| ariaModal          | `boolean`                                           |      | 否   |
| onBeforeOpen       | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onBeforeClose      | `() => boolean \| void \| Promise<boolean \| void>` |      | 是   |
| onOpen             | `() => void`                                        |      | 是   |
| onClose            | `() => void`                                        |      | 是   |

## RateProps

**Interface**

### 成员

| 名称              | 类型                               | 描述 | 可选 |
| ----------------- | ---------------------------------- | ---- | ---- |
| modelValue        | `number`                           |      | 是   |
| max               | `number`                           |      | 是   |
| allowHalf         | `boolean`                          |      | 是   |
| readonly          | `boolean`                          |      | 是   |
| disabled          | `boolean`                          |      | 是   |
| showText          | `boolean`                          |      | 是   |
| showScore         | `boolean`                          |      | 是   |
| texts             | `string[]`                         |      | 是   |
| voidIcon          | `string`                           |      | 是   |
| voidColor         | `string`                           |      | 是   |
| disabledVoidColor | `string`                           |      | 是   |
| class             | `string`                           |      | 是   |
| style             | `string \| Record<string, string>` |      | 是   |
| id                | `string`                           |      | 是   |
| ariaLabel         | `string`                           |      | 是   |
| ariaDescribedBy   | `string`                           |      | 是   |
| onChange          | `(value: number) => void`          |      | 是   |

## RateSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## RateSetupProps

**Interface**

### 成员

| 名称              | 类型                               | 描述 | 可选 |
| ----------------- | ---------------------------------- | ---- | ---- |
| modelValue        | `number`                           |      | 否   |
| max               | `number`                           |      | 否   |
| allowHalf         | `boolean`                          |      | 否   |
| readonly          | `boolean`                          |      | 否   |
| disabled          | `boolean`                          |      | 否   |
| showText          | `boolean`                          |      | 否   |
| showScore         | `boolean`                          |      | 否   |
| texts             | `string[]`                         |      | 否   |
| voidIcon          | `string`                           |      | 否   |
| voidColor         | `string`                           |      | 否   |
| disabledVoidColor | `string`                           |      | 否   |
| class             | `string`                           |      | 否   |
| id                | `string`                           |      | 否   |
| ariaLabel         | `string`                           |      | 否   |
| ariaDescribedBy   | `string`                           |      | 否   |
| style             | `string \| Record<string, string>` |      | 是   |
| onChange          | `(value: number) => void`          |      | 是   |

## CheckboxGroupProps

**Interface**

### 成员

| 名称            | 类型                                               | 描述 | 可选 |
| --------------- | -------------------------------------------------- | ---- | ---- |
| modelValue      | `(string \| number \| boolean)[]`                  |      | 是   |
| disabled        | `boolean`                                          |      | 是   |
| min             | `number`                                           |      | 是   |
| max             | `number`                                           |      | 是   |
| size            | `ComponentSize`                                    |      | 是   |
| class           | `string`                                           |      | 是   |
| style           | `string \| Record<string, string>`                 |      | 是   |
| id              | `string`                                           |      | 是   |
| ariaLabel       | `string`                                           |      | 是   |
| ariaDescribedBy | `string`                                           |      | 是   |
| ariaRequired    | `boolean`                                          |      | 是   |
| onChange        | `(value: (string \| number \| boolean)[]) => void` |      | 是   |

## CheckboxGroupSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## CheckboxGroupSetupProps

**Interface**

### 成员

| 名称            | 类型                                               | 描述 | 可选 |
| --------------- | -------------------------------------------------- | ---- | ---- |
| modelValue      | `(string \| number \| boolean)[]`                  |      | 否   |
| disabled        | `boolean`                                          |      | 否   |
| min             | `number`                                           |      | 否   |
| max             | `number`                                           |      | 否   |
| size            | `ComponentSize`                                    |      | 否   |
| class           | `string`                                           |      | 否   |
| style           | `string \| Record<string, string>`                 |      | 是   |
| id              | `string`                                           |      | 否   |
| ariaLabel       | `string`                                           |      | 否   |
| ariaDescribedBy | `string`                                           |      | 否   |
| ariaRequired    | `boolean`                                          |      | 否   |
| onChange        | `(value: (string \| number \| boolean)[]) => void` |      | 是   |

## RadioGroupProps

**Interface**

### 成员

| 名称            | 类型                                           | 描述 | 可选 |
| --------------- | ---------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| boolean`                  |      | 是   |
| disabled        | `boolean`                                      |      | 是   |
| size            | `ComponentSize`                                |      | 是   |
| class           | `string`                                       |      | 是   |
| style           | `string \| Record<string, string>`             |      | 是   |
| id              | `string`                                       |      | 是   |
| ariaLabel       | `string`                                       |      | 是   |
| ariaDescribedBy | `string`                                       |      | 是   |
| ariaRequired    | `boolean`                                      |      | 是   |
| onChange        | `(value: string \| number \| boolean) => void` |      | 是   |

## RadioGroupSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## RadioGroupSetupProps

**Interface**

### 成员

| 名称            | 类型                                           | 描述 | 可选 |
| --------------- | ---------------------------------------------- | ---- | ---- |
| modelValue      | `string \| number \| boolean`                  |      | 否   |
| disabled        | `boolean`                                      |      | 否   |
| size            | `ComponentSize`                                |      | 否   |
| class           | `string`                                       |      | 否   |
| style           | `string \| Record<string, string>`             |      | 是   |
| id              | `string`                                       |      | 否   |
| ariaLabel       | `string`                                       |      | 否   |
| ariaDescribedBy | `string`                                       |      | 否   |
| ariaRequired    | `boolean`                                      |      | 否   |
| onChange        | `(value: string \| number \| boolean) => void` |      | 是   |

## ProgressProps

**Interface**

### 成员

| 名称            | 类型                                           | 描述 | 可选 |
| --------------- | ---------------------------------------------- | ---- | ---- |
| percentage      | `number`                                       |      | 是   |
| type            | `'line' \| 'circle' \| 'dashboard'`            |      | 是   |
| status          | `'success' \| 'exception' \| 'warning'`        |      | 是   |
| strokeWidth     | `number`                                       |      | 是   |
| textInside      | `boolean`                                      |      | 是   |
| showText        | `boolean`                                      |      | 是   |
| color           | `string \| string[] \| Record<string, string>` |      | 是   |
| width           | `number`                                       |      | 是   |
| strokeLinecap   | `'butt' \| 'round' \| 'square'`                |      | 是   |
| format          | `(percentage: number) => string`               |      | 是   |
| class           | `string`                                       |      | 是   |
| style           | `string \| Record<string, string>`             |      | 是   |
| id              | `string`                                       |      | 是   |
| ariaLabel       | `string`                                       |      | 是   |
| ariaDescribedBy | `string`                                       |      | 是   |

## ProgressSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## ProgressSetupProps

**Interface**

### 成员

| 名称            | 类型                                           | 描述 | 可选 |
| --------------- | ---------------------------------------------- | ---- | ---- |
| percentage      | `number`                                       |      | 否   |
| type            | `'line' \| 'circle' \| 'dashboard'`            |      | 否   |
| status          | `'success' \| 'exception' \| 'warning' \| ''`  |      | 否   |
| strokeWidth     | `number`                                       |      | 否   |
| textInside      | `boolean`                                      |      | 否   |
| showText        | `boolean`                                      |      | 否   |
| color           | `string \| string[] \| Record<string, string>` |      | 否   |
| width           | `number`                                       |      | 否   |
| strokeLinecap   | `'butt' \| 'round' \| 'square'`                |      | 否   |
| format          | `(percentage: number) => string`               |      | 是   |
| class           | `string`                                       |      | 否   |
| id              | `string`                                       |      | 否   |
| ariaLabel       | `string`                                       |      | 否   |
| ariaDescribedBy | `string`                                       |      | 否   |
| style           | `string \| Record<string, string>`             |      | 是   |

## SliderProps

**Interface**

### 成员

| 名称              | 类型                                  | 描述 | 可选 |
| ----------------- | ------------------------------------- | ---- | ---- |
| modelValue        | `number \| number[]`                  |      | 是   |
| min               | `number`                              |      | 是   |
| max               | `number`                              |      | 是   |
| step              | `number`                              |      | 是   |
| showInput         | `boolean`                             |      | 是   |
| showInputControls | `boolean`                             |      | 是   |
| inputSize         | `ComponentSize`                       |      | 是   |
| showStops         | `boolean`                             |      | 是   |
| showTooltip       | `boolean`                             |      | 是   |
| formatTooltip     | `(value: number) => string`           |      | 是   |
| disabled          | `boolean`                             |      | 是   |
| range             | `boolean`                             |      | 是   |
| vertical          | `boolean`                             |      | 是   |
| height            | `string`                              |      | 是   |
| label             | `string`                              |      | 是   |
| class             | `string`                              |      | 是   |
| style             | `string \| Record<string, string>`    |      | 是   |
| id                | `string`                              |      | 是   |
| ariaLabel         | `string`                              |      | 是   |
| ariaDescribedBy   | `string`                              |      | 是   |
| ariaRequired      | `boolean`                             |      | 是   |
| ariaInvalid       | `boolean`                             |      | 是   |
| tabIndex          | `number`                              |      | 是   |
| onChange          | `(value: number \| number[]) => void` |      | 是   |
| onInput           | `(value: number \| number[]) => void` |      | 是   |
| onKeydown         | `(event: KeyboardEvent) => void`      |      | 是   |

## SliderSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## SliderSetupProps

**Interface**

### 成员

| 名称              | 类型                                  | 描述 | 可选 |
| ----------------- | ------------------------------------- | ---- | ---- |
| modelValue        | `number \| number[]`                  |      | 否   |
| min               | `number`                              |      | 否   |
| max               | `number`                              |      | 否   |
| step              | `number`                              |      | 否   |
| showInput         | `boolean`                             |      | 否   |
| showInputControls | `boolean`                             |      | 否   |
| inputSize         | `ComponentSize`                       |      | 否   |
| showStops         | `boolean`                             |      | 否   |
| showTooltip       | `boolean`                             |      | 否   |
| formatTooltip     | `(value: number) => string`           |      | 是   |
| disabled          | `boolean`                             |      | 否   |
| range             | `boolean`                             |      | 否   |
| vertical          | `boolean`                             |      | 否   |
| height            | `string`                              |      | 否   |
| label             | `string`                              |      | 否   |
| class             | `string`                              |      | 否   |
| style             | `string \| Record<string, string>`    |      | 是   |
| id                | `string`                              |      | 否   |
| ariaLabel         | `string`                              |      | 否   |
| ariaDescribedBy   | `string`                              |      | 否   |
| ariaRequired      | `boolean`                             |      | 否   |
| ariaInvalid       | `boolean`                             |      | 否   |
| tabIndex          | `number`                              |      | 是   |
| onChange          | `(value: number \| number[]) => void` |      | 是   |
| onInput           | `(value: number \| number[]) => void` |      | 是   |
| onKeydown         | `(event: KeyboardEvent) => void`      |      | 是   |

## AvatarProps

**Interface**

### 成员

| 名称            | 类型                                                       | 描述 | 可选 |
| --------------- | ---------------------------------------------------------- | ---- | ---- |
| size            | `number \| ComponentSize`                                  |      | 是   |
| shape           | `'circle' \| 'square'`                                     |      | 是   |
| icon            | `string`                                                   |      | 是   |
| src             | `string`                                                   |      | 是   |
| srcSet          | `string`                                                   |      | 是   |
| alt             | `string`                                                   |      | 是   |
| fit             | `'fill' \| 'contain' \| 'cover' \| 'none' \| 'scale-down'` |      | 是   |
| class           | `string`                                                   |      | 是   |
| style           | `string \| Record<string, string>`                         |      | 是   |
| id              | `string`                                                   |      | 是   |
| ariaLabel       | `string`                                                   |      | 是   |
| ariaDescribedBy | `string`                                                   |      | 是   |
| onError         | `() => boolean`                                            |      | 是   |

## AvatarSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## AvatarSetupProps

**Interface**

### 成员

| 名称            | 类型                                                       | 描述 | 可选 |
| --------------- | ---------------------------------------------------------- | ---- | ---- |
| size            | `number \| ComponentSize`                                  |      | 否   |
| shape           | `'circle' \| 'square'`                                     |      | 否   |
| icon            | `string`                                                   |      | 否   |
| src             | `string`                                                   |      | 否   |
| srcSet          | `string`                                                   |      | 否   |
| alt             | `string`                                                   |      | 否   |
| fit             | `'fill' \| 'contain' \| 'cover' \| 'none' \| 'scale-down'` |      | 否   |
| class           | `string`                                                   |      | 否   |
| id              | `string`                                                   |      | 否   |
| ariaLabel       | `string`                                                   |      | 否   |
| ariaDescribedBy | `string`                                                   |      | 否   |
| style           | `string \| Record<string, string>`                         |      | 是   |
| onError         | `() => boolean`                                            |      | 是   |

## CardProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| header          | `string`                           |      | 是   |
| bodyStyle       | `Record<string, string>`           |      | 是   |
| shadow          | `'always' \| 'hover' \| 'never'`   |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## CardSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| header  | `() => VNode[]` |      | 是   |

## CardSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| header          | `string`                           |      | 否   |
| bodyStyle       | `Record<string, string>`           |      | 否   |
| shadow          | `'always' \| 'hover' \| 'never'`   |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |

## TimelineItem

**Interface**

### 成员

| 名称          | 类型                                                        | 描述 | 可选 |
| ------------- | ----------------------------------------------------------- | ---- | ---- |
| color         | `string`                                                    |      | 是   |
| type          | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` |      | 是   |
| size          | `'large' \| 'default' \| 'small'`                           |      | 是   |
| dot           | `VNode \| string`                                           |      | 是   |
| timestamp     | `string`                                                    |      | 是   |
| placement     | `'top' \| 'bottom'`                                         |      | 是   |
| hideTimestamp | `boolean`                                                   |      | 是   |
| content       | `string \| VNode`                                           |      | 是   |

## TimelineProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| reverse         | `boolean`                          |      | 是   |
| mode            | `'left' \| 'right' \| 'alternate'` |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## TimelineSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## TimelineSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| reverse         | `boolean`                          |      | 否   |
| mode            | `'left' \| 'right' \| 'alternate'` |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |

## TimelineItemProps

**Interface**

### 成员

| 名称            | 类型                                                        | 描述 | 可选 |
| --------------- | ----------------------------------------------------------- | ---- | ---- |
| color           | `string`                                                    |      | 是   |
| type            | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` |      | 是   |
| size            | `'large' \| 'default' \| 'small'`                           |      | 是   |
| dot             | `VNode \| string`                                           |      | 是   |
| timestamp       | `string`                                                    |      | 是   |
| placement       | `'top' \| 'bottom'`                                         |      | 是   |
| hideTimestamp   | `boolean`                                                   |      | 是   |
| class           | `string`                                                    |      | 是   |
| style           | `string \| Record<string, string>`                          |      | 是   |
| id              | `string`                                                    |      | 是   |
| ariaLabel       | `string`                                                    |      | 是   |
| ariaDescribedBy | `string`                                                    |      | 是   |

## TimelineItemSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| dot     | `() => VNode[]` |      | 是   |

## TimelineItemSetupProps

**Interface**

### 成员

| 名称            | 类型                                                        | 描述 | 可选 |
| --------------- | ----------------------------------------------------------- | ---- | ---- |
| color           | `string`                                                    |      | 否   |
| type            | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` |      | 否   |
| size            | `'large' \| 'default' \| 'small'`                           |      | 否   |
| dot             | `VNode \| string`                                           |      | 否   |
| timestamp       | `string`                                                    |      | 否   |
| placement       | `'top' \| 'bottom'`                                         |      | 否   |
| hideTimestamp   | `boolean`                                                   |      | 否   |
| class           | `string`                                                    |      | 否   |
| id              | `string`                                                    |      | 否   |
| ariaLabel       | `string`                                                    |      | 否   |
| ariaDescribedBy | `string`                                                    |      | 否   |
| style           | `string \| Record<string, string>`                          |      | 是   |

## Step

**Interface**

### 成员

| 名称        | 类型                                                      | 描述 | 可选 |
| ----------- | --------------------------------------------------------- | ---- | ---- |
| title       | `string`                                                  |      | 是   |
| description | `string`                                                  |      | 是   |
| icon        | `string \| VNode`                                         |      | 是   |
| status      | `'wait' \| 'process' \| 'finish' \| 'error' \| 'success'` |      | 是   |

## StepsProps

**Interface**

### 成员

| 名称            | 类型                                                      | 描述 | 可选 |
| --------------- | --------------------------------------------------------- | ---- | ---- |
| active          | `number`                                                  |      | 是   |
| processStatus   | `'process' \| 'finish' \| 'error' \| 'success'`           |      | 是   |
| finishStatus    | `'wait' \| 'process' \| 'finish' \| 'error' \| 'success'` |      | 是   |
| direction       | `'horizontal' \| 'vertical'`                              |      | 是   |
| alignCenter     | `boolean`                                                 |      | 是   |
| simple          | `boolean`                                                 |      | 是   |
| class           | `string`                                                  |      | 是   |
| style           | `string \| Record<string, string>`                        |      | 是   |
| id              | `string`                                                  |      | 是   |
| ariaLabel       | `string`                                                  |      | 是   |
| ariaDescribedBy | `string`                                                  |      | 是   |
| onChange        | `(active: number) => void`                                |      | 是   |

## StepsSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## StepsSetupProps

**Interface**

### 成员

| 名称            | 类型                                                      | 描述 | 可选 |
| --------------- | --------------------------------------------------------- | ---- | ---- |
| active          | `number`                                                  |      | 否   |
| processStatus   | `'process' \| 'finish' \| 'error' \| 'success'`           |      | 否   |
| finishStatus    | `'wait' \| 'process' \| 'finish' \| 'error' \| 'success'` |      | 否   |
| direction       | `'horizontal' \| 'vertical'`                              |      | 否   |
| alignCenter     | `boolean`                                                 |      | 否   |
| simple          | `boolean`                                                 |      | 否   |
| class           | `string`                                                  |      | 否   |
| id              | `string`                                                  |      | 否   |
| ariaLabel       | `string`                                                  |      | 否   |
| ariaDescribedBy | `string`                                                  |      | 否   |
| style           | `string \| Record<string, string>`                        |      | 是   |
| onChange        | `(active: number) => void`                                |      | 是   |

## StepProps

**Interface**

### 成员

| 名称            | 类型                                                      | 描述 | 可选 |
| --------------- | --------------------------------------------------------- | ---- | ---- |
| title           | `string`                                                  |      | 是   |
| description     | `string`                                                  |      | 是   |
| icon            | `string \| VNode`                                         |      | 是   |
| status          | `'wait' \| 'process' \| 'finish' \| 'error' \| 'success'` |      | 是   |
| class           | `string`                                                  |      | 是   |
| style           | `string \| Record<string, string>`                        |      | 是   |
| id              | `string`                                                  |      | 是   |
| ariaLabel       | `string`                                                  |      | 是   |
| ariaDescribedBy | `string`                                                  |      | 是   |

## StepSlots

**Interface**

### 成员

| 名称        | 类型            | 描述 | 可选 |
| ----------- | --------------- | ---- | ---- |
| default     | `() => VNode[]` |      | 是   |
| icon        | `() => VNode[]` |      | 是   |
| title       | `() => VNode[]` |      | 是   |
| description | `() => VNode[]` |      | 是   |

## StepSetupProps

**Interface**

### 成员

| 名称            | 类型                                                      | 描述 | 可选 |
| --------------- | --------------------------------------------------------- | ---- | ---- |
| title           | `string`                                                  |      | 否   |
| description     | `string`                                                  |      | 否   |
| icon            | `string \| VNode`                                         |      | 否   |
| status          | `'wait' \| 'process' \| 'finish' \| 'error' \| 'success'` |      | 否   |
| class           | `string`                                                  |      | 否   |
| id              | `string`                                                  |      | 否   |
| ariaLabel       | `string`                                                  |      | 否   |
| ariaDescribedBy | `string`                                                  |      | 否   |
| style           | `string \| Record<string, string>`                        |      | 是   |

## CarouselProps

**Interface**

### 成员

| 名称              | 类型                                         | 描述 | 可选 |
| ----------------- | -------------------------------------------- | ---- | ---- |
| initialIndex      | `number`                                     |      | 是   |
| height            | `string`                                     |      | 是   |
| trigger           | `'click' \| 'hover'`                         |      | 是   |
| autoplay          | `boolean`                                    |      | 是   |
| interval          | `number`                                     |      | 是   |
| indicatorPosition | `'outside' \| 'none'`                        |      | 是   |
| arrow             | `'always' \| 'hover' \| 'never'`             |      | 是   |
| type              | `'' \| 'card'`                               |      | 是   |
| loop              | `boolean`                                    |      | 是   |
| direction         | `'horizontal' \| 'vertical'`                 |      | 是   |
| class             | `string`                                     |      | 是   |
| style             | `string \| Record<string, string>`           |      | 是   |
| id                | `string`                                     |      | 是   |
| ariaLabel         | `string`                                     |      | 是   |
| ariaDescribedBy   | `string`                                     |      | 是   |
| onChange          | `(index: number, prevIndex: number) => void` |      | 是   |

## CarouselSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## CarouselSetupProps

**Interface**

### 成员

| 名称              | 类型                                         | 描述 | 可选 |
| ----------------- | -------------------------------------------- | ---- | ---- |
| initialIndex      | `number`                                     |      | 否   |
| height            | `string`                                     |      | 否   |
| trigger           | `'click' \| 'hover'`                         |      | 否   |
| autoplay          | `boolean`                                    |      | 否   |
| interval          | `number`                                     |      | 否   |
| indicatorPosition | `'outside' \| 'none'`                        |      | 否   |
| arrow             | `'always' \| 'hover' \| 'never'`             |      | 否   |
| type              | `'' \| 'card'`                               |      | 否   |
| loop              | `boolean`                                    |      | 否   |
| direction         | `'horizontal' \| 'vertical'`                 |      | 否   |
| class             | `string`                                     |      | 否   |
| id                | `string`                                     |      | 否   |
| ariaLabel         | `string`                                     |      | 否   |
| ariaDescribedBy   | `string`                                     |      | 否   |
| style             | `string \| Record<string, string>`           |      | 是   |
| onChange          | `(index: number, prevIndex: number) => void` |      | 是   |

## CarouselItemProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| name            | `string \| number`                 |      | 是   |
| label           | `string`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |

## CarouselItemSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |

## CarouselItemSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| name            | `string \| number`                 |      | 否   |
| label           | `string`                           |      | 否   |
| class           | `string`                           |      | 否   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |

## PopconfirmProps

**Interface**

### 成员

| 名称              | 类型                               | 描述 | 可选 |
| ----------------- | ---------------------------------- | ---- | ---- |
| title             | `string`                           |      | 是   |
| confirmButtonText | `string`                           |      | 是   |
| cancelButtonText  | `string`                           |      | 是   |
| confirmButtonType | `string`                           |      | 是   |
| cancelButtonType  | `string`                           |      | 是   |
| icon              | `string`                           |      | 是   |
| iconColor         | `string`                           |      | 是   |
| hideIcon          | `boolean`                          |      | 是   |
| disabled          | `boolean`                          |      | 是   |
| width             | `number`                           |      | 是   |
| class             | `string`                           |      | 是   |
| style             | `string \| Record<string, string>` |      | 是   |
| id                | `string`                           |      | 是   |
| ariaLabel         | `string`                           |      | 是   |
| ariaDescribedBy   | `string`                           |      | 是   |
| onConfirm         | `() => void`                       |      | 是   |
| onCancel          | `() => void`                       |      | 是   |

## PopconfirmSlots

**Interface**

### 成员

| 名称      | 类型            | 描述 | 可选 |
| --------- | --------------- | ---- | ---- |
| default   | `() => VNode[]` |      | 是   |
| reference | `() => VNode[]` |      | 是   |
| icon      | `() => VNode[]` |      | 是   |

## PopconfirmSetupProps

**Interface**

### 成员

| 名称              | 类型                               | 描述 | 可选 |
| ----------------- | ---------------------------------- | ---- | ---- |
| title             | `string`                           |      | 否   |
| confirmButtonText | `string`                           |      | 否   |
| cancelButtonText  | `string`                           |      | 否   |
| confirmButtonType | `string`                           |      | 否   |
| cancelButtonType  | `string`                           |      | 否   |
| icon              | `string`                           |      | 否   |
| iconColor         | `string`                           |      | 否   |
| hideIcon          | `boolean`                          |      | 否   |
| disabled          | `boolean`                          |      | 否   |
| width             | `number`                           |      | 否   |
| class             | `string`                           |      | 否   |
| style             | `string \| Record<string, string>` |      | 是   |
| id                | `string`                           |      | 否   |
| ariaLabel         | `string`                           |      | 否   |
| ariaDescribedBy   | `string`                           |      | 否   |
| onConfirm         | `() => void`                       |      | 是   |
| onCancel          | `() => void`                       |      | 是   |

## RichTextEditorProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `string`                           |      | 是   |
| placeholder     | `string`                           |      | 是   |
| disabled        | `boolean`                          |      | 是   |
| readonly        | `boolean`                          |      | 是   |
| height          | `string`                           |      | 是   |
| class           | `string`                           |      | 是   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 是   |
| ariaLabel       | `string`                           |      | 是   |
| ariaDescribedBy | `string`                           |      | 是   |
| onInput         | `(value: string) => void`          |      | 是   |
| onFocus         | `(event: FocusEvent) => void`      |      | 是   |
| onBlur          | `(event: FocusEvent) => void`      |      | 是   |

## RichTextEditorSlots

**Interface**

### 成员

| 名称    | 类型            | 描述 | 可选 |
| ------- | --------------- | ---- | ---- |
| default | `() => VNode[]` |      | 是   |
| toolbar | `() => VNode[]` |      | 是   |

## RichTextEditorSetupProps

**Interface**

### 成员

| 名称            | 类型                               | 描述 | 可选 |
| --------------- | ---------------------------------- | ---- | ---- |
| modelValue      | `string`                           |      | 否   |
| placeholder     | `string`                           |      | 否   |
| disabled        | `boolean`                          |      | 否   |
| readonly        | `boolean`                          |      | 否   |
| height          | `string`                           |      | 否   |
| class           | `string`                           |      | 否   |
| style           | `string \| Record<string, string>` |      | 是   |
| id              | `string`                           |      | 否   |
| ariaLabel       | `string`                           |      | 否   |
| ariaDescribedBy | `string`                           |      | 否   |
| onInput         | `(value: string) => void`          |      | 是   |
| onFocus         | `(event: FocusEvent) => void`      |      | 是   |
| onBlur          | `(event: FocusEvent) => void`      |      | 是   |

## Upload

**Variable**

## VaporBadgeProps

**Interface**

### 成员

| 名称   | 类型                                                        | 描述 | 可选 |
| ------ | ----------------------------------------------------------- | ---- | ---- |
| value  | `string \| number`                                          |      | 是   |
| max    | `number`                                                    |      | 是   |
| isDot  | `boolean`                                                   |      | 是   |
| hidden | `boolean`                                                   |      | 是   |
| type   | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` |      | 是   |
| class  | `string`                                                    |      | 是   |

## VaporBadge

**Variable**

## VaporButtonProps

**Interface**

### 成员

| 名称       | 类型                                                                     | 描述 | 可选 |
| ---------- | ------------------------------------------------------------------------ | ---- | ---- |
| type       | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'default'` |      | 是   |
| size       | `'large' \| 'medium' \| 'small'`                                         |      | 是   |
| disabled   | `boolean`                                                                |      | 是   |
| loading    | `boolean`                                                                |      | 是   |
| plain      | `boolean`                                                                |      | 是   |
| round      | `boolean`                                                                |      | 是   |
| circle     | `boolean`                                                                |      | 是   |
| nativeType | `'button' \| 'submit' \| 'reset'`                                        |      | 是   |
| class      | `string`                                                                 |      | 是   |
| style      | `string`                                                                 |      | 是   |
| onClick    | `(event: MouseEvent) => void`                                            |      | 是   |

## VaporButton

**Variable**

## VaporInputProps

**Interface**

### 成员

| 名称         | 类型                                                                          | 描述 | 可选 |
| ------------ | ----------------------------------------------------------------------------- | ---- | ---- |
| type         | `'text' \| 'password' \| 'email' \| 'number' \| 'tel' \| 'url' \| 'textarea'` |      | 是   |
| modelValue   | `string \| number`                                                            |      | 是   |
| placeholder  | `string`                                                                      |      | 是   |
| disabled     | `boolean`                                                                     |      | 是   |
| readonly     | `boolean`                                                                     |      | 是   |
| clearable    | `boolean`                                                                     |      | 是   |
| showPassword | `boolean`                                                                     |      | 是   |
| size         | `'large' \| 'medium' \| 'small'`                                              |      | 是   |
| class        | `string`                                                                      |      | 是   |
| style        | `string`                                                                      |      | 是   |
| onInput      | `(value: string) => void`                                                     |      | 是   |
| onChange     | `(value: string) => void`                                                     |      | 是   |
| onFocus      | `(event: FocusEvent) => void`                                                 |      | 是   |
| onBlur       | `(event: FocusEvent) => void`                                                 |      | 是   |
| onClear      | `() => void`                                                                  |      | 是   |

## VaporInput

**Variable**

## VaporListProps

**Interface**

### 成员

| 名称        | 类型                                                     | 描述 | 可选 |
| ----------- | -------------------------------------------------------- | ---- | ---- |
| data        | `T[] \| Signal<T[]>`                                     |      | 否   |
| keyFn       | `(item: T, index: number) => string \| number`           |      | 否   |
| renderItem  | `(item: T, index: number) => VNode \| VNode[]`           |      | 否   |
| emptyRender | `() => VNode \| VNode[]`                                 |      | 是   |
| class       | `string`                                                 |      | 是   |
| style       | `string`                                                 |      | 是   |
| onMount     | `(item: T, index: number, element: HTMLElement) => void` |      | 是   |
| onUnmount   | `(item: T, index: number, element: HTMLElement) => void` |      | 是   |

## VaporList

**Variable**

## MenuItem

**Interface**

### 成员

| 名称     | 类型         | 描述 | 可选 |
| -------- | ------------ | ---- | ---- |
| index    | `string`     |      | 否   |
| label    | `string`     |      | 否   |
| disabled | `boolean`    |      | 是   |
| children | `MenuItem[]` |      | 是   |
| icon     | `VNode`      |      | 是   |

## VaporMenuItemProps

**Interface**

### 成员

| 名称     | 类型      | 描述 | 可选 |
| -------- | --------- | ---- | ---- |
| index    | `string`  |      | 否   |
| label    | `string`  |      | 否   |
| disabled | `boolean` |      | 是   |
| icon     | `VNode`   |      | 是   |

## VaporSubMenuProps

**Interface**

### 成员

| 名称     | 类型      | 描述 | 可选 |
| -------- | --------- | ---- | ---- |
| index    | `string`  |      | 否   |
| label    | `string`  |      | 否   |
| disabled | `boolean` |      | 是   |

## VaporMenuProps

**Interface**

### 成员

| 名称           | 类型                         | 描述 | 可选 |
| -------------- | ---------------------------- | ---- | ---- |
| mode           | `'horizontal' \| 'vertical'` |      | 是   |
| defaultActive  | `string`                     |      | 是   |
| defaultOpeneds | `string[]`                   |      | 是   |
| uniqueOpened   | `boolean`                    |      | 是   |
| class          | `string`                     |      | 是   |
| style          | `string`                     |      | 是   |
| items          | `MenuItem[]`                 |      | 是   |
| onSelect       | `(index: string) => void`    |      | 是   |
| onOpen         | `(index: string) => void`    |      | 是   |
| onClose        | `(index: string) => void`    |      | 是   |

## VaporMenuItem

**Variable**

## VaporSubMenu

**Variable**

## VaporMenu

**Variable**

## SelectOption

**Interface**

### 成员

| 名称     | 类型               | 描述 | 可选 |
| -------- | ------------------ | ---- | ---- |
| value    | `string \| number` |      | 否   |
| label    | `string`           |      | 否   |
| disabled | `boolean`          |      | 是   |

## VaporSelectProps

**Interface**

### 成员

| 名称        | 类型                                                        | 描述 | 可选 |
| ----------- | ----------------------------------------------------------- | ---- | ---- |
| modelValue  | `string \| number \| (string \| number)[]`                  |      | 是   |
| options     | `SelectOption[]`                                            |      | 否   |
| placeholder | `string`                                                    |      | 是   |
| disabled    | `boolean`                                                   |      | 是   |
| clearable   | `boolean`                                                   |      | 是   |
| multiple    | `boolean`                                                   |      | 是   |
| size        | `'large' \| 'medium' \| 'small'`                            |      | 是   |
| class       | `string`                                                    |      | 是   |
| style       | `string`                                                    |      | 是   |
| onChange    | `(value: string \| number \| (string \| number)[]) => void` |      | 是   |

## VaporSelect

**Variable**

## TabPane

**Interface**

### 成员

| 名称     | 类型      | 描述 | 可选 |
| -------- | --------- | ---- | ---- |
| label    | `string`  |      | 否   |
| name     | `string`  |      | 否   |
| disabled | `boolean` |      | 是   |
| closable | `boolean` |      | 是   |

## VaporTabPaneProps

**Interface**

### 成员

| 名称     | 类型      | 描述 | 可选 |
| -------- | --------- | ---- | ---- |
| label    | `string`  |      | 否   |
| name     | `string`  |      | 否   |
| disabled | `boolean` |      | 是   |
| closable | `boolean` |      | 是   |

## VaporTabsProps

**Interface**

### 成员

| 名称        | 类型                                     | 描述 | 可选 |
| ----------- | ---------------------------------------- | ---- | ---- |
| modelValue  | `string`                                 |      | 是   |
| panes       | `TabPane[]`                              |      | 是   |
| type        | `'' \| 'card' \| 'border-card'`          |      | 是   |
| closable    | `boolean`                                |      | 是   |
| class       | `string`                                 |      | 是   |
| style       | `string`                                 |      | 是   |
| onChange    | `(name: string) => void`                 |      | 是   |
| onTabClick  | `(pane: TabPane, index: number) => void` |      | 是   |
| onTabRemove | `(name: string) => void`                 |      | 是   |

## VaporTabPane

**Variable**

## VaporTabs

**Variable**

## VaporTagProps

**Interface**

### 成员

| 名称               | 类型                                                        | 描述 | 可选 |
| ------------------ | ----------------------------------------------------------- | ---- | ---- |
| type               | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` |      | 是   |
| closable           | `boolean`                                                   |      | 是   |
| disableTransitions | `boolean`                                                   |      | 是   |
| hit                | `boolean`                                                   |      | 是   |
| color              | `string`                                                    |      | 是   |
| size               | `'large' \| 'default' \| 'small'`                           |      | 是   |
| round              | `boolean`                                                   |      | 是   |
| class              | `string`                                                    |      | 是   |
| onClose            | `(event: MouseEvent) => void`                               |      | 是   |

## VaporTag

**Variable**

## LytUI

**Variable**

创建 LytJS UI 插件
