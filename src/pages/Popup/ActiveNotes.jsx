import { ArrowLeft, CheckCheck, Drum, Plus, RefreshCcw, Settings, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSnippets } from './SnippetContext';
import { useNavigate, useParams } from 'react-router-dom';
import { db, dexieStore } from '../../Dexie/DexieStore';
import { formatDate } from './utils/formatDate';
import cuid from 'cuid';
import { deleteUnsynced, loadUnsynced } from '../../Dexie/utils/sheetSyncHandlers';
import { Loading } from './utils/Loading';


const ActiveNotes = () => {

    const { isDarkMode, clickedSymbolPayload, symbolDataSynced, setSymbolDataSynced, setNotificationState } = useSnippets();
    const [noteContent, setNoteContent] = useState('');
    const [activeNotes, setActiveNotes] = useState([])
    const [activeSymbol, setActiveSymbol] = useState({})
    const [syncProps, setSyncProps] = useState({ strokeWidth: 1, color: "#A0A0A0" })
    const [recentNoteId, setRecentNoteId] = useState(null)
    const [loading, setLoading] = useState(false)
    const activeSymbolId = parseInt(useParams().activeSymbolId)

    const navigate = useNavigate()

    //scrolls to the bottom when the component loads initially and when new note is added 
    useEffect(() => {
        document.getElementById('notes-container').scrollTo({
            top: document.getElementById('notes-container').scrollHeight,
            behavior: "smooth",
        });
    }, [activeNotes])

    useEffect(() => {
        (async () => {
            const storedActiveSymbol = await dexieStore.getSymbol(activeSymbolId)
            setActiveSymbol(storedActiveSymbol)

            const storedActiveNotes = await dexieStore.getActiveNotes(activeSymbolId)
            setActiveNotes(storedActiveNotes)

            const storedNegatives = await dexieStore.getNegatives(storedActiveSymbol.symbols.map((i) => [storedActiveSymbol.symId, i])) || []

            const deleteLogData = await db.deleteLog.toArray() || []

            if (storedActiveSymbol.synced == 'false' ||
                storedActiveNotes.find(note => note?.synced == 'false') ||
                storedNegatives.find(negative => negative?.synced == 'false') ||
                deleteLogData.find((i) => i?.object?.symId == storedActiveSymbol.symId)
            ) {
                setSymbolDataSynced(false)
            } else {
                setSymbolDataSynced(true)
            }

        })()
    }, [symbolDataSynced])


    const { notes, groupedNotes } = useMemo(() => {
        const notes = activeNotes
        notes.sort((a, b) => a.date - b.date)
        let groupedNotes = {}
        notes.forEach((i) => {
            const date = new Date(i.date)
            const formattedDate = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`
            if (!groupedNotes[formattedDate]) {
                groupedNotes[formattedDate] = [i]
                return
            }
            groupedNotes[formattedDate] = [...groupedNotes[formattedDate], i]
        })

        return { notes, groupedNotes };
    }, [activeNotes])



    //Notes functions
    const addNote = (content) => {
        const localMilliseconds = Date.now() - (new Date().getTimezoneOffset() * 60000); //timeZoneOffset compares local time-zone with default UTC value and returns no. of minutes ahead/behind

        const newNote = { noteId: cuid(), content, symId: activeSymbol.symId, date: localMilliseconds, url: clickedSymbolPayload.current.url, synced: 'false' };
        setActiveNotes((p) => [...p, newNote]);

        setSyncProps({ strokeWidth: 1, color: "#A0A0A0" })
        setRecentNoteId(newNote.noteId)

        dexieStore.addNote(newNote).then((res) => {
            if (res.remoteAdded?.response?.result.status) {
                setSyncProps({ strokeWidth: 2, color: "#239ed0" });

                setActiveNotes((prevNotes) =>
                    prevNotes.map((note) =>
                        note.noteId === newNote.noteId ? { ...note, synced: 'true' } : note
                    )
                );
            } else {
                setSymbolDataSynced(false)
                console.log(res);
            }
        });

    };

    const deleteNote = (note) => {
        const updatedNotes = activeNotes.filter(existingNote => existingNote.noteId !== note.noteId);
        setActiveNotes(updatedNotes);
        dexieStore.deleteNote(note).then((res) => {
            if (!res.remoteDelete?.response?.result.status && note.synced == 'true') {
                console.log(res)
                setSymbolDataSynced(false)
                setNotificationState({ show: true, type: 'failure', text: 'Un-able to delete Note from sheet -check your connection!', duration: 3000 })
            }
        });
    };


    return (

        <div className={`w-full h-full font-sans flex flex-col ${isDarkMode ? 'bg-[#111b21]' : 'bg-[#eae6df]'}`}>

            {/* Header Section */}
            <div className={`flex items-start gap-3 px-3 py-3 shadow-md ${isDarkMode ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
                <button className='float-right absolute right-3 text-gray-500 hover:text-gray-700'
                    onClick={() => {
                        navigate(`/noteSettings/${activeSymbol.symId}`)
                    }}>
                    <Settings size={20}></Settings>
                </button>
                <ArrowLeft
                    className={`cursor-pointer ${isDarkMode ? 'text-[#00a884] hover:text-[#009172]' : 'text-[#008069] hover:text-[#006d57]'}`}
                    size={24}
                    onClick={() => navigate('/noteList')}
                />
                <div className='leading-0'>
                    <h1 className={`leading-none inline-block text-lg font-medium w-52 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {activeSymbol.title}
                    </h1>
                    <br></br>
                    <div className='flex flex-row'>
                        <span className={`text-xs ${isDarkMode ? (symbolDataSynced ? "text-green-600" : "text-red-500") : (symbolDataSynced ? "text-green-600" : "text-red-500")}`}>{symbolDataSynced ? "(Synced)" : <text title='Some Data migh not have loaded in sheet'>{"(Un-synced)"}</text>}</span>
                        {!symbolDataSynced && <button className='ml-1 mt-0.5 text-gray-500 hover:text-sky-800'
                            onClick={async () => {
                                setLoading(true)
                                await loadUnsynced().then((res1) => {
                                    if (!res1 || res1 == 'networkError') {
                                        alert('something went wrong while backing up - check your coonection!!')
                                        return
                                    }

                                    return deleteUnsynced().then((res2) => {
                                        if (!res2 || res2 == 'networkError') {
                                            alert('something went wrong while backing up - check your connection!')
                                            return
                                        }
                                        setNotificationState({ show: true, text: 'Synced data successfully', type: 'success', duration: 3000 })

                                    })
                                }).catch(err => console.log(err))

                                setSymbolDataSynced(true)
                                setLoading(false)
                                navigate('/noteList')
                            }} >
                            <RefreshCcw size={13} ></RefreshCcw>
                        </button>}
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div id="notes-container" className="flex-grow overflow-y-auto px-4 py-3">
                {notes.length > 0 ? (
                    Object.keys(groupedNotes).map((date, dateIndex) => (
                        <div key={date}>
                            {/* Date Separator */}
                            <div className="flex justify-center my-3">
                                <span
                                    className={`text-xs px-3 py-1 rounded-md ${isDarkMode ? 'bg-[#233239] text-gray-300' : 'bg-[#d1d7d9] text-gray-700'}`}
                                >
                                    {formatDate(groupedNotes[date][0].date)}
                                </span>
                            </div>

                            {/* Notes */}
                            {groupedNotes[date].map((note, noteIndex) => (
                                <div
                                    key={note.noteId}
                                    className={`flex ${isDarkMode ? 'bg-[#234a40]' : 'bg-[#d0ffc7]'} rounded-lg p-3 mb-3 shadow`}
                                >
                                    <div className="flex-grow">
                                        <div
                                            className={`overflow-auto text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
                                        >
                                            {note.content}
                                            <span className={`block text-xs ${isDarkMode ? "text-gray-400" : ""}`}><a
                                                href={note.url}
                                                target='_blank'
                                                className='underline'>{note.url?.replace(/https?:\/\//, "") || ""}</a></span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className='flex flex-row gap-1'>
                                                {note.noteId == recentNoteId ? <CheckCheck size={18} strokeWidth={syncProps.strokeWidth} color={syncProps.color}></CheckCheck> :
                                                    <CheckCheck size={18} strokeWidth={note.synced == 'true' ? 2 : 1} color={note.synced == 'true' ? "#239ed0" : "#A0A0A0"}></CheckCheck>}
                                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {new Date(note.date).toISOString().split('T')[1].substring(0, 5)}
                                                </span>
                                            </div>
                                            <button
                                                className={`text-gray-400 hover:text-red-500`}
                                                onClick={() => deleteNote(note)}
                                                aria-label="Delete note"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                        </div>
                                    </div>
                                </div>

                            ))}
                        </div>
                    ))
                ) : (
                    <div className="flex justify-center items-center h-full">
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No notes available.</p>
                    </div>
                )}
            </div>

            {/* Input Section */}
            <div
                className={`flex items-center px-4 py-3 border-t ${isDarkMode ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'} ${isDarkMode ? 'border-gray-700' : 'border-gray-300'
                    }`}
            >
                <input
                    type="text"
                    placeholder="Take a note"
                    className={`flex-grow px-3 py-2 rounded-full text-sm outline-none ${isDarkMode ? 'bg-[#3c484f] text-gray-200 placeholder-gray-400' : 'bg-[#ffffff] text-gray-800 placeholder-gray-500'
                        }`}
                    value={noteContent}
                    onKeyDown={(e) => {
                        if (e.key == 'Enter') {
                            if (!noteContent || noteContent.match(/^\s+$/)) return;
                            addNote(noteContent)
                            setNoteContent('');
                        }
                    }}
                    onChange={(e) => setNoteContent(e.target.value)}
                />
                <button
                    className={`ml-4 ${isDarkMode ? 'text-[#00a884] hover:text-[#009172]' : 'text-[#008069] hover:text-[#006d57]'}`}
                    onClick={() => {
                        if (!noteContent || noteContent.match(/^\s+$/)) return;
                        addNote(noteContent)
                        setNoteContent('');
                    }}
                    aria-label="Send message"
                >
                    <Plus size={24} />
                </button>
            </div>

            <Loading show={loading}></Loading>

        </div >



    );
};

export default ActiveNotes;
