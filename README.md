# 教学工具集

上海高中英语教学工具集。左侧六个功能都在：

- 默写纸生成器
- 成绩小分条生成器
- 试卷生成器（原来的组卷界面嵌在工具集里）
- 英文报阅读排版（上传 SSP PDF，导出试卷 Word / 答案 Word，并可生成门口易测答题纸）
- 问题报告
- 日志查看（管理员）

## 安装

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
cd exam-paper && npm install && cd ..
```

宋体 `simsun.ttc` 和成绩小分条模板 `template.xlsx` 已在仓库根目录。

## 启动

```bash
./start.sh
```

浏览器打开：**http://127.0.0.1:8501**

同一校园网的同事打开启动时打印的 `http://你的IP:8501`。用完后在运行窗口按 `Ctrl+C`。
