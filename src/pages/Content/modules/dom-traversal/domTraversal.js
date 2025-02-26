function getActualBackgroundColor(element) {
    while (element) {
        const bgColor = window.getComputedStyle(element).backgroundColor;

        // Check if it's a valid, non-transparent color
        if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
            return bgColor;
        }

        element = element.parentElement; // Move to parent
    }
    return "white"; // Default background
}

function getBrightness(hex) {
    let { r, g, b } = hexToRGB(hex);
    let brightness = Math.sqrt(
        r * r * 0.241 +
        g * g * 0.691 +
        b * b * 0.068
    );
    return { brightness, hex: rgbToHex(r, g, b) };
}

// Helper function to convert HEX to RGB
function hexToRGB(hex) {
    hex = hex.replace(/^#/, "");
    let bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

// Helper function to convert RGB back to HEX
function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Example usage:
console.log(getBrightness("#ff5733")); // { brightness: 139.7, hex: "#ff5733" }



export async function filterMatches(tokensArray, negatives, nodes) {
    const negSet = new Set(negatives.map((neg) => `${neg.symId}:${neg.symbol}`));

    // Process a single match within a text node
    function createHighlightedFragment(text, match, symbol, symbolObj) {
        const frag = document.createDocumentFragment();
        const span = document.createElement('span');

        span.style.background = symbolObj.color || '#FFD0A3'
        span.style.color = getBrightness(symbolObj.color || '#FFD0A3') < 130 ? 'white' : 'black';
        span.className = 'levenshtineMatches';
        span.innerHTML = match;

        // Add hover event listener
        span.addEventListener('mouseover', () => {
            const flagButton = document.getElementById('flagButton');
            flagButton.classList.remove('hide');
            flagButton.style.top = span.getBoundingClientRect().y - 20 + "px";
            flagButton.style.left = span.getBoundingClientRect().x - 30 + "px";

            flagButton.removeEventListener("click", flagButton._clickHandler);
            flagButton._clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                chrome.runtime.sendMessage({
                    msg: 'clickedSymbol',
                    payload: {
                        clickedSymbol: symbol
                    }
                });
            };
            flagButton.addEventListener('click', flagButton._clickHandler);
        });

        return span;
    }

    try {

        // Process each text node
        let textNodes = nodes;

        for (const node of textNodes) {
            let text = node.nodeValue;
            let matches = [];

            //let nodeBgColor = getActualBackgroundColor(node.parentElement);

            // Find all matches for all symbols in this text node
            for (const { symbol, symbolObj } of tokensArray) {
                const isNegative = negSet.has(`${symbolObj.symId}:${symbol.toLocaleLowerCase().replace(/[ .]/g, "")}`);
                if (isNegative) continue;

                const regexPattern = symbol.replace(/[\s.\-]+/g, "[\\s.\\-]*");
                const regex = new RegExp(`\\b${regexPattern}\\b`, "gi");

                let match;
                while ((match = regex.exec(text)) !== null) {
                    const existingMatch = matches.find((existingMatch) => existingMatch.symbolObj.symId == symbolObj.symId)
                    if (existingMatch?.index < match?.index && existingMatch?.text.length > match?.index) continue;

                    matches.push({
                        index: match.index,
                        length: match[0].length,
                        text: match[0],
                        symbol,
                        symbolObj
                    });
                }
            }

            // Sort matches by index
            matches.sort((a, b) => a.index - b.index);

            // Create fragments with highlights
            if (matches.length > 0) {
                const frag = document.createDocumentFragment();
                let lastIndex = 0;

                for (const match of matches) {

                    // Add text before the match
                    if (match.index > lastIndex) {
                        frag.appendChild(document.createTextNode(
                            text.substring(lastIndex, match.index)
                        ));
                    } else if (match.index < lastIndex) continue;

                    // Add the highlighted match
                    const highlightSpan = createHighlightedFragment(
                        text,
                        match.text,
                        match.symbol,
                        match.symbolObj,
                        match.nodeBgColor
                    );
                    highlightSpan.textContent = match.text;
                    frag.appendChild(highlightSpan);

                    lastIndex = match.index + match.length;
                }

                // Add any remaining text
                if (lastIndex < text.length) {
                    frag.appendChild(document.createTextNode(
                        text.substring(lastIndex)
                    ));
                }

                node.parentNode.replaceChild(frag, node);
            }
        }
    } catch (error) {
        console.error('Error in filterMatches:', error);
    }
}