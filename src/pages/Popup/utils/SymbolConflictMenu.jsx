import React from "react";
import { useNavigate } from "react-router-dom";
import { dexieStore } from "../../../Dexie/DexieStore";
import { useState, useEffect } from "react";
import { useSnippets } from "../SnippetContext";
import { X } from "lucide-react";

export const SymbolConflictMenu = () => {
    const { isDarkMode, clickedSymbolPayload } = useSnippets();

    const [symbolDisplay, setSymbolDisplay] = useState([]);
    const [newTitle, setNewTitle] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        setSymbolDisplay(clickedSymbolPayload.current.exactMatches)
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

                                    const negativeSymbols = symbolDisplay.filter((symbol) => symbol.symId != i.symId)

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

                                    navigate(`/activeNotes/${i.symId}`);
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
                                document.getElementById("symbolConfimationDialogue").showModal();
                            }}>
                            create new from here
                        </span>
                    </div>



                    <button
                        onClick={() => {
                            document.getElementById("symbolConfimationDialogue").showModal();
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
                        type="text"
                        placeholder="Enter Title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className={`w-full p-2 rounded-md border-2 focus:outline-none focus:ring-2 mb-3 ${isDarkMode
                            ? "bg-[#2a3942] text-gray-200 border-[#3c474d] focus:ring-[#8696a0]"
                            : "bg-white text-gray-900 border-gray-300 focus:ring-gray-200"
                            }`}
                    />
                    <button
                        onClick={async () => {
                            if (newTitle == "") return;

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


                            const symbolToBeAdded = {
                                title: newTitle,
                                symbols: [clickedSymbolPayload.current.clickedSymbol],
                            };
                            const idOfAddedSymbol = await dexieStore.addNewSymbol(symbolToBeAdded);

                            document.getElementById("symbolConfimationDialogue").close();
                            navigate(
                                `/activeNotes/${idOfAddedSymbol}`
                            );
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