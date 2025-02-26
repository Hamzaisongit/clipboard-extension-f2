import { db, dexieStore } from "../../Dexie/DexieStore"
import { closest, distance } from 'fastest-levenshtein';

//code to find the nearest matching symbol
//the function goes on to comapare teh clicked symbol with all the archived symbols in database and...
//..returns an array of 5 closest matching symbol object where each object contains all the previous symbol properties and adiitionally
// two new properties for each symbol - levenshteinDistances and bias                                                                         
export default async function nearestSymbolFinder(payload) {

    const formattedClickedSymbol = payload.clickedSymbol.toLocaleLowerCase().replace(/[ .]/g, "")
    const activeNegatives = await db.negatives.where({ 'urls': payload.url?.match(/^(?:https?:\/\/)?([^?#]+)/) ? payload.url?.match(/^(?:https?:\/\/)?([^?#]+)/)[1] : 'garbage' }).toArray()

    const symbolData = await dexieStore.getSymbols() || '[]'

    if (symbolData.length == 0) return;

    const levenshteinDistancesTable = symbolData.map((i) => {

        const arrayOfPositiveVariants = i.symbols.filter((variant) => !activeNegatives.find((negative) => negative.symId == i.symId && negative.symbol == variant.toLocaleLowerCase().replace(/[ .]/g, "")))

        //in dexie, every symbol entry has a field called 'symbols',
        //this field is an array which stores all the possible name variants for that symbol
        //the following function takes an array of variants as an arguments and returns the closest variant

        const closestWord = closest(formattedClickedSymbol, arrayOfPositiveVariants.map(e => e.toLocaleLowerCase().replace(/[ .]/g, ""))) || ""
        let bias = Math.abs(closestWord.length - formattedClickedSymbol.length) // ideally bias will have to be 0..
        //following line will get the 'levenshtine distance' or for the closest variant found
        const levenshteinDistance = distance(formattedClickedSymbol, closestWord)

        return {
            ...i,
            levenshteinDistance,
            bias
        }
    })


    levenshteinDistancesTable.sort((a = {}, b = {}) => a.levenshteinDistance - b.levenshteinDistance)

    return levenshteinDistancesTable
    //return [levenshteinDistancesTable[0], levenshteinDistancesTable[1], levenshteinDistancesTable[2], levenshteinDistancesTable[3], levenshteinDistancesTable[4]]
}