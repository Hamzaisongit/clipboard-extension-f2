import React, { useEffect, useRef, useState } from 'react';
import { useSnippets } from './SnippetContext';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dexieStore } from '../../Dexie/DexieStore';
import { formatDate } from './utils/formatDate';
import { Loading } from './utils/Loading';
// import { InitialUserSetup } from './utils/auth/InitialUserSetup';

const NoteList = () => {
    const navigate = useNavigate()

    const { isDarkMode, userCreds, setUserCreds, setNotificationState } = useSnippets();

    const storedSymbols = useRef([])
    const [SymbolsDisplay, setSymbolsDisplay] = useState([])
    const [recentNotes, setRecentNotes] = useState([])
    const [searchChatsInput, setSearchChatsInput] = useState("")

    useEffect(() => {

        (async () => {
            const symbols = await dexieStore.getSymbols() || []
            storedSymbols.current = symbols
            setSymbolsDisplay(symbols)

            const storedRecentNotes = await dexieStore.getRecentNotes() || []
            setRecentNotes(storedRecentNotes);
        })()

    }, [])

    useEffect(() => {
        if (searchChatsInput) {
            setSymbolsDisplay(() => {
                return storedSymbols.current.slice().filter((symbol) => {
                    return symbol.title.match(new RegExp(searchChatsInput.trim(), "i"))
                }) || []
            })
            return;
        }
        setSymbolsDisplay(storedSymbols.current)

    }, [searchChatsInput])

    return (
        <div
            className={`w-full h-full font-sans flex flex-col ${isDarkMode ? 'bg-[#101d24] text-gray-200' : 'bg-[#eae6df] text-gray-900'}`}
        >
            {/* Search Bar - Banner Style */}
            <div
                className={`w-full py-4 mb-3 px-4 shadow-md ${isDarkMode ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}
            >
                <div
                    className={`flex items-center w-full px-4 py-2 rounded-lg shadow-sm ${isDarkMode ? 'bg-[#2a3942]' : 'bg-[#ffffff]'}`}
                >
                    <Search
                        size={20}
                        className={`mr-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    />
                    <input
                        type="text"
                        placeholder="Search chats"
                        value={searchChatsInput}
                        onChange={(e) => setSearchChatsInput(e.target.value)}
                        className={`flex-1 bg-transparent outline-none ${isDarkMode ? 'text-gray-200 placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                            }`}
                    />
                </div>
            </div>

            {/* Notes List */}
            <div id="allNotes-container" className="overflow-y-auto px-3 flex flex-col items-center">
                {recentNotes.length > 0 ? (
                    recentNotes.map(({ symId, note }) => {
                        const currentSymbol = SymbolsDisplay.find((ele) => ele.symId == symId)
                        if (!currentSymbol) return;

                        return (
                            <div
                                onClick={async () => {
                                    navigate(`/activeNotes/${symId}`);
                                }}
                                key={symId}
                                className={`w-full flex items-center cursor-pointer hover:${isDarkMode ? 'bg-[#394e58]' : 'bg-[#e1e8eb]'
                                    } py-2 px-3 mb-2 rounded-lg shadow ${isDarkMode ? 'bg-[#2a3942]' : 'bg-[#ffffff]'}`}
                            >
                                {/* Profile Picture */}
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center ${isDarkMode
                                        ? 'bg-gradient-to-br from-[#3c6255] to-[#0b4f40]'
                                        : 'bg-gradient-to-br from-[#85c496] to-[#1e5f2f]'
                                        }`}
                                >
                                    <span className="text-xl font-semibold text-white">
                                        {currentSymbol?.title[0].toUpperCase()}
                                    </span>
                                </div>

                                {/* Note Info */}
                                <div className="pl-2 w-20 flex-1">
                                    <div className="flex justify-between">
                                        <span className={`overflow-hidden whitespace-nowrap text-ellipsis font-semibold text-sm w-32 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                            {currentSymbol?.title}
                                        </span>
                                        <span className={`ml-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {formatDate(note.date)}
                                        </span>
                                    </div>
                                    <p
                                        className={`overflow-hidden whitespace-nowrap text-ellipsis text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}
                                    >
                                        {note.content}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className='flex flex-col justify-center'>
                        <p className={`text-center my-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            No notes available.
                        </p>

                    </div>
                )}

                {userCreds.sheetId || searchChatsInput ? null : (
                    <div className={`flex flex-col items-center w-60 p-2 mt-3 mb-3 cursor-pointer rounded-md ${isDarkMode ? "bg-[#2a3942]" : "bg-gray-100"}`}
                        onClick={() => {
                            navigate('/settings/#sheetSettings')
                        }}>
                        <h3 className='font-bold text-blue-500'>You haven't backed-up your data!</h3>
                        <span className='text-center'>Register a spreadsheet and have all your data backedup in real-time</span>
                    </div>)}

                <hr className={`w-36 border-1 mb-4 ${isDarkMode ? "border-gray-500" : "border-gray-400"}`}></hr>
                <span className={`${isDarkMode ? "text-gray-400" : "text-gray-700"} mb-1`}>Empty Notes</span>

                {
                    SymbolsDisplay.map(({ symId, title }) => {
                        if (recentNotes.find((note) => note.symId == symId)) return;

                        return (
                            <div
                                onClick={async () => {
                                    navigate(`/activeNotes/${symId}`);
                                }}
                                key={symId}
                                className={`w-full flex items-center cursor-pointer hover:${isDarkMode ? 'bg-[#394e58]' : 'bg-[#e1e8eb]'
                                    } py-2 px-3 mb-2 rounded-lg shadow ${isDarkMode ? 'bg-[#2a3942]' : 'bg-[#ffffff]'}`}
                            >
                                {/* Profile Picture */}
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center ${isDarkMode
                                        ? 'bg-gradient-to-br from-[#3c6255] to-[#0b4f40]'
                                        : 'bg-gradient-to-br from-[#85c496] to-[#1e5f2f]'
                                        }`}
                                >
                                    <span className="text-xl font-semibold text-white">
                                        {title[0].toUpperCase()}
                                    </span>
                                </div>

                                {/* Note Info */}
                                <div className="pl-2 w-20 flex-1">
                                    <div className="flex justify-between">
                                        <span className={`overflow-hidden whitespace-nowrap text-ellipsis font-semibold text-sm w-32 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                            {title}
                                        </span>
                                    </div>
                                    <p
                                        className={`overflow-hidden whitespace-nowrap text-ellipsis text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}
                                    >
                                        {"(empty)"}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                }
            </div>

        </div>

    );
};

export default NoteList;
