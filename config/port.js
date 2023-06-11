const port = (app) => {
  const portUse = process.env.PORT || 8080
  app.listen(portUse, () => {
    console.log(
      '\x1b[36m%s\x1b[0m',
      `------------------------------ We are listening on ${portUse}------------------------------`
    )
  })
}
module.exports = port
