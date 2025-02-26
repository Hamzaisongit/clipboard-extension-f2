export const formatDate = (timestamp) => {
    const localDate = new Date(timestamp);

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (
        localDate.getDate() === today.getDate() &&
        localDate.getMonth() === today.getMonth() &&
        localDate.getFullYear() === today.getFullYear()
    ) {
        return "Today";
    } else if (
        localDate.getDate() === yesterday.getDate() &&
        localDate.getMonth() === yesterday.getMonth() &&
        localDate.getFullYear() === yesterday.getFullYear()
    ) {
        return "Yesterday";
    } else {
        return `${localDate.getDate()}-${localDate.getMonth() + 1}-${localDate.getFullYear()}`;
    }
};
