const express = require('express')
const app = express()
const cors = require('./config/cors')
const router = require('./src/routes')
const port = require('./config/port')

// Cors
cors(app)
// Router
router(app)

// Port
port(app)
