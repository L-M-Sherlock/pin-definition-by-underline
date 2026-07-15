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

function validateHighlightColor(targetElement, expectedHighlightColor) {
    const actualHighlightColor = targetElement.ownerDocument.defaultView
        .getComputedStyle(targetElement)
        .backgroundColor;

    if (actualHighlightColor !== expectedHighlightColor) {
        throw new Error(
            `验证失败: 目标释义高亮颜色错误，期望 ${expectedHighlightColor}，实际 ${actualHighlightColor}`
        );
    }
}

function validateKokugoLeadingGaiji(level0) {
    const leadingGaiji = level0.firstElementChild;
    if (!leadingGaiji || !leadingGaiji.matches('[data-sc-img][data-sc-gaiji]')) return;

    const image = leadingGaiji.querySelector('img');
    if (!image) return;

    const imageLink = leadingGaiji.querySelector('.gloss-image-link') || image.closest('a');
    const imageContainer = leadingGaiji.querySelector('.gloss-image-container') || image.parentElement;

    if (
        leadingGaiji.style.getPropertyValue('width') !== '1em' ||
        !imageLink ||
        imageLink.style.getPropertyValue('width') !== '1em' ||
        !imageContainer ||
        imageContainer.style.getPropertyValue('width') !== '1em'
    ) {
        throw new Error(`验证失败: 国语第三版 level0 前导 gaiji 图片未压缩，可能导致置顶条目错位`);
    }
}

