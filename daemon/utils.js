export function isObjEmpty(obj) {
    for (let i in obj) return false;
    return true;
}

/**
 * Truncates the string to a given number of character and
 * has a custom separator
 */
export function truncate(fullStr, strLen, separator) {
    if (fullStr === undefined || fullStr.length <= strLen) return fullStr;

    separator = separator || '...';

    const sepLen = separator.length;
    const charsToShow = strLen - sepLen
    const frontChars = Math.ceil(charsToShow/2);
    const backChars = Math.floor(charsToShow/2);

    return fullStr.substr(0, frontChars) +
        separator +
        fullStr.substr(fullStr.length - backChars);
}
