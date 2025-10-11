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
    
    // 先检查目标本身是否是块起点
    const isTargetBlockStart = targetDef.matches('div[data-sc-class="def0"]') || 
                                (targetDef.matches('div[data-sc-class="def1"]') && targetDef.querySelector('span[data-sc-class="num"]'));
    
    if (!isTargetBlockStart) {
        // 目标不是块起点，向前查找
        let current = targetDef.previousElementSibling;
        while (current) {
            if (current.matches('div[data-sc-class="def0"]') || (current.matches('div[data-sc-class="def1"]') && current.querySelector('span[data-sc-class="num"]'))) {
                blockStartElement = current;
                // 找到第一个块起点就停止（最近的）
                break;
            }
            current = current.previousElementSibling;
        }
    }
    
    // 2b. 从这个真正的起点开始，收集所有属于该块的元素
    const fullBlockElements = [blockStartElement];
    let nextInBlock = blockStartElement.nextElementSibling;
    
    // 判断块结束的条件取决于块起点的类型
    const isBlockStartedByDef0 = blockStartElement.matches('div[data-sc-class="def0"]');
    
    while (nextInBlock) {
        // 遇到下一个块的起点时，当前块结束
        if (isBlockStartedByDef0) {
            // 如果当前块由def0开始，只有遇到下一个def0时才结束
            if (nextInBlock.matches('div[data-sc-class="def0"]')) {
                break;
            }
        } else {
            // 如果当前块由带.num的def1开始（无def0），遇到下一个带.num的def1时结束
            if (nextInBlock.matches('div[data-sc-class="def1"]') && nextInBlock.querySelector('span[data-sc-class="num"]')) {
                break;
            }
        }
        fullBlockElements.push(nextInBlock);
        nextInBlock = nextInBlock.nextElementSibling;
    }
    
    // --- 3. 内部重排 ---
    // 重排顺序取决于blockStartElement的类型
    
    const nodesToMove = [];
    
    if (blockStartElement.matches('div[data-sc-class="def0"]')) {
        // 如果块起点是def0（块标记）
        // 策略：无.num的说明文字保持在前，目标在所有有.num的项中排第一
        nodesToMove.push(blockStartElement);  // 块标记在最前
        
        if (targetDef !== blockStartElement) {
            // 将块内元素分为三类：
            // 1. 目标之前的无.num元素（说明文字）
            // 2. 目标（有.num）
            // 3. 其他有.num和无.num的元素
            const targetIndex = fullBlockElements.indexOf(targetDef);
            const beforeTarget = fullBlockElements.slice(1, targetIndex);
            const afterTarget = fullBlockElements.slice(targetIndex + 1);
            
            // 将目标之前的元素分为有.num和无.num
            const beforeTargetWithoutNum = beforeTarget.filter(el => 
                !el.querySelector('span[data-sc-class="num"]')
            );
            const beforeTargetWithNum = beforeTarget.filter(el => 
                el.querySelector('span[data-sc-class="num"]')
            );
            
            nodesToMove.push(...beforeTargetWithoutNum);  // 无.num的说明文字保持在前
            nodesToMove.push(targetDef);                  // 目标紧跟其后
            nodesToMove.push(...beforeTargetWithNum);     // 目标之前的其他编号项
            nodesToMove.push(...afterTarget);             // 目标之后的所有元素
        }
    } else {
        // 如果块起点是带.num的def1，没有块标记
        const otherParts = fullBlockElements.filter(el => 
            el !== blockStartElement && el !== targetDef
        );
        
        // 策略：块起点保持在前，目标紧跟其后（与def0块的无说明文字情况一致）
        nodesToMove.push(blockStartElement);  // 块起点在最前
        if (targetDef !== blockStartElement) {
            nodesToMove.push(targetDef);      // 目标紧跟块起点
        }
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
                    // 情况1: blockStartElement是def0（块标记）
                    // 需要重排：将无.num的元素保持在前，目标紧跟其后
                    const targetIndex = fullBlockElements.indexOf(targetDef);
                    const beforeTarget = fullBlockElements.slice(1, targetIndex);
                    const afterTarget = fullBlockElements.slice(targetIndex + 1);
                    
                    const beforeTargetWithoutNum = beforeTarget.filter(el => 
                        !el.querySelector('span[data-sc-class="num"]')
                    );
                    const beforeTargetWithNum = beforeTarget.filter(el => 
                        el.querySelector('span[data-sc-class="num"]')
                    );
                    
                    // 按照nodesToMove的顺序重新插入
                    if (beforeTargetWithoutNum.length > 0) {
                        // 有说明文字：def0 → 说明文字 → 目标 → 其他
                        blockStartElement.after(...beforeTargetWithoutNum);
                        beforeTargetWithoutNum[beforeTargetWithoutNum.length - 1].after(targetDef);
                    } else {
                        // 无说明文字：def0 → 目标 → 其他
                        blockStartElement.after(targetDef);
                    }
                    
                    if (beforeTargetWithNum.length > 0 || afterTarget.length > 0) {
                        const restElements = [...beforeTargetWithNum, ...afterTarget];
                        targetDef.after(...restElements);
                    }
                } else {
                    // 情况2: blockStartElement是带.num的def1，没有块标记
                    // 策略：块起点保持在前，目标紧跟其后
                    if (targetDef !== blockStartElement) {
                        const otherParts = fullBlockElements.filter(el => 
                            el !== blockStartElement && el !== targetDef
                        );
                        
                        // 将目标移到块起点之后
                        blockStartElement.after(targetDef);
                        if (otherParts.length > 0) {
                            targetDef.after(...otherParts);
                        }
                    }
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