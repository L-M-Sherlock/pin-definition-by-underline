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
    // 关键改进：区分target本身是否有.num，采用不同的查找策略
    let blockStartElement = targetDef;
    let current = targetDef.previousElementSibling;
    
    // 检查target本身是否有.num - 这决定了查找策略
    const targetHasNum = targetDef.matches('div[data-sc-class="def1"]') && targetDef.querySelector('span[data-sc-class="num"]');
    
    if (targetHasNum) {
        // Target本身有.num，它可能是一个独立的块
        // 关键：需要区分"同块内的编号项"和"平级的独立块"
        while (current) {
            if (current.matches('div[data-sc-class="def0"]')) {
                // 找到def0，使用它
                blockStartElement = current;
                break;
            } else if (current.matches('div[data-sc-class="def1"]') && current.querySelector('span[data-sc-class="num"]')) {
                // 找到有.num的def1，需要判断它是否"属于某个def0块"
                // 方法：从这个def1开始向前追溯，跳过所有def1（有无.num都跳过），看最终是否能找到def0
                let ancestorCheck = current.previousElementSibling;
                let foundAncestorDef0 = false;
                
                while (ancestorCheck) {
                    if (ancestorCheck.matches('div[data-sc-class="def0"]')) {
                        // 找到了前置def0，说明current属于某个def0块
                        foundAncestorDef0 = true;
                        break;
                    } else if (ancestorCheck.matches('div[data-sc-class="def1"]')) {
                        // 遇到def1（无论有无.num），继续向前追溯
                        ancestorCheck = ancestorCheck.previousElementSibling;
                    } else {
                        // 遇到其他类型的元素，停止追溯
                        break;
                    }
                }
                
                if (foundAncestorDef0) {
                    // current属于某个def0块，target也可能属于这个块，继续向前查找
                    // 不做任何操作，让循环继续
                } else {
                    // current不属于任何def0块，它是独立的块起点，target与它平级
                    break;
                }
            }
            current = current.previousElementSibling;
        }
        // 如果没找到def0，blockStartElement保持为targetDef（独立块）
    } else {
        // Target本身没有.num，它从属于前面的某个块
        // 向前查找最近的有.num的def1或def0
        let firstDef1WithNum = null;
        
        while (current) {
            if (current.matches('div[data-sc-class="def0"]')) {
                // 找到def0，这是最高优先级
                blockStartElement = current;
                break;
            } else if (current.matches('div[data-sc-class="def1"]') && current.querySelector('span[data-sc-class="num"]')) {
                // 找到带.num的def1
                if (!firstDef1WithNum) {
                    firstDef1WithNum = current;
                    // 继续查找，看前面是否有def0
                }
            }
            current = current.previousElementSibling;
        }
        
        // 如果没找到def0，但找到了带.num的def1，使用它
        if (blockStartElement === targetDef && firstDef1WithNum) {
            blockStartElement = firstDef1WithNum;
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
            // 如果当前块由带.num的def1开始（无def0），需要更精确的边界判断
            if (nextInBlock.matches('div[data-sc-class="def1"]') && nextInBlock.querySelector('span[data-sc-class="num"]')) {
                // 遇到下一个有.num的def1，当前块结束
                break;
            }
        }
        fullBlockElements.push(nextInBlock);
        nextInBlock = nextInBlock.nextElementSibling;
    }
    
    // --- 3. 内部重排 ---
    // 重排顺序取决于blockStartElement的类型和target的性质
    
    const nodesToMove = [];
    
    if (blockStartElement.matches('div[data-sc-class="def0"]')) {
        // 如果块起点是def0（块标记）
        nodesToMove.push(blockStartElement);  // 块标记在最前
        
        if (targetDef !== blockStartElement) {
            // 检查target是否有.num，决定处理策略
            const targetHasNum = targetDef.matches('div[data-sc-class="def1"]') && targetDef.querySelector('span[data-sc-class="num"]');
            
            if (!targetHasNum) {
                // target无.num，它是某个主释义的子释义
                // 找到它所属的主释义
                const targetIndex = fullBlockElements.indexOf(targetDef);
                let mainDef = null;
                
                // 向前查找最近的有.num的def1
                for (let i = targetIndex - 1; i >= 1; i--) {
                    const el = fullBlockElements[i];
                    if (el.matches('div[data-sc-class="def1"]') && el.querySelector('span[data-sc-class="num"]')) {
                        mainDef = el;
                        break;
                    }
                }
                
                if (mainDef) {
                    // 找到主释义，收集主释义及其所有子释义
                    const mainDefIndex = fullBlockElements.indexOf(mainDef);
                    const subDefs = [];
                    
                    // 收集主释义后面的所有无.num的def1
                    for (let i = mainDefIndex + 1; i < fullBlockElements.length; i++) {
                        const el = fullBlockElements[i];
                        if (el.matches('div[data-sc-class="def1"]') && !el.querySelector('span[data-sc-class="num"]')) {
                            subDefs.push(el);
                        } else {
                            break;
                        }
                    }
                    
                    // 将target移到subDefs的最前面
                    const targetInSubDefs = subDefs.indexOf(targetDef);
                    if (targetInSubDefs > 0) {
                        subDefs.splice(targetInSubDefs, 1);
                        subDefs.unshift(targetDef);
                    }
                    
                    // 其他元素（不包括主释义和子释义）
                    const otherParts = fullBlockElements.filter(el => 
                        el !== blockStartElement && el !== mainDef && !subDefs.includes(el)
                    );
                    
                    nodesToMove.push(mainDef);        // 主释义
                    nodesToMove.push(...subDefs);     // 子释义（target优先）
                    nodesToMove.push(...otherParts);  // 其他元素
                } else {
                    // 没找到主释义，按原来的逻辑处理
                    const targetIndex = fullBlockElements.indexOf(targetDef);
                    const beforeTarget = fullBlockElements.slice(1, targetIndex);
                    const afterTarget = fullBlockElements.slice(targetIndex + 1);
                    
                    nodesToMove.push(...beforeTarget);
                    nodesToMove.push(targetDef);
                    nodesToMove.push(...afterTarget);
                }
            } else {
                // target有.num，按原来的逻辑处理
                const targetIndex = fullBlockElements.indexOf(targetDef);
                const beforeTarget = fullBlockElements.slice(1, targetIndex);
                const afterTarget = fullBlockElements.slice(targetIndex + 1);
                
                const beforeTargetWithoutNum = beforeTarget.filter(el => 
                    !el.querySelector('span[data-sc-class="num"]')
                );
                const beforeTargetWithNum = beforeTarget.filter(el => 
                    el.querySelector('span[data-sc-class="num"]')
                );
                
                nodesToMove.push(...beforeTargetWithoutNum);
                nodesToMove.push(targetDef);
                nodesToMove.push(...beforeTargetWithNum);
                nodesToMove.push(...afterTarget);
            }
        }
    } else {
        // 如果块起点是带.num的def1，没有块标记
        // 关键改进：需要特殊处理target是无.num的情况
        if (!targetDef.matches('div[data-sc-class="def1"]') || !targetDef.querySelector('span[data-sc-class="num"]')) {
            // Target无.num，它是blockStartElement的子释义
            // 策略：将blockStartElement及其所有子释义（连续的无.num的def1）作为一个整体
            const mainDef = blockStartElement;  // 主释义（有.num）
            const targetIndex = fullBlockElements.indexOf(targetDef);
            
            // 找到主释义后面连续的所有无.num的def1（包括target）
            const mainDefIndex = fullBlockElements.indexOf(mainDef);
            const subDefs = [];
            for (let i = mainDefIndex + 1; i < fullBlockElements.length; i++) {
                const el = fullBlockElements[i];
                if (el.matches('div[data-sc-class="def1"]') && !el.querySelector('span[data-sc-class="num"]')) {
                    subDefs.push(el);
                } else {
                    break;  // 遇到有.num的def1，停止收集子释义
                }
            }
            
            // 将target移到subDefs的最前面
            const targetInSubDefs = subDefs.indexOf(targetDef);
            if (targetInSubDefs > 0) {
                subDefs.splice(targetInSubDefs, 1);
                subDefs.unshift(targetDef);
            }
            
            // 其他元素（不包括主释义和子释义）
            const otherParts = fullBlockElements.filter(el => 
                el !== mainDef && !subDefs.includes(el)
            );
            
            nodesToMove.push(mainDef);        // 主释义在最前
            nodesToMove.push(...subDefs);     // 子释义紧跟主释义（target在最前）
            nodesToMove.push(...otherParts);  // 其他元素排在最后
        } else {
            // Target有.num，按原来的逻辑处理
            const otherParts = fullBlockElements.filter(el => 
                el !== blockStartElement && el !== targetDef
            );
            
            nodesToMove.push(blockStartElement);  // 块起点在最前
            nodesToMove.push(targetDef);          // 目标紧跟块起点
            nodesToMove.push(...otherParts);      // 其他元素排在最后
        }
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
                    // 需要检查是否使用了子释义处理逻辑
                    if (!targetDef.matches('div[data-sc-class="def1"]') || !targetDef.querySelector('span[data-sc-class="num"]')) {
                        // 使用了子释义处理逻辑，按照nodesToMove的顺序重新插入
                        // nodesToMove已经包含了正确的顺序：[mainDef, ...subDefs, ...otherParts]
                        const mainDef = nodesToMove[0];
                        const subDefs = [];
                        const otherParts = [];
                        
                        let i = 1;
                        // 收集子释义（连续的无.num的def1）
                        while (i < nodesToMove.length && 
                               !nodesToMove[i].matches('div[data-sc-class="def1"]') || 
                               !nodesToMove[i].querySelector('span[data-sc-class="num"]')) {
                            subDefs.push(nodesToMove[i]);
                            i++;
                        }
                        
                        // 其余的是其他元素
                        otherParts.push(...nodesToMove.slice(i));
                        
                        // 重新插入
                        if (subDefs.length > 0) {
                            mainDef.after(...subDefs);
                            if (otherParts.length > 0) {
                                subDefs[subDefs.length - 1].after(...otherParts);
                            }
                        } else if (otherParts.length > 0) {
                            mainDef.after(...otherParts);
                        }
                    } else {
                        // 使用简单的处理逻辑
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