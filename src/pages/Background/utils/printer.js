export async function print(val) {
    return setTimeout(() => {
        console.log(val)
    }, 5000)
}