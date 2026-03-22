# 编辑器样式修复记录

> 日期：2026-03-22
> 问题：编辑器中 H1/H2 标题与段落样式没有明显区分

---

## 问题描述

用户反馈编辑器中各种段落的样式没有区分，H1 和 P 的样式看不出区别。

---

## 方案二：自定义编辑器样式（已实施）

### 实现方式

创建专门的编辑器样式文件，明确定义所有元素的样式。

### 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/styles/editor.css` | 新建 | 编辑器样式定义 |
| `app/(dashboard)/editor/[docId]/page.tsx` | 修改 | 导入样式，移除 `prose` 类 |
| `lib/editor/use-editor.ts` | 修改 | 移除 `prose` 类 |

### 样式特点

- **H1**: 2.25rem 字号，700 粗体
- **H2**: 1.875rem 字号，600 粗体
- **H3**: 1.5rem 字号，600 粗体
- **段落**: 1rem 字号，1.75 行高
- **引用/代码块**: 独立样式
- **深色模式**: 完整支持

### 优点

- 完全可控
- 不依赖外部插件
- 样式明确

### 缺点

- 需要维护自定义样式
- 代码量较多

---

## 方案一：修复 Tailwind Typography（待测试）

### 实现方式

确保 Tailwind CSS v4 的 Typography 插件正确配置和加载。

### 需要修改

1. 安装 `@tailwindcss/typography` 插件（如未安装）
2. 在 PostCSS/Tailwind 配置中启用
3. 在 `globals.css` 中添加 `@plugin` 指令

### 优点

- 使用官方插件
- 样式自动适配
- 代码量少

### 缺点

- Tailwind v4 的 Typography 插件可能还在适配中
- 自定义程度较低

---

## 后续决定

待测试方案一效果后决定采用哪个方案。

---

**状态**: ✅ 方案二已采用

---

## 最终决定

采用 **方案二（自定义样式）**，原因：
- Tailwind Typography 插件在 Tailwind v4 下效果不理想
- 自定义样式更可控，可以精确调整每个元素的视觉效果
- 不依赖外部插件，减少依赖

---

## 最终修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/styles/editor.css` | 新建 | 编辑器样式定义 |
| `app/(dashboard)/editor/[docId]/page.tsx` | 修改 | 导入样式，使用 `tiptap` 类 |
| `lib/editor/use-editor.ts` | 修改 | 使用 `tiptap` 类 |
| `packages/ui/src/styles/globals.css` | 修改 | 移除 Typography 插件 |
