import { filterMatches } from "./modules/dom-traversal/domTraversal";

let ctrlKeyPressed;

let currentSymbol
let cursorX;
let cursorY;

export let symbolsList = [];
let negativesList, currentUrl
let mainNodeLog, mutationNodeLog
let observer;

const flagButton = document.createElement('button')
flagButton.id = 'flagButton'
flagButton.classList.add('hide')
flagButton.textContent = '📝'
document.body.appendChild(flagButton)


const button = document.createElement('button')
document.body.appendChild(button)

button.id = 'note-down'
button.textContent = '+'

button.classList.add('hide')


const onClickHandler = (e) => {
    e.preventDefault()
    e.stopPropagation()
    button.classList.add('hide')
    const clickedSymbol = currentSymbol.trim()
    console.log(clickedSymbol, " has been clicked")
    chrome.runtime.sendMessage({
        msg: 'clickedSymbol', payload: {
            clickedSymbol
        }
    })
}

button.addEventListener('click', onClickHandler)

window.addEventListener('scroll', () => {
    button.classList.add('hide')
    flagButton.classList.add('hide')
})

document.body.onmouseup = (e) => {
    // indicator.classList.add('hide')
    cursorX = e.clientX
    cursorY = e.clientY

    const selectionObj = window.getSelection()
    const selectedString = selectionObj.toString().trim()

    if (selectedString) {

        currentSymbol = selectedString

        document.getElementById('note-down').classList.remove('hide')
        button.style.top = cursorY - 30 + "px"
        button.style.left = cursorX + 30 + "px"
    } else {
        button.classList.add('hide')
    }
}

document.onselectionchange = () => {
    flagButton.classList.add('hide')
}

async function getTextNodes(root, currentUpdatedSymbol) {

    //Clear existing highlights of a particular already highlighted symbol if we're processing the whole document and that symbol has been updated
    if (root === document.body && currentUpdatedSymbol) {
        document.querySelectorAll('.levenshtineMatches').forEach((node) => {
            currentUpdatedSymbol.symbols.forEach((symbol) => {
                const regex = new RegExp(`\\b${symbol.replace(/[\s.\-]+/g, "[\\s.\\-]*")}\\b`, "gi");

                if (!node.textContent.match(regex)) return;
                node.parentNode?.replaceChild(document.createTextNode(node.textContent), node);
            })
        });
    }

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                if (node.parentNode.classList?.contains('levenshtineMatches') ||
                    ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(node.parentNode.tagName) ||
                    node.textContent.match(/^(?:[\n ]*|\d+|[a-zA-Z])$/)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let currentNode;

    if (root == document.body) {
        mainNodeLog = [];
        while (currentNode = walker.nextNode()) {
            mainNodeLog.push(currentNode);
        }
        return;
    }

    while (currentNode = walker.nextNode()) {
        mutationNodeLog.push(currentNode);
    }
    return;

}

const startObserving = () => {
    mutationNodeLog = [];

    if (observer) {
        observer.disconnect()
    }

    observer = new MutationObserver((mutations) => {

        let shouldTraverse;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes?.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains('levenshtineMatches')) {
                        if (symbolsList.length) {
                            getTextNodes(mutation.target)
                            clearTimeout(window.mutationDebounceId)
                            window.mutationDebounceId = setTimeout(() => {
                                filterMatches(symbolsList, negativesList, mutationNodeLog)
                            }, 100)
                        }
                    }
                })
            }

        })

    })

    observer.observe(document.body, {
        childList: true,
        subtree: true
    })
}


chrome.runtime.sendMessage({ msg: 'requestedSymbolList' }, (res) => {
    if (!res?.symbols?.length) {
        console.log("Didn't recieve symbols")
        return;
    }

    currentUrl = res.url

    res.symbols.forEach((symbolObj) => {
        symbolObj.symbols.forEach((symbol) => {
            symbolsList.push({ symbol, symbolObj: { symId: symbolObj.symId, color: symbolObj.color } })
        })
    })

    negativesList = res.negatives.filter((negative) => {
        return negative.urls.find((url) => (currentUrl).includes(url))
    })

    symbolsList.sort((a, b) => b.symbol.length - a.symbol.length)
    mainNodeLog = []

    getTextNodes(document.body).then(() => {
        filterMatches(symbolsList, negativesList, mainNodeLog)
        startObserving()
    })

})

chrome.runtime.onMessage.addListener((message) => {
    if (message.msg == 'updatedSymbol') {
        getTextNodes(document.body, message.payload.symbolObj).then(() => {
            filterMatches([...message.payload.symbolObj.symbols.map(symbol => ({
                symbol,
                symbolObj: message.payload.symbolObj
            }))], negativesList, mainNodeLog)
        })
    }
})

window.onkeydown = (e) => {
    console.log(e.key)
    if (e.ctrlKey && !ctrlKeyPressed) {
        ctrlKeyPressed = true
    } else if (e.key == "ArrowDown") {
        ctrlKeyPressed ? chrome.runtime.sendMessage({ msg: 'openQuickNotes' }) : null
    }
}

window.onkeyup = (e) => {
    console.log(e.key)
    if (e.key == 'Control' || e.key == "ArrowDown") {
        console.log('up')
        ctrlKeyPressed = false;
    }
}