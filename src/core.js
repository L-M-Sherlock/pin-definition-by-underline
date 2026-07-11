function pinByUnderline() {
    const glossary = document.querySelector('.yomitan-glossary');
    if (!glossary) return;

    const underlinedElement = glossary.querySelector('u');
    if (!underlinedElement) return;

    const highlightClassName = 'pin-by-underline-highlight';

    function ensureHighlightStyles() {
        const styleId = 'pin-by-underline-highlight-styles';
        if (document.getElementById(styleId)) return;

        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
.${highlightClassName} {
    background-color: #fff2a8 !important;
}

.nightMode .${highlightClassName},
.night_mode .${highlightClassName},
.night-mode .${highlightClassName} {
    background-color: #000000 !important;
}
`;
        document.head.appendChild(styleElement);
    }

    const context = {
        glossary,
        underlinedElement,
        highlightElement(element) {
            ensureHighlightStyles();
            element.classList.add(highlightClassName);
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
