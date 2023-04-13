const express = require('express')
const app = express()
const CyclicDb = require('@cyclic.sh/dynamodb')
const db = CyclicDb('pear-strange-meerkatCyclicDB')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const animals = db.collection('animals')

// Get a full listing
app.use('/add', async (req, res) => {
  await animals.set('leo', {
    type: 'cat',
    color: 'orange'
  })
  res.json({ msg: 'ok' }).end()
})

// Catch all handler for all other request.
app.use('*', async (req, res) => {
  const item = await animals.get('leo')
  if (item) {
    res.json({ msg: item }).end()
  } else {
    res.json({ msg: item }).end()
  }
})

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`index.js listening on ${port}`)
})
