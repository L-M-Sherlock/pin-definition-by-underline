const fs = require('fs');
const path = require('path');
const beautify = require('js-beautify').html;

// 模拟DOM环境
global.document = {
    querySelector: function(selector) {
        return this._mockElement;
    },
    createElement: function(tag) {
        return {
            tagName: tag.toUpperCase(),
            style: {},
            appendChild: function(child) {},
            innerHTML: '',
            querySelector: function(sel) { return null; },
            querySelectorAll: function(sel) { return []; },
            closest: function(sel) { return null; },
            matches: function(sel) { return false; },
            previousElementSibling: null,
            nextElementSibling: null,
            before: function() {},
            after: function() {},
            parentElement: null,
            prepend: function() {}
        };
    },
    _mockElement: null
};

// 加载JSDOM来模拟浏览器环境
const { JSDOM } = require('jsdom');

function loadScript() {
    // 创建DOM环境
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <body>
            <div class="yomitan-glossary">
                <div id="test-container"></div>
            </div>
        </body>
        </html>
    `, {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable'
    });

    // 设置全局document和window
    global.window = dom.window;
    global.document = dom.window.document;
    global.Element = dom.window.Element;
    global.Node = dom.window.Node;

    // 读取并执行script.js
    const scriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    
    // 在全局作用域中执行脚本
    const vm = require('vm');
    const context = {
        document: dom.window.document,
        window: dom.window,
        Element: dom.window.Element,
        Node: dom.window.Node,
        console: console
    };
    
    vm.createContext(context);
    vm.runInContext(scriptContent, context);
    
    // 将pinByUnderline函数暴露到全局
    global.pinByUnderline = context.pinByUnderline;
    
    return dom;
}

function testCase(inputFile, outputDir) {
    console.log(`\n🧪 测试 ${inputFile}...`);
    
    // 加载测试环境
    const dom = loadScript();
    
    // 读取输入HTML
    const inputPath = path.join(__dirname, 'cases', inputFile);
    const htmlContent = fs.readFileSync(inputPath, 'utf8');
    
    // 将HTML插入到测试容器
    const container = dom.window.document.getElementById('test-container');
    container.innerHTML = htmlContent;
    
    // 执行pinByUnderline函数
    try {
        pinByUnderline();
        
        // 获取处理后的HTML
        const resultHtml = container.innerHTML;
        
        // ===== 验证逻辑 =====
        // 查找带下划线的元素
        const underlinedElement = container.querySelector('u');
        if (underlinedElement) {
            // 验证1: 确保带下划线的元素对应的 def1 被高亮
            const targetDef = underlinedElement.closest('div[data-sc-class="def1"]');
            if (!targetDef) {
                throw new Error(`验证失败: 找不到带下划线元素的 def1 容器`);
            }
            
            if (!targetDef.style.backgroundColor || targetDef.style.backgroundColor === '') {
                throw new Error(`验证失败: 目标释义未被高亮 (backgroundColor 未设置)`);
            }
            
            // 验证2: 确保目标释义被置顶到正确位置
            // 找到目标所在的 def0 分组
            const entryContainer = targetDef.closest('div[data-sc-class="mjrhsjcd-entry"]');
            if (!entryContainer) {
                throw new Error(`验证失败: 找不到 mjrhsjcd-entry 容器`);
            }
            
            // 查找目标释义所属的 def0 块
            let targetDef0 = null;
            let current = targetDef.previousElementSibling;
            while (current) {
                if (current.matches && current.matches('div[data-sc-class="def0"]')) {
                    targetDef0 = current;
                    break;
                }
                current = current.previousElementSibling;
            }
            
            if (targetDef0) {
                // 检查目标释义本身是否有编号
                const targetHasNum = targetDef.querySelector('span[data-sc-class="num"]') ||
                                   targetDef.querySelector('span[data-sc-class="num_circle"]') ||
                                   targetDef.querySelector('div[data-sc-class="num"]') ||
                                   targetDef.querySelector('div[data-sc-class="num_circle"]');
                
                if (targetHasNum) {
                    // 如果目标有编号，它应该是 def0 后的第一个带编号的 def1
                    let firstNumDef = targetDef0.nextElementSibling;
                    while (firstNumDef) {
                        if (firstNumDef.matches && firstNumDef.matches('div[data-sc-class="def1"]')) {
                            const hasNum = firstNumDef.querySelector('span[data-sc-class="num"]') ||
                                         firstNumDef.querySelector('span[data-sc-class="num_circle"]') ||
                                         firstNumDef.querySelector('div[data-sc-class="num"]') ||
                                         firstNumDef.querySelector('div[data-sc-class="num_circle"]');
                            if (hasNum) {
                                // 找到第一个带编号的 def1
                                if (firstNumDef !== targetDef) {
                                    throw new Error(`验证失败: 目标释义未被置顶。第一个带编号的 def1 不是目标释义。`);
                                }
                                break;
                            }
                        }
                        firstNumDef = firstNumDef.nextElementSibling;
                    }
                } else {
                    // 如果目标没有编号（是子释义），验证它在其主释义的子释义中排第一
                    // 找到前面最近的带编号的 def1（主释义）
                    let mainDef = null;
                    current = targetDef.previousElementSibling;
                    while (current) {
                        if (current.matches && current.matches('div[data-sc-class="def1"]')) {
                            const hasNum = current.querySelector('span[data-sc-class="num"]') ||
                                         current.querySelector('span[data-sc-class="num_circle"]') ||
                                         current.querySelector('div[data-sc-class="num"]') ||
                                         current.querySelector('div[data-sc-class="num_circle"]');
                            if (hasNum) {
                                mainDef = current;
                                break;
                            }
                        }
                        current = current.previousElementSibling;
                    }
                    
                    if (mainDef) {
                        // 检查目标是否是主释义后的第一个无编号 def1
                        let firstSubDef = mainDef.nextElementSibling;
                        if (firstSubDef && firstSubDef.matches && firstSubDef.matches('div[data-sc-class="def1"]')) {
                            const hasNum = firstSubDef.querySelector('span[data-sc-class="num"]') ||
                                         firstSubDef.querySelector('span[data-sc-class="num_circle"]') ||
                                         firstSubDef.querySelector('div[data-sc-class="num"]') ||
                                         firstSubDef.querySelector('div[data-sc-class="num_circle"]');
                            if (!hasNum && firstSubDef !== targetDef) {
                                throw new Error(`验证失败: 目标子释义未被置顶到主释义后的第一位。`);
                            }
                        }
                    }
                }
            }
            
            console.log(`✓ 验证通过: 目标释义已正确高亮和置顶`);
        }
        
        // 保存输出
        const outputFile = inputFile;
        const outputPath = path.join(outputDir, outputFile);
        
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入完整的HTML文档
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Output - ${inputFile}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-info { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
        .highlight { background-color: #fff2a8 !important; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="mjrhsjcd-entry"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="mjrhsjcd-entry"] { margin-left: 1em; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="head"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="head"] { font-size: 1em; margin-left: -1em; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="word"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="word"] { font-weight: bold; font-size: 1.3em; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="type"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="type"] { color: orangered; font-size: 1em; font-weight: bold; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="def0"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="def0"] { font-size: 1em; margin-left: -1em; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="def1"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="def1"] { font-size: 1em; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="dfcn"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="dfcn"] { color: dodgerblue; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="exjp"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="exjp"] { color: darkgreen; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="excn"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="excn"] { color: limegreen; }
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] span[data-sc-class="num"], 
        .yomitan-glossary [data-dictionary="明鏡日汉双解辞典"] div[data-sc-class="num"] { color: darkred; font-weight: bold; margin-left: -1em; }
        ${htmlContent.includes('<style>') ? htmlContent.split('<style>')[1].split('</style>')[0] : ''}
    </style>
</head>
<body>
    <div class="test-info">
        <h2>🧪 测试结果: ${inputFile}</h2>
        <p><strong>输入文件:</strong> cases/${inputFile}</p>
        <p><strong>说明:</strong> 黄色背景表示被置顶的目标释义</p>
    </div>
    
    <div class="yomitan-glossary">
        ${resultHtml}
    </div>
</body>
</html>`;
        
        // 格式化HTML
        const formattedHtml = beautify(fullHtml, {
            indent_size: 2,
            indent_char: ' ',
            max_preserve_newlines: 1,
            preserve_newlines: true,
            keep_array_indentation: false,
            break_chained_methods: false,
            indent_scripts: 'normal',
            brace_style: 'collapse',
            space_before_conditional: true,
            unescape_strings: false,
            jslint_happy: false,
            end_with_newline: true,
            wrap_line_length: 0,
            indent_inner_html: true,
            comma_first: false,
            e4x: false,
            indent_empty_lines: false,
            wrap_attributes: 'force',
            wrap_attributes_indent_size: 2,
            html_indent_handlebars: true,
            html_indent_inner_html: true,
            html_indent_body_inner_html: true
        });
        
        fs.writeFileSync(outputPath, formattedHtml, 'utf8');
        
        console.log(`✅ 测试完成: ${outputFile}`);
        return true;
        
    } catch (error) {
        console.error(`❌ 测试失败: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

function runAllTests() {
    console.log('🚀 开始运行所有测试用例...\n');
    
    const casesDir = path.join(__dirname, 'cases');
    const outputDir = path.join(__dirname, 'test-output');
    
    // 获取所有测试用例
    const testFiles = fs.readdirSync(casesDir).filter(file => file.endsWith('.html'));
    
    if (testFiles.length === 0) {
        console.log('❌ 未找到测试用例文件');
        return;
    }
    
    console.log(`📁 找到 ${testFiles.length} 个测试用例:`);
    testFiles.forEach(file => console.log(`   - ${file}`));
    
    let passed = 0;
    let failed = 0;
    
    // 运行每个测试用例
    testFiles.forEach(file => {
        const success = testCase(file, outputDir);
        if (success) {
            passed++;
        } else {
            failed++;
        }
    });
    
    console.log(`\n📊 测试总结:`);
    console.log(`   ✅ 通过: ${passed}`);
    console.log(`   ❌ 失败: ${failed}`);
    console.log(`   📁 输出目录: ${outputDir}`);
    
    if (failed === 0) {
        console.log('\n🎉 所有测试通过！');
        process.exit(0);
    } else {
        console.log('\n⚠️  有测试失败，请检查输出文件');
        process.exit(1);
    }
}

// 运行测试
runAllTests();
