const dbModel = require('../../config/db')

const { chatList, s3 } = dbModel

exports.getAllChatList = async (req, res) => {
  const data = await chatList.get('allHistory')
  res.json({ msg: 'ok', data }).end()
  // const chatListStoreGet = await chatList.delete('allHistory')
}

exports.getUploadedFileOrGetAllKey = async (req, res) => {
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

exports.deleteFileS3 = async (req, res) => {
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

exports.sendMessage = async (req, res) => {
  const { body } = req
  const files = body.filter((item) => item.type === 'file')
  const text = body.filter((item) => item.type === 'text')
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
    createAt: body.find((item) => item.type === 'text').createAt,
    value: result
  }
  await chatList.set('allHistory', allHistory)

  res.json({ msg: 'ok', data: result }).end()
}
