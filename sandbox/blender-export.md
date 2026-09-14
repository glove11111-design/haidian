# Blender 导出约定（建筑单体 → glTF / GLB）

给设计师用的短清单。网页沙盘按 **米** 加载 glTF 2.0，并认 `Floor_01` 这类楼层名。导出前对一次，导入后就能分层、点选房间。

## 1. 单位用米

- 场景单位：Metric，Unit Scale `1.000000`，Length 选 **Meters**。
- 按真实尺寸建模：层高大约 `3.5–4.5 m`，不要用毫米数值（例如把门写成 `2100`）。
- 若已按毫米建完：选中全部，缩放到 `0.001`，再 **Apply Scale**。沙盘在最大边超过 250 时也会尝试按毫米缩放，但不应当作正式流程。

## 2. 应用缩放（Apply Scale）

导出前对建筑相关物体执行：

`Object → Apply → Scale`（或全选后 `Ctrl+A` → Scale）

位置、旋转如有非 1 的缩放，也建议 Apply Rotation & Scale。不应用的话，网页里尺寸和法线容易错。

## 3. 按楼层命名，房间做子级

物体（Empty / 集合实例 / 网格父级均可）名称：

```text
Floor_01
Floor_02
Floor_03
```

两位数字，下划线。一层就是 `Floor_01`，不要写成 `floor1`、`1F` 混用（沙盘能认一部分别名，但请以 `Floor_XX` 为准）。

房间是对应楼层的 **子物体**，用可读名字：

```text
Floor_01
  ├─ 一层门厅
  ├─ 接待室
  ├─ 设备间
  └─ 楼梯间
Floor_02
  ├─ 开放办公
  └─ 会议室A
```

原点放在 **地面中心附近**，建筑坐在世界原点、贴地（Z = 0）。Blender 为 Z-up；官方 glTF 导出器会转到 Y-up，网页端按这个约定加载。

## 4. 不要把整栋楼合成一块网格

不要对整栋建筑 `Join` / Boolean 成一个 Mesh，也不要在导出时勾选把全部物体合并。

一块网格 = 无法按层显隐、无法点选房间。

可以：

- 每个房间一个网格（体块或带厚度的空间均可）
- 楼板、核心筒单独物体，放在所属 `Floor_XX` 下
- 需要的话用集合管理，但导出时仍要保留物体层级与名称

不要：

- 全部 Join 成 `Building`
- 导出成仅有一个 mesh 的 GLB
- 用「合并按材质」把不同房间拼掉

## 5. 导出 glTF 2.0

`File → Export → glTF 2.0 (.glb/.gltf)`

推荐：

- 格式：**glTF Binary (`.glb`)**，单文件
- Include：选中物体即可；或导出场景里建筑相关集合
- Transform：`+Y Up` 保持勾选（Blender 默认）
- Geometry：Apply Modifiers 勾选
- Compression（Draco）可关，体量不大时更省事；若开启，确认网页加载器支持（本沙盘默认 GLTFLoader，未接 Draco 扩展时请勿压缩）

把文件放到沙盘：

```text
sandbox/public/models/building.glb
```

也可在页面里拖入 / 点「导入」临时替换。正式展示请用上述路径再 `npm run build`。

## 6. 体积与面数

单体目标尽量压到几十 MB 以内。展示用体块、适度细分即可，不要把雕刻或未塌陷的 Subdivision 直接导出。贴图有的话用 JPEG/WebP，并检查是否重复打包超大贴图。

## 导出前 30 秒检查

- [ ] 单位是米，Scale 已 Apply
- [ ] 楼层名为 `Floor_01`、`Floor_02`…
- [ ] 房间是楼层子级，且各是独立网格
- [ ] 没有整栋 Join
- [ ] 导出 `.glb`（glTF 2.0，未强制 Draco）
- [ ] 文件名为 `building.glb` 或准备在页面里导入
