const separateArrayByIndex = (list, fromIndex, numberLoadItem) => {
  // This list is used to cut the order of lazy load
  const newList = [...list]
  if (fromIndex === 0) {
    return newList.splice(fromIndex, fromIndex + numberLoadItem)
  }
  const childList = newList.splice(fromIndex)
  const result = childList.splice(0, numberLoadItem)
  return result
}

module.exports = {
  separateArrayByIndex
}
