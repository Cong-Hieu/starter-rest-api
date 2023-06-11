const express = require('express')
const cors = require('cors')
const app = express()
const CyclicDb = require('@cyclic.sh/dynamodb')
const db = CyclicDb('pear-strange-meerkatCyclicDB')

app.use(express.json({ limit: '500mb' }))
app.use(express.urlencoded({ extended: true, limit: '500mb' }))
app.use(
  cors({
    origin: '*'
  })
)
const chatList = db.collection('chatList')

// // Get a full listing
// app.use('/add', async (req, res) => {
// await animals.set('leo', {
//   type: 'cat',
//   color: 'orange'
// })
//   res.json({ msg: 'ok' }).end()
// })

// // Catch all handler for all other request.
// app.use('*', async (req, res) => {
//   const item = await animals.get('leo')
//   if (item) {
//     res.json({ msg: item }).end()
//   } else {
//     res.json({ msg: item }).end()
//   }
// })
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

// Catch all handler for all other request.
app.get('/', async (req, res) => {
  // get it back
  res.json({ msg: 'API is running' }).end()
})

// Get a full listing
app.post('/adds', async (req, res) => {
  const { file, key } = req.body
  await s3
    .putObject({
      Body: file,
      Bucket: 'cyclic-pear-strange-meerkat-eu-central-1',
      Key: key
    })
    .promise()
  res.json({ msg: 'ok' }).end()
})

app.get('/upload/:key', async (req, res) => {
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
})
app.delete('/delete', async (req, res) => {
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
})

app.post('/send', async (req, res) => {
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
})

app.get('/chat', async (req, res) => {
  const chatListStoreGet = await chatList.get('allHistory')
  res.json({ msg: 'ok', data: chatListStoreGet }).end()
})

// Start the server
const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`index.js listening on ${port}`)
})

// const chatListStoreGet = await chatList.delete('allHistory')
