import React from "react";
import { useNavigate } from "react-router-dom";
import { db, dexieStore } from "../../../Dexie/DexieStore";
import { useState, useEffect } from "react";
import { useSnippets } from "../SnippetContext";
import { X } from "lucide-react";
import { addOrUpdateNegativesToSheet, addOrUpdateSymbolToSheet } from "../../../Dexie/utils/sheetSyncHandlers";

export const SymbolConflictMenu = () => {
    const { isDarkMode, clickedSymbolPayload, setSymbolDataSynced, setNotificationState } = useSnippets();

    const [symbolDisplay, setSymbolDisplay] = useState([]);
    const [newTitle, setNewTitle] = useState("");
    const [selectedColor, setSelectedColor] = useState("#FFD0A3")
    const [favoriteColors, setFavoritecolors] = useState([])


    const navigate = useNavigate();

    useEffect(() => {
        setSymbolDisplay(clickedSymbolPayload.current.exactMatches)

        chrome.storage.local.get("favoriteColors", (val) => {
            setFavoritecolors(val.favoriteColors || [])
        })
    }, [])

    return (
        <>
            <div className={`w-full h-full flex flex-col ${isDarkMode ? "bg-[#111b21]" : "bg-[#f8f9fa]"}`}>
                <div
                    className={`w-full p-4 text-center ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-[#e9ecef] text-gray-700"
                        } rounded-lg shadow-md`}
                >
                    <h2 className="text-lg font-semibold">
                        We found multiple chats with the same matching symbol:
                    </h2>
                    <span
                        title={clickedSymbolPayload.current.clickedSymbol}
                        className="text-xl font-bold truncate inline-block max-w-sm"
                    >
                        {clickedSymbolPayload.current.clickedSymbol}
                    </span>
                    <p className="mt-2 text-sm">
                        Please select the correct one for this site!
                    </p>
                </div>

                {/* Main Body */}
                <div
                    id="mainBody"
                    className={`w-full h-full flex flex-col gap-3 p-3 rounded-md overflow-y-scroll ${isDarkMode ? "bg-[#0b141a]" : "bg-white"
                        }`}
                >
                    {symbolDisplay.map((i, index) => (
                        <div
                            key={index}
                            className={`flex justify-between items-center p-1 px-2 rounded-md border text-[0.9rem] ${isDarkMode
                                ? "bg-[#1f2c34] text-gray-200 border-[#2a3942]"
                                : "bg-gray-100 text-gray-800 border-gray-300"
                                }`}
                        >
                            <span className="font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
                                {`${i.title}: `}
                                <br />
                                <i className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    {`${i.symbols.join(", ")}`}
                                </i>
                            </span>
                            <button
                                className={`ml-2 p-1 px-1 text-sm rounded-md ${isDarkMode
                                    ? "bg-[#00a884] text-white hover:bg-[#009175]"
                                    : "bg-green-500 text-white hover:bg-green-600"
                                    }`}
                                onClick={async () => {
                                    setSymbolDataSynced(false)

                                    //local Update Symbol
                                    await dexieStore.updateSymbol({
                                        symId: i.symId,
                                        title: i.title,
                                        color: i.color,
                                        symbols: Array.from(new Set([...i.symbols, clickedSymbolPayload.current.clickedSymbol])),
                                    })

                                    //Local update Negatives
                                    const negativeSymbols = symbolDisplay.filter((symbol) => symbol.symId != i.symId)

                                    const storedNegatives = await dexieStore.getNegatives(negativeSymbols.map(e => [e.symId, clickedSymbolPayload.current.clickedSymbol.toLocaleLowerCase().replace(/[ .]/g, "")]))

                                    const toBeUpdatedNegatives = negativeSymbols.map((negative) => {
                                        const alreadyExists = storedNegatives.find((i) => i?.symId == negative.symId)
                                        if (alreadyExists) {
                                            return {
                                                ...alreadyExists,
                                                urls: [...alreadyExists.urls, clickedSymbolPayload.current.url.match(/^(?:https?:\/\/)?([^?#]+)/)[1]]
                                            }
                                        } else {
                                            return {
                                                symId: negative.symId,
                                                symbol: clickedSymbolPayload.current.clickedSymbol.toLocaleLowerCase().replace(/[ .]/g, ""),
                                                urls: [clickedSymbolPayload.current.url.match(/^(?:https?:\/\/)?([^?#]+)/)[1]]
                                            }
                                        }
                                    })

                                    await dexieStore.updateNegatives(toBeUpdatedNegatives)

                                    // chrome.tabs.reload()
                                    setNotificationState({
                                        show: true,
                                        type: 'success',
                                        text: "you will need to refresh the webpage to reflect this change on the page!",
                                        action: "Refresh", doAction: () => {
                                            chrome.tabs.reload()
                                        },
                                        duration: 4000
                                    })

                                    navigate(`/activeNotes/${i.symId}`);

                                    //Update symbol to sheet (below)
                                    const remoteUpdated = await addOrUpdateSymbolToSheet({
                                        symId: i.symId,
                                        title: i.title,
                                        symbols: Array.from(new Set([...i.symbols, clickedSymbolPayload.current.clickedSymbol])),
                                    })

                                    let syncStatusForSymbol = remoteUpdated != 'networkError' && remoteUpdated?.response?.result.status ? 'true' : 'false'

                                    db.symbols.update(i.symId, { synced: syncStatusForSymbol })
                                    //Update symbol to sheet (above)


                                    //Update negativesToSheet (below)
                                    const remoteUpdate = await addOrUpdateNegativesToSheet(toBeUpdatedNegatives)

                                    let syncNegatives = toBeUpdatedNegatives.map((i) => ({ ...i, synced: remoteUpdate != 'networkError' && remoteUpdate?.response?.result.status ? 'true' : 'false' }))

                                    await db.negatives.bulkPut(syncNegatives)
                                    //Update negativesToSheet (above)

                                    syncNegatives.length ? (syncNegatives[0].synced === 'true' && syncStatusForSymbol === 'true' ? setSymbolDataSynced(true) : null) : (syncStatusForSymbol === 'true' ? setSymbolDataSynced(true) : null)
                                }}
                            >
                                Select
                            </button>
                        </div>
                    ))}



                    <div className={`mt-5 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        didn't find any match?
                        <br />
                        <span
                            className={`font-bold cursor-pointer ${isDarkMode ? 'text-[#00a884] hover:text-[#009172]' : 'text-blue-500 hover:text-blue-400'}`}
                            onClick={() => {
                                setNewTitle(clickedSymbolPayload.current.clickedSymbol)
                                document.getElementById("symbolConfimationDialogue").showModal();
                                document.getElementById("newSymbolTitleInput").focus()
                            }}>
                            create new from here
                        </span>
                    </div>



                    <button
                        onClick={() => {
                            setNewTitle(clickedSymbolPayload.current.clickedSymbol)
                            document.getElementById("symbolConfimationDialogue").showModal();
                            document.getElementById("newSymbolTitleInput").focus()
                        }}
                        className={`absolute bottom-24 left-6 w-10 h-10 text-xl pb-1 font-bold rounded-lg shadow-lg ${isDarkMode
                            ? "bg-[#25d366] text-white hover:bg-[#1da759]"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                            }`}
                    >
                        +
                    </button>
                </div>

                {/* Dialog */}
                <dialog
                    id="symbolConfimationDialogue"
                    className={`p-4 rounded-md shadow-lg w-[90%] max-w-[400px] ${isDarkMode ? "bg-[#202c33] text-gray-200" : "bg-white text-gray-900"
                        }`}
                >
                    <button className="float-right text-red-500 hover:text-red-400"
                        onClick={() => {
                            document.getElementById("symbolConfimationDialogue").close();
                        }}>
                        <X size={18} strokeWidth={3} />
                    </button>
                    <span className="text-lg mb-2 block">
                        Create a new chat for{" "}
                        <strong>{clickedSymbolPayload.current.clickedSymbol}</strong>
                    </span>
                    <input
                        id="newSymbolTitleInput"
                        type="text"
                        placeholder="Enter Title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className={`w-full p-2 rounded-md border-2 focus:outline-none focus:ring-2 mb-3 ${isDarkMode
                            ? "bg-[#2a3942] text-gray-200 border-[#3c474d] focus:ring-[#8696a0]"
                            : "bg-white text-gray-900 border-gray-300 focus:ring-gray-200"
                            }`}
                    />

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
                            <span className="text-xs text-gray-400">{"(hover to select, click to remove)"}</span>
                        </div>

                        <div
                            id="highlight-color-container"
                            className="flex flex-wrap gap-3 p-2 pl-4 border rounded-lg w-full h-fit overflow-y-auto"
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

                    <button
                        onClick={async () => {
                            if (newTitle == "") return;

                            document.getElementById("symbolConfimationDialogue").close();

                            const negativeSymbols = symbolDisplay

                            const storedNegatives = await dexieStore.getNegatives(negativeSymbols.map(e => [e.symId, clickedSymbolPayload.current.clickedSymbol.toLocaleLowerCase().replace(/[ .]/g, "")]))

                            const toBeUpdatedNegatives = negativeSymbols.map((negative) => {
                                const alreadyExists = storedNegatives.find((i) => i?.symId == negative.symId)
                                if (alreadyExists) {
                                    return {
                                        ...alreadyExists,
                                        urls: [...alreadyExists.urls, clickedSymbolPayload.current.url]
                                    }
                                } else {
                                    return {
                                        symId: negative.symId,
                                        symbol: clickedSymbolPayload.current.clickedSymbol.toLocaleLowerCase().replace(/[ .]/g, ""),
                                        urls: [clickedSymbolPayload.current.url]
                                    }
                                }
                            })

                            await dexieStore.updateNegatives(toBeUpdatedNegatives)


                            //Create Symbol

                            const symbolToBeAdded = {
                                title: newTitle,
                                symbols: [clickedSymbolPayload.current.clickedSymbol],
                                color: selectedColor
                            };
                            const addedSymbol = await dexieStore.addNewSymbol(symbolToBeAdded)

                            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                                chrome.tabs.sendMessage(tab.id, {
                                    msg: 'updatedSymbol', payload: {
                                        symbolObj: {
                                            symId: addedSymbol.symId,
                                            symbols: [clickedSymbolPayload.current.clickedSymbol],
                                            color: selectedColor
                                        }
                                    }
                                })
                            })

                            setNotificationState({
                                show: true,
                                type: 'success',
                                text: "you will need to refresh the webpage to reflect this change on the page!",
                                action: "Refresh", doAction: () => {
                                    chrome.tabs.reload()
                                },
                                duration: 4000
                            })

                            navigate(
                                `/activeNotes/${addedSymbol.symId}`
                            );

                            //Update negativesToSheet (below)
                            const remoteUpdate = await addOrUpdateNegativesToSheet(toBeUpdatedNegatives)

                            let syncNegatives = toBeUpdatedNegatives.map((i) => ({ ...i, synced: remoteUpdate != 'networkError' && remoteUpdate?.response?.result.status ? 'true' : 'false' }))

                            await db.negatives.bulkPut(syncNegatives)
                            //Update negativesToSheet (above)

                            //Updates symbol Data to sheet (below)
                            const remoteAdded = await addOrUpdateSymbolToSheet(addedSymbol)

                            let syncStatus = remoteAdded != 'networkError' && remoteAdded?.response?.result.status ? 'true' : 'false'

                            await db.symbols.update(addedSymbol.symId, { synced: syncStatus })
                            //Updates symbol Data to sheet (above)

                        }}
                        className={`w-full p-2 rounded-md font-semibold ${isDarkMode
                            ? "bg-[#00a884] text-white hover:bg-[#009175]"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                            }`}
                    >
                        Add
                    </button>
                </dialog>
            </div>
        </>
    );
}