const CyclicDb = require('@cyclic.sh/dynamodb')

const dynamoDb = CyclicDb('pear-strange-meerkatCyclicDB')
const chatList = dynamoDb.collection('chatList')

exports.chatList = chatList

// AWS
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

exports.s3 = s3
