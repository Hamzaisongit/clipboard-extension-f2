import { getToken } from "../../pages/Background/utils/auth";
import { db } from "../DexieStore";

const loadLocalChangeUrl = "https://script.googleapis.com/v1/scripts/AKfycbzivdE4nJo0D8b6Ze9oxkw1k6U3NyOHRs4cDzCIRvJ3haH9fXrkijL_iz3lxfI4WYY7:run"
const backupToSheetUrl = "https://script.googleapis.com/v1/scripts/AKfycbzXnFVWl-EekDpAM0HMjq2uY7AHM5MrgImjnZsp6UED28PgPb0EzenwghvqnR3fK2iF:run"
const populateLocalUrl = "https://script.googleapis.com/v1/scripts/AKfycbxxekxFWn2W7wjl6BIYlF546C0oaQJJvvGYXzr8K__k9erTT8hVKZAsoNITGfa0xB30:run"

async function getCreds() {
    const sheetId = await chrome.storage.local.get(['userCreds']).then(({ userCreds }) => userCreds?.sheetId)
    if (!sheetId || !navigator.onLine) return { sheetId, token: null }; // handls unRegistered user whose token can't be generated
    const token = await getToken()

    return { sheetId, token }
}

export async function addNoteToSheet(note) {

    const { token, sheetId } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';

    return await fetch(loadLocalChangeUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "handleLocalChange",
            parameters: [{ sheetId, message: "noteAdded", payload: note }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log(err)
        return;
    })
}

export async function deleteNoteInSheet(note) {

    const { token, sheetId } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';

    return await fetch(loadLocalChangeUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "handleLocalChange",
            parameters: [{ sheetId, message: 'noteDeleted', payload: note }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log('cant fetch..', err)
        return;
    })
}

export async function addOrUpdateSymbolToSheet(symbol) {
    const { token, sheetId } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';

    return await fetch(loadLocalChangeUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "handleLocalChange",
            parameters: [{ sheetId, message: "symbolAddedOrUpdated", payload: symbol }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log('cant fetch..', err)
        return;
    })
}

export async function deleteSymbolInSheet(symbol) {

    const { token, sheetId } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';

    return await fetch(loadLocalChangeUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "handleLocalChange",
            parameters: [{ sheetId, message: "symbolDeleted", payload: symbol }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log(err)
        return;
    })
}

export async function addOrUpdateNegativesToSheet(negativesArr) {

    const { token, sheetId } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';

    return await fetch(loadLocalChangeUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "handleLocalChange",
            parameters: [{ sheetId, message: 'negativeAddedOrUpdated', payload: negativesArr }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log('cant fetch..', err)
        return;
    })
}

export async function loadUnsynced() {

    const { sheetId, token } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';

    //Notes..
    const unSyncedNotes = await db.notes.where("synced").notEqual('true').toArray()

    let loadNotesResult
    let loadSymbolsResult
    let loadNegativesResult

    if (unSyncedNotes.length) {
        loadNotesResult = await fetch(backupToSheetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                function: "loadUnsynched",
                parameters: [{ sheetId, message: "addOrUpdate", table: 'Notes', payload: unSyncedNotes }]
            })
        }).then((data) => {
            return data.json()
        }).catch((err) => {
            console.log('cant fetch..', err)
            return;
        })
        console.log(loadNotesResult)
        loadNotesResult?.response?.result.status ? await db.notes.bulkPut(unSyncedNotes.map(note => ({ ...note, synced: 'true' }))) : null
    }

    //Symbols
    const unSyncedSymbols = await db.symbols.where("synced").notEqual('true').toArray()

    if (unSyncedSymbols.length) {
        loadSymbolsResult = await fetch(backupToSheetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                function: "loadUnsynched",
                parameters: [{ sheetId, message: "addOrUpdate", table: 'Symbols', payload: unSyncedSymbols }]
            })
        }).then((data) => {
            return data.json()
        }).catch((err) => {
            console.log('cant fetch..', err)
            return;
        })

        loadSymbolsResult?.response?.result.status ? await db.symbols.bulkPut(unSyncedSymbols.map(symbol => ({ ...symbol, synced: 'true' }))) : null
    }


    //Negatives
    const unSyncedNegatives = await db.negatives.where("synced").notEqual('true').toArray()

    if (unSyncedNegatives.length) {
        loadNegativesResult = await fetch(backupToSheetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                function: "loadUnsynched",
                parameters: [{ sheetId, message: "addOrUpdate", table: 'Negatives', payload: unSyncedNegatives }]
            })
        }).then((data) => {
            return data.json()
        }).catch((err) => {
            console.log('cant fetch..', err)
            return;
        })

        loadNegativesResult?.response?.result.status ? await db.negatives.bulkPut(unSyncedNegatives.map(negative => ({ ...negative, synced: 'true' }))) : null
    }

    return (loadNotesResult?.response?.result.status || true) && (loadSymbolsResult?.response?.result.status || true) && (loadNegativesResult?.response?.result.status || true)
}

