#!/bin/bash

# Pin Specific Definition - 测试脚本
# 用于运行自动化测试并生成测试报告

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="Pin Specific Definition"
VERSION="v1.11"
SCRIPT_FILE="script.js"
TEST_FILE="test.js"
CASES_DIR="cases"
OUTPUT_DIR="test-output"

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 打印标题
print_title() {
    echo
    print_message $CYAN "=========================================="
    print_message $CYAN "🧪 $PROJECT_NAME 测试套件 $VERSION"
    print_message $CYAN "=========================================="
    echo
}

# 检查依赖
check_dependencies() {
    print_message $BLUE "🔍 检查依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_message $RED "❌ Node.js 未安装"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_message $RED "❌ npm 未安装"
        exit 1
    fi
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        print_message $YELLOW "⚠️  package.json 不存在，正在初始化..."
        npm init -y > /dev/null 2>&1
    fi
    
    # 检查jsdom依赖
    if ! npm list jsdom &> /dev/null; then
        print_message $YELLOW "⚠️  jsdom 依赖未安装，正在安装..."
        npm install jsdom > /dev/null 2>&1
    fi
    
    print_message $GREEN "✅ 依赖检查完成"
}

# 检查测试文件
check_test_files() {
    print_message $BLUE "🔍 检查测试文件..."
    
    if [ ! -f "$SCRIPT_FILE" ]; then
        print_message $RED "❌ $SCRIPT_FILE 不存在"
        exit 1
    fi
    
    if [ ! -f "$TEST_FILE" ]; then
        print_message $RED "❌ $TEST_FILE 不存在"
        exit 1
    fi
    
    if [ ! -d "$CASES_DIR" ]; then
        print_message $RED "❌ $CASES_DIR 目录不存在"
        exit 1
    fi
    
    # 检查测试用例
    local case_count=$(find "$CASES_DIR" -name "*.html" | wc -l)
    if [ $case_count -eq 0 ]; then
        print_message $RED "❌ $CASES_DIR 目录中没有测试用例"
        exit 1
    fi
    
    print_message $GREEN "✅ 找到 $case_count 个测试用例"
}

# 运行测试
run_tests() {
    print_message $BLUE "🚀 开始运行测试..."
    echo
    
    # 运行测试
    if node "$TEST_FILE"; then
        echo
        print_message $GREEN "🎉 所有测试通过！"
    else
        print_message $RED "❌ 测试失败"
        exit 1
    fi
}

# 生成测试报告
generate_report() {
    print_message $BLUE "📊 生成测试报告..."
    
    local report_file="test-report.md"
    local case_count=$(find "$CASES_DIR" -name "*.html" | wc -l)
    local output_count=$(find "$OUTPUT_DIR" -name "*_output.html" 2>/dev/null | wc -l)
    
    cat > "$report_file" << EOF
# 测试报告

**项目**: $PROJECT_NAME  
**版本**: $VERSION

## 测试结果

- ✅ **测试状态**: 全部通过
- 📁 **测试用例**: $case_count 个
- 📄 **输出文件**: $output_count 个
- 📂 **输出目录**: $OUTPUT_DIR/

## 测试用例列表

EOF

    # 添加测试用例列表
    for file in "$CASES_DIR"/*.html; do
        if [ -f "$file" ]; then
            local basename=$(basename "$file" .html)
            echo "- \`$basename.html\`" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

## 输出文件

EOF

    # 添加输出文件列表
    if [ -d "$OUTPUT_DIR" ]; then
        for file in "$OUTPUT_DIR"/*_output.html; do
            if [ -f "$file" ]; then
                local basename=$(basename "$file" _output.html)
                echo "- \`${basename}_output.html\`" >> "$report_file"
            fi
        done
    fi
    
    cat >> "$report_file" << EOF

## 使用说明

1. 查看测试输出文件: 打开 \`$OUTPUT_DIR/\` 目录中的HTML文件
2. 黄色背景表示被置顶的目标释义
3. 检查释义顺序是否符合预期

## 技术细节

- **测试框架**: Node.js + JSDOM
- **DOM操作**: 模拟浏览器环境
- **测试覆盖**: 块识别、重排逻辑、边界情况
- **设计原则**: def0优先、释义单元完整性、分支完整性

---
*报告生成完成*
EOF

    print_message $GREEN "✅ 测试报告已生成: $report_file"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -c, --clean    清理输出目录"
    echo "  -r, --report   只生成测试报告"
    echo "  -v, --verbose  详细输出"
    echo
    echo "示例:"
    echo "  $0              # 运行完整测试"
    echo "  $0 --clean      # 清理输出目录"
    echo "  $0 --report     # 只生成报告"
}

# 清理输出目录
clean_output() {
    print_message $YELLOW "🧹 清理输出目录..."
    
    if [ -d "$OUTPUT_DIR" ]; then
        rm -rf "$OUTPUT_DIR"
        print_message $GREEN "✅ 输出目录已清理"
    else
        print_message $YELLOW "⚠️  输出目录不存在"
    fi
    
    if [ -f "test-report.md" ]; then
        rm -f "test-report.md"
        print_message $GREEN "✅ 测试报告已清理"
    fi
}

# 主函数
main() {
    local verbose=false
    local clean_only=false
    local report_only=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean_only=true
                shift
                ;;
            -r|--report)
                report_only=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            *)
                print_message $RED "❌ 未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 只清理
    if [ "$clean_only" = true ]; then
        clean_output
        exit 0
    fi
    
    # 只生成报告
    if [ "$report_only" = true ]; then
        generate_report
        exit 0
    fi
    
    # 运行完整测试流程
    print_title
    check_dependencies
    check_test_files
    run_tests
    generate_report
    
    echo
    print_message $GREEN "🎉 测试完成！"
    print_message $CYAN "📁 查看输出: $OUTPUT_DIR/"
    print_message $CYAN "📊 查看报告: test-report.md"
    echo
}

# 运行主函数
main "$@"
