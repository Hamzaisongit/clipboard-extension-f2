//Dexie is not a typical database container, it's an abstraction on top of indexedDB which is already present in browsers  
import Dexie from "dexie";
import { addNoteToSheet, addOrUpdateNegativesToSheet, addOrUpdateSymbolToSheet, deleteNoteInSheet, deleteSymbolInSheet, populateLocalFromSheet } from "./utils/sheetSyncHandlers";
import cuid from "cuid";

export const db = new Dexie('User')

db.version(1).stores({
    symbols: "++symId, title, *symbols, synced, type", //type here means normal symbol or some other default loaded data like NSE.., 
    negatives: "[symId+symbol], *urls, synced",
    notes: "noteId, symId, content, date, synced",
    deleteLog: "++id, type"
})

db.on("populate", function (transaction) {
    transaction.symbols.add({ symId: 1000000, title: "Quick Notes", type: 'normal', symbols: [], synced: 'false' }).then((id) => {
        transaction.notes.add({ noteId: 'sample', symId: id, content: 'Ctrl + ⬇ (down arrow-key) to open this chat & dump all your quick note/references!', date: Date.now(), synced: 'false' })
    });
});

export const dexieStore = {
    getNotes: async () => {
        return await db.notes.toArray()
    },

    getActiveNotes: async (activeSymId) => {
        return await db.notes.where('symId').equals(activeSymId).toArray()
    },

    getSymbols: async () => {
        return await db.symbols.toArray()
    },

    getSymbol: async (symId) => {
        return await db.symbols.get({ symId: symId })
    },

    // this is for the main noteList section (that shows all chats like whatsapp..)
    getRecentNotes: async () => {
        let recentsymIdWiseNotesObj = {}
        //this will sort all notes in descending order of their dates
        const notesSortedByDates = await db.notes.orderBy('date').toArray((arr) => arr.reverse())
        notesSortedByDates.forEach((note) => {
            if (!recentsymIdWiseNotesObj[note.symId]) {
                recentsymIdWiseNotesObj[note.symId] = note;
            }
        })

        //the following lines will sort all the symId keys in descending order of their most recently added notes
        const recentNotes = Object.keys(recentsymIdWiseNotesObj).sort((a, b) => recentsymIdWiseNotesObj[b].date - recentsymIdWiseNotesObj[a].date).map((symId) => {
            return {
                symId,
                note: recentsymIdWiseNotesObj[symId]
            }
        })

        return recentNotes
    },

    getNegatives: async (arr) => {
        return await db.negatives.bulkGet(arr)
    },

    addNote: async (newNote) => {
        const localAdded = await db.notes.add(newNote)

        const remoteAdded = await addNoteToSheet(newNote)
        let syncStatus = remoteAdded != 'networkError' && remoteAdded?.response?.result.status ? 'true' : 'false'

        await db.notes.update(localAdded, { synced: syncStatus })

        return { remoteAdded, localAdded }
    },

    addNewSymbol: async (symbol) => {

        const idOfAddedSymbol = await db.symbols.add({ ...symbol, synced: 'false', type: 'normal' })

        return { symId: idOfAddedSymbol, ...symbol }
    },

    updateSymbol: async (symbolData) => {

        const localUpdated = await db.symbols.put({ ...symbolData, synced: 'false' })

        return localUpdated
    },

    updateNegatives: async (negativesArr) => {

        const localUpdate = await db.negatives.bulkPut(negativesArr.map((n) => ({ ...n, synced: 'false' })))

        const toBeDeleted = negativesArr.filter(negative => !negative.urls.length)
        await db.negatives.bulkDelete(toBeDeleted.map(i => [i.symId, i.symbol]))

        return localUpdate
    },

    deleteNote: async (note) => {
        const localDelete = await db.notes.delete(note.noteId)
        const remoteDelete = await deleteNoteInSheet(note)

        if (note.synced == 'true') {
            remoteDelete != 'networkError' && remoteDelete?.response?.result.status ? null : await db.deleteLog.add({ type: "note", object: note })
        }

        return { remoteDelete, localDelete }
    },

    deleteSymbol: async (symbol) => {
        const remoteDelete = await deleteSymbolInSheet(symbol)

        if (!remoteDelete?.response?.result.status) {

            if (symbol.synced == 'true') {
                remoteDelete != 'networkError' ? null : await db.deleteLog.add({ type: "symbol", object: { symId: symbol.symId } })
            }

            const toBeDeletedSyncedNotes = await db.notes.where("symId").equals(symbol.symId).and(note => note.synced == 'true').toArray()


            await db.deleteLog.bulkAdd(toBeDeletedSyncedNotes.map(note => {
                return {
                    type: "note",
                    object: { noteId: note.noteId }
                }
            }))

            const toBeDeletedSyncedNegatives = await db.negatives.where("symId").equals(symbol.symId).and(negative => negative.synced == 'true').toArray()

            await db.deleteLog.bulkAdd(toBeDeletedSyncedNegatives.map(negative => {
                return {
                    type: "negative",
                    object: { symId: negative.symId, symbol: negative.symbol }
                }
            }))

        }

        const localDelete = await db.symbols.delete(symbol.symId)
        await db.notes.where("symId").equals(symbol.symId).delete()
        await db.negatives.where("symId").equals(symbol.symId).delete()

        return { localDelete, remoteDelete }

    },

    populateLocal: async () => {
        const { notesArrayResult, symbolsArrayResult, negativesArrayResult } = await populateLocalFromSheet() || {}

        if (notesArrayResult?.response?.result.status && symbolsArrayResult?.response?.result.status && negativesArrayResult?.response?.result.status) {
            await db.notes.clear()
            await db.symbols.clear()
            await db.negatives.clear()

            await db.symbols.bulkAdd(symbolsArrayResult.response.result.payload.map(symbol => ({ symId: parseInt(symbol[0]), title: symbol[1], symbols: JSON.parse(symbol[2]), color: symbol[3], synced: 'true' })))
            await db.notes.bulkAdd(notesArrayResult.response.result.payload.map(note => {
                note[3] = note[3] ? note[3] : cuid()
                return { symId: parseInt(note[0]), content: note[2], noteId: note[3], date: parseInt(note[4]) || parseInt(note[1]) || Date.now(), url: note[5], synced: 'true' }
            }))
            await db.negatives.bulkAdd(negativesArrayResult.response.result.payload.map(negative => ({ symId: parseInt(negative[0]), symbol: negative[1], urls: JSON.parse(negative[2]), synced: 'true' })))

            return true;
        }

        console.log('Error while populating local..', notesArrayResult, symbolsArrayResult, negativesArrayResult)
        return false
    },

    loadNseSymbols: async () => {
        try {
            const response = await fetch("EQUITY_L.csv"); // Adjusted path
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const csvText = await response.text();

            const lines = csvText.trim().split("\n");

            const data = lines.slice(1).map(line => {
                const values = line.split(",").map(value => value.trim());
                return { symbols: [values[1].replace('Limited', ''), values[0], values[6]], title: values[1], color: "#f7f7e9", type: 'nse' }
            })

            await db.symbols.bulkAdd(data);
            console.log("Data successfully added to Dexie DB");
        } catch (error) {
            console.error("Error loading CSV:", error);
        }
    },

    deleteNseSymbol: async () => {
        await db.symbols.where('type').equals('nse').and((symbol => !symbol.synced)).delete()
    }
}
