# 贡献指南

感谢你对 Pin Definition By Underline 项目的关注！我们欢迎所有形式的贡献。

## 📖 文档结构

本项目采用清晰的文档分离结构：

```
pin-definition-by-underline/
├── README.md          # 项目介绍、Lapis集成指南、核心特性
├── CHANGELOG.md       # 完整版本历史、问题分析、解决方案
├── CONTRIBUTING.md    # 本文档 - 贡献指南
├── test-summary.md    # 测试覆盖和验证结果
└── test-report.md     # 自动生成的测试报告
```

### 文档职责

- **README.md** - Lapis集成指南、核心特性、使用示例
- **CHANGELOG.md** - 记录版本演进，包含详细的问题分析和解决方案
- **CONTRIBUTING.md** - 贡献流程、开发规范、文档维护指南
- **test-summary.md** - 测试覆盖说明和技术验证

## 🚀 快速开始

### 环境准备

```bash
# 克隆项目
git clone https://github.com/L-M-Sherlock/pin-definition-by-underline.git
cd pin-definition-by-underline

# 安装依赖
npm install

# 运行测试
npm test
# 或
./test.sh
```

### 开发流程

1. **Fork 项目** - 在 GitHub 上 fork 本仓库
2. **创建分支** - 为你的功能创建新分支
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **编写代码** - 进行你的修改
4. **运行测试** - 确保所有测试通过
   ```bash
   ./test.sh
   ```
5. **提交代码** - 使用清晰的提交信息
   ```bash
   git commit -m "feat: 添加新功能描述"
   ```
6. **推送分支** - 推送到你的 fork
   ```bash
   git push origin feature/your-feature-name
   ```
7. **创建 PR** - 在 GitHub 上创建 Pull Request

## 📝 提交规范

### Commit Message 格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式（不影响功能）
- `refactor` - 重构
- `test` - 测试相关
- `chore` - 构建/工具链相关

#### 示例

```bash
# 新功能
git commit -m "feat: 添加多下划线支持"

# Bug 修复
git commit -m "fix: 修复 def0 块识别问题"

# 文档更新
git commit -m "docs: 更新 README 使用示例"

# 测试
git commit -m "test: 添加子释义处理测试用例"
```

## 🧪 测试规范

### 运行测试

```bash
# 运行完整测试套件
./test.sh

# 运行 Node.js 测试
npm test

# 清理测试输出
./test.sh --clean

# 生成测试报告
./test.sh --report
```

### 添加测试用例

如果你修复了 bug 或添加了新功能，请添加相应的测试用例：

1. 在 `cases/` 目录创建新的 HTML 测试文件
2. 确保文件包含：
   - 完整的 Yomitan 词典结构
   - 带 `<u>` 标记的目标释义
   - 代表性的测试场景
3. 运行测试确保通过
4. 更新 `test-summary.md`（如需要）

### 测试覆盖要求

- ✅ 所有修改必须通过现有测试
- ✅ 新功能需要添加对应测试
- ✅ Bug 修复需要添加回归测试

## 📄 文档维护

### 更新 README.md

当添加新功能或修改现有功能时：

1. 更新"核心特性"章节（如适用）
2. 更新"使用示例"（如适用）
3. 更新"技术细节"（如涉及算法变更）
4. 保持简洁，避免冗长说明

### 更新 CHANGELOG.md

每个版本发布时，在 `CHANGELOG.md` 顶部添加新版本记录：

```markdown
## [vX.Y.Z] - YYYY-MM-DD

### 🔧 修复 / ✨ 新功能
- **简短描述**：问题说明
  - **问题描述**：详细说明遇到的问题
  - **根本原因**：分析问题的根本原因
  - **解决方案**：说明如何解决

### 💡 核心洞察
关键的设计思考和技术决策

### 📝 代码示例
```javascript
// 关键代码示例
```

### ✅ 测试用例验证
- `test-case.html`：预期结果 → 实际结果 ✅

### 🎯 设计原则
**原则名称** - 原则说明
```

### 文档格式规范

