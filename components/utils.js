/**
 * The functions in this file are generic helper functions that
 * reduce repetition in the code of components
 */

/**
 * Checks if an object is empty
 * @param obj
 * @returns {boolean}
 */
export const isObjEmpty = (obj) => {
	for (let i in obj) return false;
	return true;
}


/**
 * Truncates the string to a given number of character and
 * has a custom separator
 * @param fullStr
 * @param strLen
 * @param separator
 * @returns {*|string}
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
