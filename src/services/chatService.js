const dbModel = require('../../config/db')

const { chatList, s3 } = dbModel

const getAllChatList = async (req, res) => {
  const result = []
  const data = await chatList.get('allHistory')
  if (!data) return res.json({ msg: 'ok', data: result }).end()
  const { props } = data

  // sort object
  const newProps = Object.keys(props)
    .sort()
    .reduce((obj, key) => {
      obj[key] = props[key]
      return obj
    }, {})
  Object.keys(newProps).forEach((item) => {
    const value = newProps[item]
    if (item.includes('data')) result.push(value)
  })
  result.reverse()
  // get Image for data
  for await (const item of result) {
    const { value } = item
    const imgList = value.filter((x) => x.type === 'file')
    for await (const fileData of imgList) {
      const { value } = fileData
      const { key } = value
      try {
        const my_files = await s3
          .getObject({
            Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
            Key: key
          })
          .promise()
        value.file = my_files.Body.toString('utf-8')
      } catch {
        value.file = ''
      }
    }
  }
  res.json({ msg: 'ok', data: result }).end()
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
  const listAllKey = await s3
    .listObjectsV2({
      Bucket: 'cyclic-pear-strange-meerkat-eu-central-1'
    })
    .promise()
  const allKey = listAllKey.Contents.map((x) => x.Key).filter(
    (x) => !exclude.includes(x)
  )
  allKey.forEach((item) => {
    if (!exclude.includes(item)) {
      try {
        s3.deleteObject({
          Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
          Key: item
        }).promise()
      } catch {}
    }
  })
  await chatList.delete('allHistory')
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
  const keyObject = `data-${
    Object.keys(chatListStore?.props || {})?.length || 0
  }`
  const allHistory = {}
  allHistory[keyObject] = {
    createAt: data.find((item) => item.type === 'text').createAt,
    value: result,
    key: parentKey
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
    return res.json({ msg: 'ok', permission: true }).end()
  res.json({ msg: 'Not able to access', permission: false }).end()
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
