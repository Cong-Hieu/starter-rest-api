const separateArrayByIndex = (list, fromIndex, numberLoadItem) => {
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
