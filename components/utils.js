export const isObjEmpty = (obj) => {
	for (let i in obj) return false;
	return true;
}
