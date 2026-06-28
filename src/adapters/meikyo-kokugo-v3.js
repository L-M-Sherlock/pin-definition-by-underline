function createMeikyoKokugoV3Adapter() {
    const dictionaryName = '明鏡国語辞典 第三版';

    function getTargetMeaning(underlinedElement) {
        const targetMeaning = underlinedElement.closest(
            'div[data-sc-meaning][data-sc-class="level0"], div[data-sc-meaning][data-sc-class="level1"]'
        );
        if (!targetMeaning) return null;

        const parentLi = targetMeaning.closest('li[data-dictionary]');
        if (!parentLi || parentLi.getAttribute('data-dictionary') !== dictionaryName) {
            return null;
        }

        return targetMeaning;
    }

    function isLevel0(element) {
        return element.matches('div[data-sc-meaning][data-sc-class="level0"]');
    }

    function isLevel1(element) {
        return element.matches('div[data-sc-meaning][data-sc-class="level1"]');
    }

    function getBody(targetMeaning) {
        return targetMeaning.closest('div[data-sc-body]');
    }

    function collectMeaningGroup(targetMeaning) {
        const nodes = [targetMeaning];
        let next = targetMeaning.nextElementSibling;

        while (next && next.matches('div[data-sc-example]')) {
            nodes.push(next);
            next = next.nextElementSibling;
        }

        return nodes;
    }

    function collectLevel0Group(targetMeaning) {
        const nodes = [targetMeaning];
        let next = targetMeaning.nextElementSibling;

        while (next && !isLevel0(next)) {
            nodes.push(next);
            next = next.nextElementSibling;
        }

        return nodes;
    }

    function findLevel0InsertionPoint(body) {
        return body.querySelector('div[data-sc-meaning][data-sc-class="level0"]');
    }

    function findOwningLevel0(targetMeaning) {
        let current = targetMeaning.previousElementSibling;

        while (current) {
            if (isLevel0(current)) {
                return current;
            }
            current = current.previousElementSibling;
        }

        return null;
    }

    function findLevel1InsertionPoint(body, targetMeaning) {
        const owningLevel0 = findOwningLevel0(targetMeaning);
        let current = owningLevel0 ? owningLevel0.nextElementSibling : body.firstElementChild;

        while (current && !isLevel0(current)) {
            if (isLevel1(current)) {
                return current;
            }
            current = current.nextElementSibling;
        }

        return null;
    }

    function canHandle(context) {
        const targetMeaning = getTargetMeaning(context.underlinedElement);
        return Boolean(targetMeaning && targetMeaning.closest('div[data-sc-dic-item]') && getBody(targetMeaning));
    }

    function pin(context) {
        const targetMeaning = getTargetMeaning(context.underlinedElement);
        if (!targetMeaning) return;

        const body = getBody(targetMeaning);
        if (!body) return;

        const nodesToMove = isLevel0(targetMeaning) ?
            collectLevel0Group(targetMeaning) :
            collectMeaningGroup(targetMeaning);
        const insertionPoint = isLevel0(targetMeaning) ?
            findLevel0InsertionPoint(body) :
            findLevel1InsertionPoint(body, targetMeaning);

        context.highlightElement(targetMeaning);

        if (insertionPoint && insertionPoint !== targetMeaning) {
            insertionPoint.before(...nodesToMove);
        }

        context.moveDictionaryToTop(targetMeaning);
    }

    return {
        name: 'meikyo-kokugo-v3',
        canHandle,
        pin
    };
}
