'use strict';

let AWS = require('aws-sdk'),
    region = "us-east-1",
    secretName = "algolia-dev-key",
    secret,
    decodedBinarySecret;

let algoliasearch = require('algoliasearch');

let fetch = require('node-fetch');
var _ = require('lodash');

module.exports.perform = async (event, context) => {
  let client = new AWS.SecretsManager({
      region: region
  });

  const secret = await client.getSecretValue({SecretId: secretName}).promise();
  const algoliaApiKey = JSON.parse(secret["SecretString"])["api_key"];

  let algoliaClient = algoliasearch('PLCQ7SVCZK', algoliaApiKey);

  let nodes = algoliaClient.initIndex('nodes');

  let allKeys = await new Promise((res, ref) => {
    nodes
      .browseAll()
      .on('result', content => {
        const keys = (content["hits"] || [])
          .map(obj => obj["objectID"])

        res(keys);
      });
   });

   await new Promise(res => nodes.deleteObjects(allKeys, () => res()));

   let fbData = await fetch('https://youpressed-grand-central.firebaseio.com/orgs/0691f901-38e7-47f3-be15-998e52fee753/nodes.json').then(res => res.json());

   const cleanedData = _.map(fbData, (node, key) => {
     return {
       label: node["label"],
       fbId: key
     }
   });

   await nodes.addObjects(cleanedData);
};
