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

function hasNichihanNum(element) {
    return element.querySelector('span[data-sc-class="num"]') ||
           element.querySelector('span[data-sc-class="num_circle"]') ||
           element.querySelector('div[data-sc-class="num"]') ||
           element.querySelector('div[data-sc-class="num_circle"]');
}

function validateNichihan(underlinedElement) {
    const targetDef = underlinedElement.closest('div[data-sc-class="def1"]');
    if (!targetDef) {
        throw new Error(`验证失败: 找不到带下划线元素的 def1 容器`);
    }

    if (!targetDef.style.backgroundColor || targetDef.style.backgroundColor === '') {
        throw new Error(`验证失败: 目标释义未被高亮 (backgroundColor 未设置)`);
    }

    const entryContainer = targetDef.closest('div[data-sc-class="mjrhsjcd-entry"]');
    if (!entryContainer) {
        throw new Error(`验证失败: 找不到 mjrhsjcd-entry 容器`);
    }

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
        const targetHasNum = hasNichihanNum(targetDef);

        if (targetHasNum) {
            let firstNumDef = targetDef0.nextElementSibling;
            while (firstNumDef) {
                if (firstNumDef.matches && firstNumDef.matches('div[data-sc-class="def1"]')) {
                    if (hasNichihanNum(firstNumDef)) {
                        if (firstNumDef !== targetDef) {
                            throw new Error(`验证失败: 目标释义未被置顶。第一个带编号的 def1 不是目标释义。`);
                        }
                        break;
                    }
                }
                firstNumDef = firstNumDef.nextElementSibling;
            }
        } else {
            let mainDef = null;
            current = targetDef.previousElementSibling;
            while (current) {
                if (current.matches && current.matches('div[data-sc-class="def1"]') && hasNichihanNum(current)) {
                    mainDef = current;
                    break;
                }
                current = current.previousElementSibling;
            }

            if (mainDef) {
                const firstSubDef = mainDef.nextElementSibling;
                if (
                    firstSubDef &&
                    firstSubDef.matches &&
                    firstSubDef.matches('div[data-sc-class="def1"]') &&
                    !hasNichihanNum(firstSubDef) &&
                    firstSubDef !== targetDef
                ) {
                    throw new Error(`验证失败: 目标子释义未被置顶到主释义后的第一位。`);
                }
            }
        }
    }
}

function validateKokugoV3(underlinedElement) {
    const targetMeaning = underlinedElement.closest(
        'div[data-sc-meaning][data-sc-class="level0"], div[data-sc-meaning][data-sc-class="level1"]'
    );
    if (!targetMeaning) {
        throw new Error(`验证失败: 找不到带下划线元素的 level0/level1 容器`);
    }

    if (!targetMeaning.style.backgroundColor || targetMeaning.style.backgroundColor === '') {
        throw new Error(`验证失败: 目标释义未被高亮 (backgroundColor 未设置)`);
    }

    const body = targetMeaning.closest('div[data-sc-body]');
    if (!body) {
        throw new Error(`验证失败: 找不到明鏡国語辞典 第三版 body 容器`);
    }

    const targetLevel = targetMeaning.getAttribute('data-sc-class');

    if (targetLevel === 'level0') {
        const firstLevel0 = body.querySelector('div[data-sc-meaning][data-sc-class="level0"]');
        if (firstLevel0 !== targetMeaning) {
            throw new Error(`验证失败: 国语第三版目标 level0 未置顶到第一个大分区位置`);
        }

        if (targetMeaning.getAttribute('data-sc-id') === '34215-D003') {
            const firstChild = targetMeaning.nextElementSibling;
            if (!firstChild || firstChild.getAttribute('data-sc-id') !== '34215-D004') {
                throw new Error(`验证失败: 国语第三版 level0 子释义未随大分区一起移动`);
            }
        }

        return;
    }

    let owningLevel0 = targetMeaning.previousElementSibling;
    while (owningLevel0 && owningLevel0.getAttribute('data-sc-class') !== 'level0') {
        owningLevel0 = owningLevel0.previousElementSibling;
    }

    let firstLevel1 = owningLevel0 ? owningLevel0.nextElementSibling : body.firstElementChild;
    while (firstLevel1 && firstLevel1.getAttribute('data-sc-class') !== 'level1') {
        if (firstLevel1.getAttribute('data-sc-class') === 'level0') {
            break;
        }
        firstLevel1 = firstLevel1.nextElementSibling;
    }

    if (firstLevel1 !== targetMeaning) {
        throw new Error(`验证失败: 国语第三版目标 level1 未置顶到所属大分区的第一个释义位置`);
    }

    if (targetMeaning.getAttribute('data-sc-id') === '00927-D005') {
        const example = targetMeaning.nextElementSibling;
        if (!example || example.getAttribute('data-sc-id') !== '00927-5009') {
            throw new Error(`验证失败: 国语第三版目标释义的例句未随释义一起移动`);
        }
    }
}

function validateProcessedHtml(container, beforeHtml) {
    const underlinedElement = container.querySelector('u');
    if (!underlinedElement) {
        if (container.innerHTML !== beforeHtml) {
            throw new Error(`验证失败: 无下划线用例不应修改 DOM`);
        }
        console.log(`✓ 验证通过: 无下划线标记，DOM 保持不变`);
        return;
    }

    const parentLi = underlinedElement.closest('li[data-dictionary]');
    const dictionaryName = parentLi ? parentLi.getAttribute('data-dictionary') : '';

    if (dictionaryName === '明鏡国語辞典 第三版') {
        validateKokugoV3(underlinedElement);
    } else {
        validateNichihan(underlinedElement);
    }

    console.log(`✓ 验证通过: 目标释义已正确高亮和置顶`);
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
    const beforeHtml = container.innerHTML;
    
    // 执行pinByUnderline函数
    try {
        pinByUnderline();
        
        // 获取处理后的HTML
        const resultHtml = container.innerHTML;
        
        validateProcessedHtml(container, beforeHtml);
        
        // 保存输出
        const outputFile = inputFile;
        const outputPath = path.join(outputDir, outputFile);
        
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const kokugoStyles = htmlContent.includes('明鏡国語辞典 第三版') ? `
        .yomitan-glossary [data-dictionary="明鏡国語辞典 第三版"] [data-sc-class="level0"] { font-weight: bold; margin-left: -1em; }
        .yomitan-glossary [data-dictionary="明鏡国語辞典 第三版"] [data-sc-class="level1"] { margin-left: 0; }
        .yomitan-glossary [data-dictionary="明鏡国語辞典 第三版"] [data-sc-example] { margin-left: 1em; color: darkgreen; }
        ` : '';
        
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
        ${kokugoStyles}
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
