const CyclicDb = require('@cyclic.sh/dynamodb')

const dynamoDb = CyclicDb('pear-strange-meerkatCyclicDB')
const chatList = dynamoDb.collection('chatList')

module.export = chatList
