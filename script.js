function pinByUnderline() {
    const glossary = document.querySelector('.yomitan-glossary');
    if (!glossary) return;
    
    const underlinedElement = glossary.querySelector('u');
    if (!underlinedElement) return;

    // --- 1. 定位 ---
    const targetDef = underlinedElement.closest('div[data-sc-class="def1"]');
    if (!targetDef) return;
    
    const entryContainer = targetDef.closest('div[data-sc-class="mjrhsjcd-entry"]');
    if (!entryContainer) return;

    const parentLi = targetDef.closest('li[data-dictionary]');

    // --- 2. 块发现：只识别真正的、可移动的释义块 ---

    // 2a. 找到块的真正起始点。一个块必须由 def0 或带 .num 的 def1 开始。
    // 始终向前查找最近的块起点（def0 优先级最高）
    let blockStartElement = targetDef;
    let current = targetDef.previousElementSibling;
    while (current) {
        if (current.matches('div[data-sc-class="def0"]') || (current.matches('div[data-sc-class="def1"]') && current.querySelector('span[data-sc-class="num"]'))) {
            blockStartElement = current;
            // 如果找到 def0，这是最高优先级的起点，停止查找
            if (current.matches('div[data-sc-class="def0"]')) {
                break;
            }
        }
        current = current.previousElementSibling;
    }
    
    // 2b. 从这个真正的起点开始，收集所有属于该块的元素
    const fullBlockElements = [blockStartElement];
    let nextInBlock = blockStartElement.nextElementSibling;
    while (nextInBlock) {
        // 遇到下一个块的起点时，当前块结束
        if (nextInBlock.matches('div[data-sc-class="def0"]') || (nextInBlock.matches('div[data-sc-class="def1"]') && nextInBlock.querySelector('span[data-sc-class="num"]'))) {
            break;
        }
        fullBlockElements.push(nextInBlock);
        nextInBlock = nextInBlock.nextElementSibling;
    }
    
    // --- 3. 内部重排 ---
    // 重排顺序取决于blockStartElement的类型
    
    const otherParts = fullBlockElements.filter(el => 
        el !== blockStartElement && el !== targetDef
    );
    
    const nodesToMove = [];
    
    if (blockStartElement.matches('div[data-sc-class="def0"]')) {
        // 如果块起点是def0（块标记），它应该保持在最前
        nodesToMove.push(blockStartElement);  // 块标记在最前
        if (targetDef !== blockStartElement) {
            nodesToMove.push(targetDef);      // 目标紧跟块标记
        }
        nodesToMove.push(...otherParts);      // 其他元素排在最后
    } else {
        // 如果块起点是带.num的def1，没有块标记
        if (targetDef !== blockStartElement) {
            nodesToMove.push(targetDef);      // 目标排在最前
        }
        nodesToMove.push(blockStartElement);  // 块起点排在目标后面
        nodesToMove.push(...otherParts);      // 其他元素排在最后
    }
    
    // --- 4. 执行 DOM 操作 ---

    // 4a. 高亮目标
    targetDef.style.backgroundColor = '#fff2a8';
    
    // 4b. 找到正确的插入点并移动
    // 关键修正：插入点是第一个“真正的”释义块的起点
    let insertionPoint = null;
    const allDefs = entryContainer.querySelectorAll('div[data-sc-class="def0"], div[data-sc-class="def1"]');
    for (const def of allDefs) {
        // 第一个块的起点，就是我们的插入目标
        if (def.matches('div[data-sc-class="def0"]') || def.querySelector('span[data-sc-class="num"]')) {
            insertionPoint = def;
            break;
        }
    }

    if (insertionPoint) {
        if (insertionPoint === blockStartElement) {
            // 当前块已经是第一个块，只需要块内重排
            if (targetDef !== blockStartElement) {
                // 区分两种情况：
                if (blockStartElement.matches('div[data-sc-class="def0"]')) {
                    // 情况1: blockStartElement是def0（块标记），应保持在最前
                    // 将目标移到def0之后的第一个位置
                    blockStartElement.after(targetDef);
                } else {
                    // 情况2: blockStartElement是带.num的def1，没有块标记
                    // 将目标移到blockStartElement前面
                    blockStartElement.before(targetDef);
                }
            }
        } else {
            // 需要整块移动到第一个块前面（包含块内重排）
            insertionPoint.before(...nodesToMove);
        }
    }

    // 4c. 置顶整个词条 li (如果存在)
    if (parentLi && parentLi.parentElement) {
        parentLi.parentElement.prepend(parentLi);
    }
}