# 上海高中英语试卷生成器

本地运行的试卷排版工具：先确认题型构成，再在三栏界面录入题目与答案，并导出 Word / PDF。

## 功能

1. **选择题型**  
   Listening / Grammar / Vocabulary / Cloze / Reading A·B·C / Section C / Summary Writing / Translation / Guided Writing / 自定义  
   - 可勾选或取消  
   - 同一题型可设多份，试卷中以 (A)、(B) 区分  
   - Translation 可设置句数与各题分值（如 4+4+4+5）

2. **三栏组卷**  
   - 左：各大题标题（可拖拽排序）  
   - 中：题目内容 + 参考答案  
   - 右：实时预览，可切换「试卷纸 / 答案纸」

3. **版式默认**  
   - 字号：五号（10.5 pt）  
   - 行距：1.2  
   - 英文：Times New Roman  
   - 中文：宋体  

4. **导出**  
   - Word（DOCX）  
   - 打印 / 另存为 PDF（浏览器打印）

## 启动

```bash
npm install
node server.js
```

打开：<http://127.0.0.1:4173>

## 使用流程

1. 在首页勾选需要的题型，必要时调整份数与 Translation 分值  
2. 点击「确认并进入组卷」  
3. 左侧点选大题，中间粘贴题目与答案  
4. 右侧预览满意后导出 Word，或用「打印 / PDF」保存 PDF
