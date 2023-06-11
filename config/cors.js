const corsLibrary = require('cors')
const cors = (app) => {
  app.use(
    corsLibrary({
      origin: '*'
    })
  )
}
module.exports = cors
