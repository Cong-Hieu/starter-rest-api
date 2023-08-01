const dbModel = require('../../config/db')
const fetch = require('node-fetch')
const moment = require('moment')
const { separateArrayByIndex } = require('../utils/helper')
const { chatList, s3 } = dbModel

const numberLoadItem = 10
const mbSize = Math.pow(1024, 2)

const updateNoteInMockApi = async (result) => {
  const payloadKeepTrackData = []
  result.forEach((item) => {
    const { value } = item
    value.forEach((x) => {
      if (x.type === 'text' && x.value) {
        const { value, createAt } = x
        const date = moment(createAt).utcOffset(420).format('DD/MM/YYYY LT')
        payloadKeepTrackData.push({ date, value })
      }
    })
  })
  const url = 'https://5fc6f8eaf3c77600165d7bc9.mockapi.io/upload/2'
  const request = await fetch(url)
  const jsonResponse = await request.json()
  jsonResponse.dateList = payloadKeepTrackData
  jsonResponse.countResult = jsonResponse.dateList.length
  await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify(jsonResponse)
  })
}

const getAllChatList = async (req, res) => {
  try {
    const currentNumber = parseInt(req.query.currentNumber)
    const result = []
    const data = await chatList.get('allHistory')
    if (!data) return res.json({ msg: 'ok', data: result }).end()
    const { props } = data

    // sort object
    const newProps = { ...props }
    Object.keys(newProps).forEach((item) => {
      const value = newProps[item]
      if (item.includes('data') && value.value.length > 0) result.push(value)
    })
    result.sort((a, b) => b.index - a.index)

    // update to mock api
    updateNoteInMockApi([...result])
    const resultLazyLoad = separateArrayByIndex(
      result,
      currentNumber,
      numberLoadItem
    )
    const isEnd = result.length < currentNumber + numberLoadItem
    // get Image for data
    const responseJson = JSON.parse(JSON.stringify(resultLazyLoad))
    for await (const [index, item] of resultLazyLoad.entries()) {
      const { value } = item
      const imgList = value?.filter((x) => x.type === 'file')

      for await (const [childIndex, fileData] of imgList.entries()) {
        const key = fileData?.value?.key
        try {
          const my_files = await s3
            .getObject({
              Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
              Key: key
            })
            ?.promise()
          const file = my_files?.Body?.toString('utf-8')
          // check file size for maximum 6mb (limit of deployment)
          const fileSize = Buffer.byteLength(JSON.stringify(file)) / mbSize
          const currentSize =
            Buffer.byteLength(JSON.stringify(responseJson)) / mbSize + fileSize
          if (currentSize < 6) {
            // Point to that file in copied response json
            responseJson[index].value[childIndex].value.file = file
          }
        } catch (e) {
          res.json({ msg: '5', data: e, isEnd: key })
          value.file = ''
        }
      }
    }

    res
      .json({
        msg: 'ok',
        data: responseJson,
        isEnd
      })
      .end()
  } catch (e) {
    res.json({ msg: e, isEnd: true })
  }
  // const chatListStoreGet = await chatList.delete('allHistory')
}

const getUploadedFileOrGetAllKey = async (req, res) => {
  const { key } = req.params
  let my_files
  try {
    my_files = await s3
      .getObject({
        Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
        Key: key
      })
      .promise()
  } catch {
    const listAllKey = await s3
      .listObjectsV2({
        Bucket: 'cyclic-pear-strange-meerkat-eu-central-1'
      })
      .promise()
    const allKey = listAllKey.Contents.map((x) => x.Key)
    return res.json({ msg: 'Not found', value: allKey }).end()
  }
  res.json({ msg: 'ok', data: my_files.Body.toString('utf-8') }).end()
}

const deleteFileS3 = async (req, res) => {
  const { value } = req.body
  const exclude = [
    'cyclic-db/ac81e671/stream_lambda.zip',
    'cyclic/dist/pear-strange-meerkat-lambda.zip'
  ]
  value.forEach((item) => {
    if (!exclude.includes(item)) {
      try {
        s3.deleteObject({
          Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
          Key: item
        }).promise()
      } catch {}
    }
  })

  res.json({ msg: 'ok' }).end()
}

const formatDynamoDBAndS3 = async (req, res) => {
  const exclude = [
    'cyclic-db/ac81e671/stream_lambda.zip',
    'cyclic/dist/pear-strange-meerkat-lambda.zip'
  ]
  // const listAllKey = await s3
  //   .listObjectsV2({
  //     Bucket: 'cyclic-pear-strange-meerkat-eu-central-1'
  //   })
  //   .promise()
  // const allKey = listAllKey.Contents.map((x) => x.Key).filter(
  //   (x) => !exclude.includes(x)
  // )
  // allKey.forEach((item) => {
  //   if (!exclude.includes(item)) {
  //     try {
  //       s3.deleteObject({
  //         Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
  //         Key: item
  //       }).promise()
  //     } catch {}
  //   }
  // })
  // await chatList.delete('allHistory')
  res.json({ msg: 'ok' }).end()
}

const sendMessage = async (req, res) => {
  const { body } = req
  const { data, parentKey } = body
  const files = data.filter((item) => item.type === 'file')
  const text = data.filter((item) => item.type === 'text')
  files.forEach((file) => {
    const { value } = file
    const { key } = value
    const base64File = value.file
    try {
      s3.putObject({
        Body: base64File,
        Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
        Key: key
      }).promise()
    } catch {}
    value.file = ''
  })
  const result = [...text, ...files]

  // Save to dynamoDB
  const chatListStore = await chatList.get('allHistory')
  const index = Object.keys(chatListStore?.props || {})?.length || 0
  const keyObject = `data-${index}`
  const allHistory = {}
  allHistory[keyObject] = {
    createAt: data[0].createAt,
    value: result,
    key: parentKey,
    index
  }
  await chatList.set('allHistory', allHistory)

  res.json({ msg: 'ok', data: result }).end()
}

const handleDeleteMessage = async (req, res) => {
  const { key, parentKey, parentIndex, type } = req.body
  const data = await chatList.get('allHistory')
  const { props } = data
  const updateObject = {}
  let objectKey, objectData
  for (const keyProps in props) {
    if (keyProps.includes('data')) {
      const value = props[keyProps]
      if (value.key === parentKey) {
        objectKey = keyProps
        objectData = { ...value }
      }
    }
  }
  if (type === 'text') {
    objectData.value.splice(0, 1)
  }
  if (type === 'file') {
    const index = objectData.value.findIndex((file) => {
      return file.value.key === key
    })
    if (index !== -1) {
      objectData.value.splice(index, 1)
      try {
        s3.deleteObject({
          Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
          Key: key
        }).promise()
      } catch {}
    }
  }
  updateObject[objectKey] = objectData
  await chatList.set('allHistory', updateObject)
  res.json({ msg: 'ok' }).end()
}

const checkPermission = async (req, res) => {
  const { chatKey } = req.body
  if (chatKey === 'hieutruong')
    return res.json({ msg: 'ok', permission: true, chatKey }).end()
  res.json({ msg: 'Not able to access', permission: false, chatKey }).end()
}

module.exports = {
  getAllChatList,
  getUploadedFileOrGetAllKey,
  deleteFileS3,
  sendMessage,
  formatDynamoDBAndS3,
  handleDeleteMessage,
  checkPermission
}
