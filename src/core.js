function pinByUnderline() {
    const glossary = document.querySelector('.yomitan-glossary');
    if (!glossary) return;

    const underlinedElement = glossary.querySelector('u');
    if (!underlinedElement) return;

    const htmlElement = document.documentElement;
    const isNightMode = htmlElement.classList.contains('night-mode');
    const highlightColor = isNightMode ? '#000000' : '#fff2a8';

    const context = {
        glossary,
        underlinedElement,
        highlightElement(element) {
            element.style.backgroundColor = highlightColor;
        },
        moveDictionaryToTop(element) {
            const parentLi = element.closest('li[data-dictionary]');
            if (parentLi && parentLi.parentElement) {
                parentLi.parentElement.prepend(parentLi);
            }
        }
    };

    const adapters = [
        createMeikyoNichihanAdapter(),
        createMeikyoKokugoV3Adapter()
    ];

    for (const adapter of adapters) {
        if (adapter.canHandle(context)) {
            adapter.pin(context);
            return;
        }
    }
}
