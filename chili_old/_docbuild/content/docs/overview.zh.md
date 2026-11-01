---
title: 概览
short: 概览
desc: 文档站首页:这份参考怎么从 chili_old 源码自动生成、第一次用 Chili 该按什么顺序读，以及项目规模统计
id: overview-top
order: 10
---

# Chili UI 控件库 API 参考

Date time：2026-11-1 **当你在构建这个文档并想要PR提交时，应该注意编写这个时间 [这是为了让读者明白这些内容的实时性，同时在别人发给你一份打包的HTML，通过时间可以确认它们之间的版本]**

> [!lead] 本页由 `chili_old` 目录下的全部 Lua 源码自动解析生成，逐一列出每个类的**可用属性**与**可用函数**（含从父类继承来的成员），并附源码文件清单、加载顺序与皮肤（skin）配置速查，结构参照 ldoc 风格的 [ChiliUI gajop API](https://gajop.github.io/chiliui/modules/controls.control.html)。

> [!ok] **第一次用 Chili？** 先看 [**新手起步**](#guide-start)：从装好框架到写出第一个窗口的完整流程、怎么确定该用哪个类、怎么在这份文档里查属性和函数；接着是 [示例讲解](#guide-examples)、[重要函数与常用模式](#guide-functions)、[常见问题与避坑](#guide-faq)。所有示例 widget 都在 `LuaUI/Widgets/chili_demo_*.lua`。

[[stats]]
