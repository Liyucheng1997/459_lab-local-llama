# 本地无审查 LLM：Gemma 4 E4B (HauhauCS Aggressive)

纯本地运行，断网可用，数据不出电脑。

## 首次安装

仓库里不包含模型和运行库（太大），克隆后按下面放好文件：

1. 从 [llama.cpp b12541](https://github.com/ggml-org/llama.cpp/releases/tag/b12541) 下载 `llama-b12541-bin-win-cuda-13.5-x64.zip` 和 `cudart-llama-bin-win-cuda-13.5-x64.zip`，都解压到 `llama.cpp/`（N 卡用 CUDA 版；其他显卡可用 Vulkan 版）
2. 从 [模型页面](https://huggingface.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive/tree/main) 下载 `Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Q8_K_P.gguf` 和 `mmproj-Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-f16.gguf`，放进 `models/`
   - 显存小于 10 GB 可以换成 Q4_K_M（约 5.3 GB），并改 `start-chat.bat` 里的 `MODEL`

## 使用

双击 **`start-chat.bat`**，等几秒后浏览器会自动打开 http://127.0.0.1:8080 ，在网页里直接聊天，也可以上传图片。
关闭黑色命令行窗口就会停止模型。

## 聊天界面（`web/`）

自己写的苹果风前端，纯静态文件，不连外网，由 llama-server 直接提供（启动参数 `--path web`）。

- 对话列表：自动保存在浏览器的 IndexedDB 里，按今天 / 昨天 / 最近 7 天分组，可以重命名、删除
- 顶栏「直接回答 / 先思考」：切换模型回答前是否先思考；思考过程可以展开查看
- 图片：点图片按钮、粘贴或拖进输入框都可以，会先压缩到 1536px 以内
- 每条回答显示 token 数和生成速度，可以复制、重新生成；用户消息可以编辑后重新发送
- 设置：系统提示词、温度、Top P、Top K、单次最多输出
- 深色模式、导出当前对话为 Markdown、窄屏自适应

想换回 llama.cpp 自带的界面，把 `start-chat.bat` 里的 `--path web` 删掉即可。

## 目录

| 路径 | 内容 |
|---|---|
| `models/…-Q8_K_P.gguf` | 主模型（Q8_K_P，约 8.1 GB，几乎无损） |
| `models/mmproj-…-f16.gguf` | 视觉模块（看图用，约 1 GB） |
| `llama.cpp/` | llama.cpp b12541，CUDA 13.5 版（官方 ggml-org 发布） |
| `start-chat.bat` | 启动脚本，上下文长度、端口等参数可在开头修改 |

## 参数

- 采样参数取 Google 官方推荐值：`temperature=1.0, top_p=0.95, top_k=64`
- `-ngl 99`：全部层放进显卡（RTX 5080 Laptop 16 GB）
- `-c 32768`：上下文长度，最大 131072，调大会多占显存
- 服务只监听 127.0.0.1，局域网里的其他设备访问不到

## 兼容 OpenAI 的 API

服务运行时，可以把其他工具指向 `http://127.0.0.1:8080/v1`（API Key 随便填）。

## 来源

- 模型：https://huggingface.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive （Gemma 许可证）
- 运行库：https://github.com/ggml-org/llama.cpp/releases/tag/b12541