export async function deleteUnsynced() {


    const { sheetId, token } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';

    let notesDeleteResult, symbolsDeleteResult, negativesDeleteResult;

    //Notes
    const deleteLogNotes = await db.deleteLog.where("type").equals("note").toArray()

    if (deleteLogNotes) {
        notesDeleteResult = await fetch(backupToSheetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                function: "loadUnsynched",
                parameters: [{ sheetId, message: "delete", table: 'Notes', payload: deleteLogNotes.map(({ object }) => ({ noteId: object.noteId })) }]
            })
        }).then((data) => {
            return data.json()
        }).catch((err) => {
            console.log('cant fetch..', err)
            return;
        })

        notesDeleteResult?.response?.result.status ? await db.deleteLog.where("type").equals("note").delete() : console.log('error while backingUp', notesDeleteResult)
    }


    //Symbols
    const deleteLogSymbols = await db.deleteLog.where("type").equals("symbol").toArray()
    if (deleteLogSymbols) {
        symbolsDeleteResult = await fetch(backupToSheetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                function: "loadUnsynched",
                parameters: [{ sheetId, message: "delete", table: 'Symbols', payload: deleteLogSymbols.map(({ object }) => ({ symId: object.symId })) }]
            })
        }).then((data) => {
            return data.json()
        }).catch((err) => {
            console.log('cant fetch..', err)
            return;
        })

        symbolsDeleteResult?.response?.result.status ? await db.deleteLog.where("type").equals("symbol").delete() : console.log('error while backingUp', symbolsDeleteResult)
    }


    //Negatives
    const deleteLogNegatives = await db.deleteLog.where("type").equals("negative").toArray()

    if (deleteLogNegatives) {
        negativesDeleteResult = await fetch(backupToSheetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                function: "loadUnsynched",
                parameters: [{ sheetId, message: "delete", table: 'Negatives', payload: deleteLogNegatives.map(({ object }) => ({ symId: object.symId, symbol: object.symbol })) }]
            })
        }).then((data) => {
            return data.json()
        }).catch((err) => {
            console.log('cant fetch..', err)
            return;
        })

        negativesDeleteResult?.response?.result.status ? await db.deleteLog.where("type").equals("negative").delete() : console.log('error while backingUp', negativesDeleteResult)
    }


    return (!deleteLogNotes || notesDeleteResult?.response?.result.status) && (!deleteLogSymbols || symbolsDeleteResult?.response?.result.status) && (!deleteLogNegatives || negativesDeleteResult?.response?.result.status)
}

export async function populateLocalFromSheet() {

    const { sheetId, token } = await getCreds()
    if (!sheetId) return;
    if (!token) return 'networkError';



    const notesArrayResult = await fetch(populateLocalUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "populateLocal",
            parameters: [{ sheetId, table: 'Notes' }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log('cant fetch..', err)
        return;
    })


    const symbolsArrayResult = await fetch(populateLocalUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "populateLocal",
            parameters: [{ sheetId, table: 'Symbols' }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log('cant fetch..', err)
        return;
    })


    const negativesArrayResult = await fetch(populateLocalUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            function: "populateLocal",
            parameters: [{ sheetId, table: 'Negatives' }]
        })
    }).then((data) => {
        return data.json()
    }).catch((err) => {
        console.log('cant fetch..', err)
        return;
    })

    return { notesArrayResult, symbolsArrayResult, negativesArrayResult }
}