- 使用清晰的标题层级
- 使用图标增强可读性（🎯 ✨ 🔧 💡 等）
- 代码块使用正确的语法高亮
- 保持一致的格式和风格

## 🎯 代码规范

### JavaScript 规范

```javascript
// ✅ 好的实践
function pinByUnderline() {
    // 清晰的变量命名
    const targetDef = underlinedElement.closest('div[data-sc-class="def1"]');
    
    // 适当的注释（解释"为什么"，而非"是什么"）
    // 使用最近的 def1 with .num，避免跨越独立块
    const blockStartElement = findBlockStart(targetDef);
}

// ❌ 避免的实践
function pin() {  // 命名不清晰
    const x = el.closest('div');  // 变量名太简单
    // todo: fix this  // 无意义的注释
}
```

### 命名规范

- **函数名**：使用动词开头，清晰表达功能（如 `pinByUnderline`、`findBlockStart`）
- **变量名**：使用名词，描述性命名（如 `targetDef`、`blockStartElement`）
- **常量**：使用 UPPER_CASE（如 `DEFAULT_HIGHLIGHT_COLOR`）
- **布尔值**：使用 is/has/should 前缀（如 `isBlockStarted`、`hasNum`）

### 注释规范

```javascript
// ✅ 好的注释 - 解释"为什么"和"如何"
// 策略：target 有 .num 时，遇到其他编号项停止查找
// 因为它们是平级的独立释义
if (targetHasNum && current.querySelector('.num')) {
    break;
}

// ❌ 避免的注释 - 重复代码
// 如果 target 有 num
if (targetHasNum) {
    // ...
}
```

## 🐛 Bug 报告

### 报告 Bug

创建 Issue 时请包含：

1. **问题描述** - 简洁清晰地描述问题
2. **复现步骤** - 详细的复现步骤
3. **预期行为** - 你期望的结果
4. **实际行为** - 实际发生的结果
5. **环境信息** - 浏览器、Yomitan 版本等
6. **测试用例** - 如可能，提供 HTML 测试用例

### Bug 修复流程

1. 在 `cases/` 目录添加复现 bug 的测试用例
2. 运行测试确认 bug 存在
3. 修复代码
4. 运行测试确保修复成功
5. 更新 CHANGELOG.md 记录修复详情

## ✨ 功能请求

### 提交功能请求

创建 Issue 时请包含：

1. **功能描述** - 清晰描述想要的功能
2. **使用场景** - 说明为什么需要这个功能
3. **建议实现** - 如果有的话，描述可能的实现方式
4. **替代方案** - 考虑过的其他解决方案

## 📊 版本发布

### 版本号规范

使用 [Semantic Versioning](https://semver.org/)：

- `MAJOR.MINOR.PATCH` (如 `1.11.0`)
- **MAJOR** - 不兼容的 API 变更
- **MINOR** - 向后兼容的新功能
- **PATCH** - 向后兼容的 Bug 修复

### 发布检查清单

- [ ] 所有测试通过（`./test.sh`）
- [ ] 更新 `package.json` 中的版本号
- [ ] 更新 `CHANGELOG.md` 添加版本记录
- [ ] 更新 `README.md` 中的版本徽章（如需要）
- [ ] Git 提交并打标签
- [ ] 推送到远程仓库

## 🤝 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- ✅ 使用友好和包容的语言
- ✅ 尊重不同的观点和经验
- ✅ 优雅地接受建设性批评
- ✅ 关注对社区最有利的事情
- ✅ 对其他社区成员表示同理心

### 不可接受的行为

- ❌ 使用性化的语言或图像
- ❌ 挑衅、侮辱或贬损的评论
- ❌ 公开或私下骚扰
- ❌ 未经许可发布他人的私人信息
- ❌ 其他可能被认为不专业的行为

## 📞 联系方式

如有问题或建议：

- 📧 创建 [Issue](../../issues)
- 💬 参与 [Discussions](../../discussions)
- 🔀 提交 [Pull Request](../../pulls)

## 🙏 致谢

感谢所有为本项目做出贡献的人！

---

<div align="center">

**再次感谢你的贡献！** 🎉

</div>

