const express = require('express')
const app = express()
const router = require('./src/routes')
const port = require('./config/port')
const cors = require('./config/cors')

// Router
router(app)

// Cors
cors(app)

// Port
port(app)
