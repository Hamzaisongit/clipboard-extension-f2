import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, dexieStore } from "../../Dexie/DexieStore";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useSnippets } from "./SnippetContext";
import { addOrUpdateNegativesToSheet, addOrUpdateSymbolToSheet } from "../../Dexie/utils/sheetSyncHandlers";
import cuid from "cuid";

export const NoteSettings = () => {
    const activeSymbolId = parseInt(useParams().activeSymbolId);
    const [activeSymbol, setActiveSymbol] = useState({});
    const [titleInput, setTitleInput] = useState("");
    const [variantInput, setVariantInput] = useState("");
    const [linkedSymbols, setLinkedSymbols] = useState([]);
    const [negativeUrls, setNegativeUrls] = useState([]);
    const [negativeUrlInput, setNegativeUrlInput] = useState("");
    const [selectedColor, setSelectedColor] = useState("#FFD0A3")
    const [favoriteColors, setFavoritecolors] = useState([])

    const colorReference = useRef("")

    const { isDarkMode, setSymbolDataSynced, setNotificationState, setLoadingScreenState } = useSnippets()
    const navigate = useNavigate();

    useEffect(() => {
        dexieStore.getSymbol(activeSymbolId).then((symbol) => {
            setActiveSymbol(symbol);
            setTitleInput(symbol.title);
            setLinkedSymbols(symbol.symbols);
            setSelectedColor(symbol.color || "#FFD0A3")
            colorReference.current = symbol.color || "#FFD0A3"
        });

        chrome.storage.local.get("favoriteColors", (val) => {
            setFavoritecolors(val.favoriteColors || [])
        })
    }, []);

    useEffect(() => {
        dexieStore.getNegatives(linkedSymbols.map((symbol) => {
            return [
                activeSymbolId,
                symbol.toLocaleLowerCase().replace(/[ .]/g, "")
            ]
        })).then((arr) => {
            setNegativeUrls(arr.filter(negative => negative))
        })

    }, [linkedSymbols])

    return (
        <div
            className={` w-full h-full flex flex-col ${isDarkMode ? "bg-gray-900 text-gray-300" : "bg-white text-gray-800"
                }`}
        >
            {/* Header */}
            <div className="flex p-2 items-center mb-2">
                <ArrowLeft
                    className={`cursor-pointer ${isDarkMode ? "text-[#00d091]" : "text-[#008069]"
                        } hover:opacity-80`}
                    size={24}
                    onClick={() => navigate(`/activeNotes/${activeSymbol.symId}`)}
                />
                <span className="px-4 font-semibold text-2xl">Settings</span>
            </div>
            <div className="p-3 pb-0 w-full h-full overflow-y-scroll">
                {/* Title Section */}
                <div
                    className={`mb-4 p-4 rounded-md ${isDarkMode ? "bg-gray-800" : "bg-gray-100"
                        }`}
                >
                    <label className="block mb-2 text-lg font-semibold">Title</label>
                    <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md mb-3 ${isDarkMode
                            ? "bg-gray-700 border-gray-600 text-gray-200"
                            : "bg-white border-gray-300"
                            }`}
                    />
                </div>

                {/* Highlighter */}
                <div
                    className={`mb-4 p-4 rounded-md ${isDarkMode ? "bg-gray-800" : "bg-gray-100"
                        }`}
                >
                    <label htmlFor="selectedColor" className="block mb-2 text-lg font-semibold">Highlight Color:</label>

                    <div className="flex flex-col mb-2">
                        <div className="flex flex-row items-center mb-2">
                            <span className="mb-1">Color :</span>
                            <span style={{ background: selectedColor }} className={`w-5 h-5 rounded-full mx-1 inline-block cursor-pointer`} onClick={() => {
                                document.getElementById("highlight-color-selector").click();
                                const colorWatcher = (e) => {
                                    setSelectedColor(e.target.value)
                                    document.getElementById("highlight-color-selector").removeEventListener('change', colorWatcher);
                                };
                                document.getElementById("highlight-color-selector").addEventListener('change', colorWatcher);
                            }}></span>
                            <span className="text-[10px] text-gray-400">{"(hover to select, click to remove)"}</span>
                        </div>

                        <div
                            id="highlight-color-container"
                            className="flex flex-wrap gap-3 p-2 pl-6 border rounded-lg w-full h-fit overflow-y-auto"
                        >

                            {/* Render Favorite Colors */}
                            {favoriteColors.map((color, index) => (
                                <span
                                    key={index}
                                    className={`w-6 h-6 rounded-full border hover:border-gray-500 cursor-grab`}
                                    style={{ backgroundColor: color }}
                                    onMouseOver={() => {
                                        setSelectedColor(color)
                                    }}
                                    onClick={() => {
                                        chrome.storage.local.get("favoriteColors", (val) => {
                                            chrome.storage.local.set({ "favoriteColors": val.favoriteColors?.filter(i => i !== color) })
                                        })
                                        setFavoritecolors(p => p.filter((clr) => clr !== color))
                                    }}
                                >

                                </span>
                            ))}

                            {/* Add New Color Button */}
                            <span className="w-6 h-6 rounded-full">
                                <button
                                    className={`text-center pb-1 w-full h-full font-bold text-sm ${isDarkMode ? 'bg-gray-500' : 'bg-gray-200'}  rounded-md hover:${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} transition`}
                                    onClick={
                                        () => {
                                            document.getElementById("highlight-color-selector").click();
                                            const colorWatcher = (e) => {
                                                chrome.storage.local.get("favoriteColors", (val) => {
                                                    chrome.storage.local.set({ "favoriteColors": val.favoriteColors ? [...val.favoriteColors, e.target.value] : [e.target.value] })
                                                })
                                                setFavoritecolors(p => {
                                                    return [...p, e.target.value]
                                                })
                                                document.getElementById("highlight-color-selector").removeEventListener('change', colorWatcher);
                                            };
                                            document.getElementById("highlight-color-selector").addEventListener('change', colorWatcher);
                                        }
                                    }
                                >
                                    +
                                </button>
                            </span>
                            {!favoriteColors.length ? <p className="text-center text-gray-500">no favorite colors availabe!</p> : null}
                        </div>

                        <input
                            id="highlight-color-selector"
                            type="color"
                            className="hidden"
                        />

                        <input id="highlight-color-selector" className="hidden" type="color"></input>
                    </div>
                </div>


                {/* Linked Symbols Section */}
                <div
                    className={`mb-4 p-4 rounded-md ${isDarkMode ? "bg-gray-800" : "bg-gray-100"
                        }`}
                >
                    <span className="block mb-2 text-lg font-semibold">Linked Symbols</span>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {linkedSymbols.map((variant, index) => (
                            <div
                                key={index}
                                className={`flex items-center px-3 py-1 rounded-md ${isDarkMode
                                    ? "bg-gray-700 text-gray-200 border border-gray-600"
                                    : "bg-white text-gray-800 border border-gray-300"
                                    }`}
                            >
                                {variant}
                                <button
                                    onClick={() => {
                                        if (linkedSymbols.length == 1) return;
                                        setLinkedSymbols((p) => p.filter((ele) => ele !== variant));
                                    }}
                                    className="ml-2 hover:opacity-75"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={variantInput}
                            onChange={(e) => setVariantInput(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md ${isDarkMode
                                ? "bg-gray-700 border-gray-600 text-gray-200"
                                : "bg-white border-gray-300"
                                }`}
                        />
                        <button
                            onClick={async () => {
                                if (!variantInput) return;
                                setLinkedSymbols((p) => [...p, variantInput.trim()]);
                                setVariantInput("");
                            }}
                            className={`px-3 py-1 rounded-md ${isDarkMode
                                ? "bg-green-500 hover:bg-green-400 text-gray-900"
                                : "bg-green-500 hover:bg-green-400 text-white"
                                }`}
                        >
                            <Plus size={15} strokeWidth={3} />
                        </button>
                    </div>
                </div>


                {/* Negative URLs Section */}
                <div
                    className={`mb-4 p-4 rounded-md ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}
                >
                    {/* Title */}
                    <label className="block mb-4 text-lg font-semibold">Negative URLs</label>

                    {/* Negative URL Display */}
                    <div className="mb-4 flex flex-wrap gap-4">
                        {negativeUrls.map((negative, index) => !negative.urls.length ? null : (
                            <div
                                key={index}
                                className={`p-3 rounded-md shadow-sm w-full sm:w-auto ${isDarkMode
                                    ? "bg-gray-700 text-gray-200 border border-gray-600"
                                    : "bg-white text-gray-800 border border-gray-300"
                                    }`}
                            >
                                {/* Symbol Label */}
                                <p className="font-medium mb-2">
                                    {linkedSymbols.find(symbol =>
                                        symbol.toLocaleLowerCase().replace(/[ .]/g, "") ===
                                        negative.symbol.toLocaleLowerCase().replace(/[ .]/g, "")
                                    )}
                                </p>

                                {/* URL List */}
                                <div className="space-y-1">
                                    {negative.urls.map((url, urlIndex) => (
                                        <div
                                            key={urlIndex}
                                            className="flex items-center gap-2 p-2 rounded-md bg-opacity-80 border"
                                        >
                                            <span
                                                className={`text-sm font-medium break-words ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
                                                style={{ maxWidth: "150px" }}
                                            >
                                                {url}
                                            </span>
                                            <button
                                                onClick={async () => {

                                                    setNegativeUrls((prev) => [
                                                        ...prev.filter((i) => i.symbol !== negative.symbol),
                                                        {
                                                            ...negative,
                                                            urls: negative.urls.filter((i) => !i.includes(url)),
                                                        },
                                                    ]);

                                                }}
                                                className="p-1 rounded hover:bg-red-100"
                                            >
                                                <Trash2 size={16} strokeWidth={2} className="text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input Section */}
                    <div
                        className={`p-2 rounded-md border ${isDarkMode
                            ? "bg-gray-700 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                            }`}
                    >
                        {/* Select Dropdown */}
                        <div className="mb-3">
                            <select
                                id="negativeUrlSymbolSelector"
                                className={`w-full px-3 py-2 border rounded-md ${isDarkMode
                                    ? "bg-gray-800 border-gray-600 text-gray-200"
                                    : "bg-white border-gray-300"
                                    }`}
                            >
                                <option value={""}>Select a symbol</option>
                                {linkedSymbols.map((symbol) => (
                                    <option value={symbol} key={symbol}>{symbol}</option>
                                ))}
                            </select>
                        </div>

                        {/* Input and Button */}
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={negativeUrlInput}
                                onChange={(e) => setNegativeUrlInput(e.target.value)}
                                placeholder="Enter a negative URL"
                                className={`flex-1 px-3 py-2 border rounded-md ${isDarkMode
                                    ? "bg-gray-800 border-gray-600 text-gray-200"
                                    : "bg-white border-gray-300"
                                    }`}
                            />

                            <button
                                onClick={() => {
                                    if (!negativeUrlInput || !document.getElementById("negativeUrlSymbolSelector").value) return;
                                    const negativeToBeUpdated = negativeUrls.find(
                                        (i) =>
                                            document
                                                .getElementById("negativeUrlSymbolSelector")
                                                .value.toLocaleLowerCase()
                                                .replace(/[ .]/g, "") === i.symbol
                                    );

                                    const negativeToBeAdded = {
                                        symId: activeSymbolId,
                                        symbol: document
                                            .getElementById("negativeUrlSymbolSelector")
                                            .value.toLocaleLowerCase()
                                            .replace(/[ .]/g, ""),
                                        urls: [negativeUrlInput.match(/^(?:https?:\/\/)?([^?#]+)/)[1]],
                                    };

                                    negativeToBeUpdated
                                        ? setNegativeUrls((prev) => [
                                            ...prev.filter((i) => i.symbol !== negativeToBeUpdated.symbol),
                                            {
                                                ...negativeToBeUpdated,
                                                urls: [...negativeToBeUpdated.urls, negativeUrlInput.match(/^(?:https?:\/\/)?([^?#]+)/)[1]],
                                            },
                                        ])
                                        : setNegativeUrls((prev) => [...prev, negativeToBeAdded]);

                                    setNegativeUrlInput("");
                                }}
                                className={`px-3 py-2 rounded-md shadow ${isDarkMode
                                    ? "bg-green-500 hover:bg-green-400 text-gray-900"
                                    : "bg-green-500 hover:bg-green-400 text-white"
                                    }`}
                            >
                                <Plus size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>


                <div className="sticky bottom-0 w-full backdrop-blur-lg shadow-lg flex justify-around items-center py-4">
                    <button
                        className={`mt-3 px-3 py-2 text-white rounded-md font-semibold ${isDarkMode
                            ? "bg-green-500 hover:bg-green-400"
                            : "bg-green-500 hover:bg-green-400"
                            }`}
                        onClick={async () => {
                            if (!titleInput) {
                                alert("Enter title please")
                                return;
                            }

                            setSymbolDataSynced(false)

                            //Handle Symbol on Local
                            await dexieStore.updateSymbol({
                                symId: activeSymbolId,
                                title: titleInput,
                                symbols: linkedSymbols,
                                color: selectedColor
                            })

                            //Handle Negatives on Local
                            await dexieStore.updateNegatives(negativeUrls)

                            //log the saved details in form of chatNote
                            if (colorReference.current !== selectedColor) {
                                dexieStore.addNote({
                                    symId: activeSymbolId,
                                    noteId: cuid(),
                                    date: Date.now(),
                                    colorChanged: [colorReference.current, selectedColor]
                                })
                            }

                            navigate(`/activeNotes/${activeSymbolId}`)

                            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                                chrome.tabs.sendMessage(tab.id, {
                                    msg: 'updatedSymbol', payload: {
                                        symbolObj: {
                                            symId: activeSymbolId,
                                            symbols: linkedSymbols,
                                            color: selectedColor
                                        }
                                    }
                                })
                            })


                            //chrome.tabs.reload()

                            //Update on sheet (below)
                            const remoteUpdate = await addOrUpdateNegativesToSheet(negativeUrls)

                            let syncNegatives = negativeUrls.map((i) => ({ ...i, synced: remoteUpdate != 'networkError' && remoteUpdate?.response?.result.status ? 'true' : 'false' }))

                            await db.negatives.bulkPut(syncNegatives)

                            const toBeDeleted = negativeUrls.filter(negative => !negative.urls.length)
                            if (remoteUpdate == 'networkError' || !remoteUpdate?.response?.result.status) {
                                toBeDeleted.length ? await db.deleteLog.bulkAdd(toBeDeleted.filter(negative => negative.synced == 'true').map(negative => {
                                    return {
                                        type: "negative",
                                        object: {
                                            symId: negative.symId,
                                            symbol: negative.symbol
                                        }
                                    }
                                })) : null
                            }


                            const remoteUpdatedSymbol = await addOrUpdateSymbolToSheet({
                                symId: activeSymbolId,
                                title: titleInput,
                                symbols: linkedSymbols,
                                color: selectedColor
                            })

                            let syncStatusForSymbol = remoteUpdatedSymbol != 'networkError' && remoteUpdatedSymbol?.response?.result.status ? 'true' : 'false'

                            db.symbols.update(activeSymbolId, { synced: syncStatusForSymbol })

                            //update to sheet (above)
                            syncNegatives.length ? (syncNegatives[0].synced === 'true' && syncStatusForSymbol === 'true' ? setSymbolDataSynced(true) : null) : (syncStatusForSymbol === 'true' ? setSymbolDataSynced(true) : null)
                        }}
                    >
                        Save
                    </button>
                    <button onClick={async () => {
                        document.getElementById("deleteConfirmationDialogue").showModal()
                    }}
                        className="bg-red-500 hover:bg-red-400 mt-3 px-3 py-2 text-white rounded-md font-semibold">
                        Delete Chat
                    </button>
                </div>
            </div>

            <dialog id="deleteConfirmationDialogue"
                className="rounded-md p-4 mx-8">
                <p className="text-sm font-semibold">
                    You're about to delete this chat with all it's notes and symbols,
                    <br />
                    <br />
                    Are you sure you want to delete?
                </p>
                <div className="m-1 flex flex-row justify-around">
                    <button
                        onClick={() => {
                            document.getElementById("deleteConfirmationDialogue").close()
                        }}
                        className={`mt-3 px-3 py-2 text-white rounded-md font-semibold ${isDarkMode
                            ? "bg-green-500 hover:bg-green-400"
                            : "bg-green-500 hover:bg-green-400"
                            }`}>
                        Cancel
                    </button>
                    <button onClick={async () => {
                        document.getElementById("deleteConfirmationDialogue").close()
                        setLoadingScreenState({ show: true })
                        await dexieStore.deleteSymbol(activeSymbol).then((res) => {
                            if (!res.remoteDelete) return
                            res.remoteDelete?.response?.result.status ? null : setNotificationState({ show: true, type: 'failure', text: 'Un-able to delete chat from sheet -check your connection!' })
                        })
                        //chrome.tabs.reload()

                        setLoadingScreenState({ show: false })
                        navigate('/noteList/')
                    }}
                        className="bg-red-500 hover:bg-red-400 mt-3 px-3 py-2 text-white rounded-md font-semibold">
                        Delete
                    </button>
                </div>
            </dialog>

        </div>
    );

};
