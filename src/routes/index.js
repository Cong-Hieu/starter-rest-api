const chatService = require('../services/chatService')
const express = require('express')

const {
  getAllChatList,
  getUploadedFileOrGetAllKey,
  deleteFileS3,
  sendMessage,
  formatDynamoDBAndS3,
  handleDeleteMessage,
  checkPermission
} = chatService

const router = (app) => {
  // Json config
  app.use(express.json({ limit: '5000mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5000mb' }))

  // Route
  app.get('/', async (req, res) => {
    res.json({ msg: 'API is running' }).end()
  })

  //get
  app.get('/chat', getAllChatList)
  app.get('/format-db', formatDynamoDBAndS3)
  app.get('/file/:key', getUploadedFileOrGetAllKey)

  // post
  app.post('/send', sendMessage)
  app.post('/chat/permission', checkPermission)
  app.post('/chat/delete/:parentKey', handleDeleteMessage)

  // other
  app.delete('/delete', deleteFileS3)
}

module.exports = router
