function createMeikyoNichihanAdapter() {
    const dictionaryName = '明鏡日汉双解辞典';

    function hasNum(element) {
        return element.matches('div[data-sc-class="def1"]') &&
            (element.querySelector('span[data-sc-class="num"]') ||
                element.querySelector('span[data-sc-class="num_circle"]') ||
                element.querySelector('div[data-sc-class="num"]') ||
                element.querySelector('div[data-sc-class="num_circle"]'));
    }

    function isDef0(element) {
        return element.matches('div[data-sc-class="def0"]');
    }

    function hasAncestorDef0(element) {
        let ancestorCheck = element.previousElementSibling;

        while (ancestorCheck) {
            if (isDef0(ancestorCheck)) {
                return true;
            } else if (ancestorCheck.matches('div[data-sc-class="def1"]')) {
                ancestorCheck = ancestorCheck.previousElementSibling;
            } else {
                break;
            }
        }
        return false;
    }

    function collectSubDefs(startIndex, fullBlockElements) {
        const subDefs = [];
        for (let i = startIndex + 1; i < fullBlockElements.length; i++) {
            const el = fullBlockElements[i];
            if (el.matches('div[data-sc-class="def1"]') && !hasNum(el)) {
                subDefs.push(el);
            } else {
                break;
            }
        }
        return subDefs;
    }

    function prioritizeTarget(targetDef, subDefs) {
        const targetInSubDefs = subDefs.indexOf(targetDef);
        if (targetInSubDefs > 0) {
            subDefs.splice(targetInSubDefs, 1);
            subDefs.unshift(targetDef);
        }
    }

    function getTargetDef(underlinedElement) {
        const targetDef = underlinedElement.closest('div[data-sc-class="def1"]');
        if (!targetDef) return null;

        const parentLi = targetDef.closest('li[data-dictionary]');
        if (!parentLi || parentLi.getAttribute('data-dictionary') !== dictionaryName) {
            return null;
        }

        return targetDef;
    }

    function canHandle(context) {
        const targetDef = getTargetDef(context.underlinedElement);
        return Boolean(targetDef && targetDef.closest('div[data-sc-class="mjrhsjcd-entry"]'));
    }

    function pin(context) {
        const targetDef = getTargetDef(context.underlinedElement);
        if (!targetDef) return;

        const entryContainer = targetDef.closest('div[data-sc-class="mjrhsjcd-entry"]');
        if (!entryContainer) return;

        let blockStartElement = targetDef;
        let current = targetDef.previousElementSibling;
        const targetHasNum = hasNum(targetDef);

        if (targetHasNum) {
            while (current) {
                if (isDef0(current)) {
                    blockStartElement = current;
                    break;
                } else if (hasNum(current)) {
                    if (!hasAncestorDef0(current)) {
                        break;
                    }
                }
                current = current.previousElementSibling;
            }
        } else {
            let firstDef1WithNum = null;

            while (current) {
                if (isDef0(current)) {
                    blockStartElement = current;
                    break;
                } else if (hasNum(current)) {
                    if (!firstDef1WithNum) {
                        firstDef1WithNum = current;
                    }
                }
                current = current.previousElementSibling;
            }

            if (blockStartElement === targetDef && firstDef1WithNum) {
                blockStartElement = firstDef1WithNum;
            }
        }

        const fullBlockElements = [blockStartElement];
        let nextInBlock = blockStartElement.nextElementSibling;
        const isBlockStartedByDef0 = isDef0(blockStartElement);

        while (nextInBlock) {
            if (isBlockStartedByDef0) {
                if (isDef0(nextInBlock)) {
                    break;
                }
            } else if (hasNum(nextInBlock)) {
                break;
            }
            fullBlockElements.push(nextInBlock);
            nextInBlock = nextInBlock.nextElementSibling;
        }

        const nodesToMove = [];

        if (isDef0(blockStartElement)) {
            nodesToMove.push(blockStartElement);

            if (targetDef !== blockStartElement) {
                const currentTargetHasNum = hasNum(targetDef);

                if (!currentTargetHasNum) {
                    const targetIndex = fullBlockElements.indexOf(targetDef);
                    let mainDef = null;

                    for (let i = targetIndex - 1; i >= 1; i--) {
                        const el = fullBlockElements[i];
                        if (hasNum(el)) {
                            mainDef = el;
                            break;
                        }
                    }

                    if (mainDef) {
                        const mainDefIndex = fullBlockElements.indexOf(mainDef);
                        const subDefs = collectSubDefs(mainDefIndex, fullBlockElements);
                        prioritizeTarget(targetDef, subDefs);

                        const otherParts = fullBlockElements.filter(el =>
                            el !== blockStartElement && el !== mainDef && !subDefs.includes(el)
                        );

                        nodesToMove.push(mainDef);
                        nodesToMove.push(...subDefs);
                        nodesToMove.push(...otherParts);
                    } else {
                        const beforeTarget = fullBlockElements.slice(1, targetIndex);
                        const afterTarget = fullBlockElements.slice(targetIndex + 1);

                        nodesToMove.push(...beforeTarget);
                        nodesToMove.push(targetDef);
                        nodesToMove.push(...afterTarget);
                    }
                } else {
                    const blockBody = fullBlockElements.slice(1);
                    const preamble = [];
                    const numberedGroups = [];
                    let bodyIndex = 0;

                    while (bodyIndex < blockBody.length) {
                        const element = blockBody[bodyIndex];

                        if (hasNum(element)) {
                            const group = [element];
                            bodyIndex++;

                            while (
                                bodyIndex < blockBody.length &&
                                blockBody[bodyIndex].matches('div[data-sc-class="def1"]') &&
                                !hasNum(blockBody[bodyIndex])
                            ) {
                                group.push(blockBody[bodyIndex]);
                                bodyIndex++;
                            }

                            numberedGroups.push(group);
                        } else {
                            if (numberedGroups.length === 0) {
                                preamble.push(element);
                            } else {
                                numberedGroups[numberedGroups.length - 1].push(element);
                            }
                            bodyIndex++;
                        }
                    }

                    const targetGroupIndex = numberedGroups.findIndex(group => group.includes(targetDef));

                    if (targetGroupIndex !== -1) {
                        const included = new Set(nodesToMove);

                        for (const element of preamble) {
                            if (!included.has(element)) {
                                nodesToMove.push(element);
                                included.add(element);
                            }
                        }

                        const targetGroup = numberedGroups[targetGroupIndex];
                        for (const element of targetGroup) {
                            if (!included.has(element)) {
                                nodesToMove.push(element);
                                included.add(element);
                            }
                        }

                        numberedGroups.forEach((group, index) => {
                            if (index === targetGroupIndex) return;
                            for (const element of group) {
                                if (!included.has(element)) {
                                    nodesToMove.push(element);
                                    included.add(element);
                                }
                            }
                        });

                        for (const element of blockBody) {
                            if (!included.has(element)) {
                                nodesToMove.push(element);
                                included.add(element);
                            }
                        }
                    } else {
                        const targetIndex = fullBlockElements.indexOf(targetDef);
                        const beforeTarget = fullBlockElements.slice(1, targetIndex);
                        const afterTarget = fullBlockElements.slice(targetIndex + 1);

                        const beforeTargetWithoutNum = beforeTarget.filter(el => !hasNum(el));
                        const beforeTargetWithNum = beforeTarget.filter(el => hasNum(el));

                        nodesToMove.push(...beforeTargetWithoutNum);
                        nodesToMove.push(targetDef);
                        nodesToMove.push(...beforeTargetWithNum);
                        nodesToMove.push(...afterTarget);
                    }
                }
            }
        } else if (!hasNum(targetDef)) {
            const mainDef = blockStartElement;
            const mainDefIndex = fullBlockElements.indexOf(mainDef);
            const subDefs = collectSubDefs(mainDefIndex, fullBlockElements);
            prioritizeTarget(targetDef, subDefs);

            const otherParts = fullBlockElements.filter(el =>
                el !== mainDef && !subDefs.includes(el)
            );

            nodesToMove.push(mainDef);
            nodesToMove.push(...subDefs);
            nodesToMove.push(...otherParts);
        } else {
            const otherParts = fullBlockElements.filter(el =>
                el !== blockStartElement && el !== targetDef
            );

            nodesToMove.push(blockStartElement);
            nodesToMove.push(targetDef);
            nodesToMove.push(...otherParts);
        }

        context.highlightElement(targetDef);

        let insertionPoint = null;
        const allDefs = entryContainer.querySelectorAll('div[data-sc-class="def0"], div[data-sc-class="def1"]');
        for (const def of allDefs) {
            if (isDef0(def) || hasNum(def)) {
                insertionPoint = def;
                break;
            }
        }

        if (insertionPoint) {
            if (insertionPoint === blockStartElement) {
                if (nodesToMove.length > 1) {
                    let lastNode = nodesToMove[0];
                    for (let index = 1; index < nodesToMove.length; index++) {
                        const currentNode = nodesToMove[index];
                        if (currentNode.previousElementSibling !== lastNode) {
                            lastNode.after(currentNode);
                        }
                        lastNode = currentNode;
                    }
                }
            } else {
                insertionPoint.before(...nodesToMove);
            }
        }

        context.moveDictionaryToTop(targetDef);
    }

    return {
        name: 'meikyo-nichihan',
        canHandle,
        pin
    };
}