function validateNichihan(underlinedElement, expectedHighlightColor) {
    const targetDef = underlinedElement.closest('div[data-sc-class="def1"]');
    if (!targetDef) {
        throw new Error(`验证失败: 找不到带下划线元素的 def1 容器`);
    }

    validateHighlightColor(targetDef, expectedHighlightColor);

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

function validateKokugoV3(underlinedElement, expectedHighlightColor) {
    const targetMeaning = underlinedElement.closest(
        'div[data-sc-meaning][data-sc-class="level0"], div[data-sc-meaning][data-sc-class="level1"]'
    );
    if (!targetMeaning) {
        throw new Error(`验证失败: 找不到带下划线元素的 level0/level1 容器`);
    }

    validateHighlightColor(targetMeaning, expectedHighlightColor);

    const body = targetMeaning.closest('div[data-sc-body]');
    if (!body) {
        throw new Error(`验证失败: 找不到明鏡国語辞典 第三版 body 容器`);
    }

    const targetLevel = targetMeaning.getAttribute('data-sc-class');

    if (targetLevel === 'level0') {
        validateKokugoLeadingGaiji(targetMeaning);

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

    if (owningLevel0) {
        validateKokugoLeadingGaiji(owningLevel0);
    }

    const firstLevel0 = body.querySelector('div[data-sc-meaning][data-sc-class="level0"]');
    if (firstLevel0 !== owningLevel0) {
        throw new Error(`验证失败: 国语第三版目标 level1 所属大分区未置顶到第一个大分区位置`);
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

    if (targetMeaning.getAttribute('data-sc-id') === '52067-D035') {
        if (!owningLevel0 || owningLevel0.getAttribute('data-sc-id') !== '52067-D031') {
            throw new Error(`验证失败: 国语第三版「引く」目标释义与所属 level0 分区脱离`);
        }

        if (body.firstElementChild !== owningLevel0) {
            throw new Error(`验证失败: 国语第三版「引く」所属 level0 未移动到分区标题之前`);
        }

        const example = targetMeaning.nextElementSibling;
        if (!example || example.getAttribute('data-sc-id') !== '52067-5052') {
            throw new Error(`验证失败: 国语第三版「引く」目标释义的例句未随释义一起移动`);
        }

        const followingMeaning = example.nextElementSibling;
        if (!followingMeaning || followingMeaning.getAttribute('data-sc-id') !== '52067-D032') {
            throw new Error(`验证失败: 国语第三版「引く」目标释义未置顶到所属分区内第一位`);
        }

        const previousGroupNote = body.querySelector('[data-sc-id="52067-8010"]');
        const entryTail = body.querySelector('[data-sc-id="52067-8011"]');
        const relatedItems = body.querySelector('[data-sc-class="ruigo-items"]');
        if (!previousGroupNote || previousGroupNote.nextElementSibling !== entryTail) {
            throw new Error(`验证失败: 国语第三版「引く」全词条说明被错误并入置顶分区`);
        }

        if (!entryTail || entryTail.nextElementSibling !== relatedItems || body.lastElementChild !== relatedItems) {
            throw new Error(`验证失败: 国语第三版「引く」书写说明或类语表未保留在词条末尾`);
        }

        const firstShikiri = body.querySelector('[data-sc-id="52067-8001"]');
        const originalFirstLevel0 = body.querySelector('[data-sc-id="52067-D002"]');
        if (!firstShikiri || firstShikiri.nextElementSibling !== originalFirstLevel0) {
            throw new Error(`验证失败: 国语第三版「引く」原分区标题与 level0 释义错位`);
        }
    }

    if (targetMeaning.getAttribute('data-sc-id') === '41148-D009') {
        const movedExamples = [];
        let current = targetMeaning.nextElementSibling;
        while (current && current.matches('div[data-sc-example]')) {
            movedExamples.push(current.getAttribute('data-sc-id'));
            current = current.nextElementSibling;
        }

        const expectedExamples = ['41148-5005', '41148-5006', '41148-5007'];
        if (movedExamples.join(',') !== expectedExamples.join(',')) {
            throw new Error(`验证失败: 国语第三版「付き」目标释义的例句未随释义一起移动`);
        }

        if (!current || current.getAttribute('data-sc-id') !== '41148-D007') {
            throw new Error(`验证失败: 国语第三版「付き」目标释义未置顶到所属大分区内第一位`);
        }

        const relatedItems = body.querySelector('[data-sc-class="ruigo-items"]');
        if (!relatedItems || body.lastElementChild !== relatedItems) {
            throw new Error(`验证失败: 国语第三版「付き」类语表未保留在词条末尾`);
        }
    }
}

function validateProcessedHtml(container, beforeHtml, expectedHighlightColor) {
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
        validateKokugoV3(underlinedElement, expectedHighlightColor);
    } else {
        validateNichihan(underlinedElement, expectedHighlightColor);
    }

    console.log(`✓ 验证通过: 目标释义已正确高亮和置顶`);
}

function testCase(inputFile, outputDir, options = {}) {
    const nightMode = options.nightMode === true;
    const outputFile = options.outputFile || inputFile;
    const modeLabel = nightMode ? '夜间模式' : '白天模式';
    const outputModeSuffix = nightMode ? ` (${modeLabel})` : '';
    const expectedHighlightColor = nightMode ? 'rgb(0, 0, 0)' : 'rgb(255, 242, 168)';

    console.log(`\n🧪 测试 ${inputFile} (${modeLabel})...`);
    
    // 加载测试环境
    const dom = loadScript();

    if (nightMode) {
        dom.window.document.body.classList.add('card', 'nightMode');
    }
    
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
        
        validateProcessedHtml(container, beforeHtml, expectedHighlightColor);
        
        // 保存输出
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
        const nightModeStyles = nightMode ? `
        body.nightMode { background-color: #2c2c2c; color: #fcfcfc; }
        body.nightMode .yomitan-glossary .gloss-sc-div { color: #fcfcfc !important; }
        body.nightMode .test-info { background-color: #3a3a3a; }
        ` : '';
        const highlightStyleElement = dom.window.document.getElementById('pin-by-underline-highlight-styles');
        const highlightStyles = highlightStyleElement ? highlightStyleElement.textContent : '';
        
        // 写入完整的HTML文档
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Output - ${inputFile}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        ${nightModeStyles}
        ${highlightStyles}
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
<body${nightMode ? ' class="card nightMode"' : ''}>
    <div class="test-info">
        <h2>🧪 测试结果: ${inputFile}${outputModeSuffix}</h2>
        <p><strong>输入文件:</strong> cases/${inputFile}</p>
        <p><strong>说明:</strong> ${nightMode ? '黑色' : '黄色'}背景表示被置顶的目标释义</p>
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

function testDelayedNightMode(inputFile) {
    console.log(`\n🧪 测试 ${inputFile} (延迟注入夜间模式)...`);

    try {
        const dom = loadScript();
        const inputPath = path.join(__dirname, 'cases', inputFile);
        const htmlContent = fs.readFileSync(inputPath, 'utf8');
        const container = dom.window.document.getElementById('test-container');
        container.innerHTML = htmlContent;

        pinByUnderline();

        const underlinedElement = container.querySelector('u');
        const targetElement = underlinedElement.closest(
            'div[data-sc-class="def1"], div[data-sc-meaning][data-sc-class="level0"], div[data-sc-meaning][data-sc-class="level1"]'
        );

        validateHighlightColor(targetElement, 'rgb(255, 242, 168)');

        dom.window.document.body.classList.add('card', 'nightMode');
        validateHighlightColor(targetElement, 'rgb(0, 0, 0)');

        dom.window.document.body.classList.remove('nightMode');
        validateHighlightColor(targetElement, 'rgb(255, 242, 168)');

        dom.window.document.documentElement.classList.add('night-mode');
        validateHighlightColor(targetElement, 'rgb(0, 0, 0)');

        console.log(`✓ 验证通过: 夜间类晚于脚本注入时，高亮会自动切换为黑色`);
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

    const nightModeSuccess = testCase('付き.html', outputDir, {
        nightMode: true,
        outputFile: '付き-night.html'
    });
    if (nightModeSuccess) {
        passed++;
    } else {
        failed++;
    }

    ['付き.html', '撮る.html'].forEach(file => {
        const delayedNightModeSuccess = testDelayedNightMode(file);
        if (delayedNightModeSuccess) {
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
