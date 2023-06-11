const chatService = require('../services/chatService')
const express = require('express')

const {
  getAllChatList,
  getUploadedFileOrGetAllKey,
  deleteFileS3,
  sendMessage
} = chatService

const router = (app) => {
  // Json config
  app.use(express.json({ limit: '500mb' }))
  app.use(express.urlencoded({ extended: true, limit: '500mb' }))

  // Route
  app.get('/', async (req, res) => {
    res.json({ msg: 'API is running' }).end()
  })

  app.get('/chat', getAllChatList)

  app.get('/upload/:key', getUploadedFileOrGetAllKey)

  app.delete('/delete', deleteFileS3)

  app.post('/send', sendMessage)
}

module.exports = router
