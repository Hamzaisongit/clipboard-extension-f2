import { db } from "../../../Dexie/DexieStore";

// FOLLOWIG LINES WILL ADD SOME DUMMY SAMPLE DATA IN DEXIE TO GET STARTED WITH...uncomment them to use
export const seedSymbols = () => {

    db.symbols.bulkPut([
        { symId: 1, title: 'Cynsies Tech', symbols: ["cyn Tech", "Ctech", 'Cynsies Tech'] },
        { symId: 2, title: 'DomsInd', symbols: ["DOMS"] },
        { symId: 3, title: 'AB real', symbols: ["AB real", "aditya birla real"] },
        { symId: 4, title: 'Shiv Textile & Chemicals', symbols: ["Shiv TX", "shtexchem"] },
        { symId: 5, title: 'Kaka industries', symbols: ["kk ind", 'kaka'] },
        { symId: 11, title: 'Gopal2', symbols: ["gopu", 'gopal2 snacks'] }
    ]).then(() => console.log('done'));
}

export const seedNotes = () => {
    db.notes.bulkPut([
        { noteId: 1731582409387, content: "new note", symId: 2, date: 1731582409387, title: 'DomsInd' },
        { noteId: 1731582409388, content: "a newwwww note", symId: 2, date: 17315824093, title: 'DomsInd' },
        { noteId: 1731582409389, content: "notessss", symId: 3, date: 173158240938, title: 'AB real' },
        { noteId: 1731582409390, content: "notessss-two", symId: 3, date: 173158240743, title: 'AB real' },
        { noteId: 1731582409391, content: "notessss-two", symId: 1, date: 173158240746, title: 'Cynsies Tech' },
        { noteId: 1731582409392, content: "notessss-two", symId: 4, date: 173158241749, title: 'Shiv Textile & Chemicals' }
    ])
}

export const seedNegatives = () => {
    db.negatives.bulkPut([
        { symId: 1, symbol: 'cynsiestech', urls: ["http://localhost:3000"] }
    ])
}