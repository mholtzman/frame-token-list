const https = require('https')

const defaultTokens = require('./default-tokens.json')
const tokenListUrl = 'https://tokens.coingecko.com/uniswap/all.json'

async function fetchTokenList () {
  return new Promise((resolve, reject) => {
    function useDefault (e) {
      console.error(e)
      console.warn('could not load mainnet token list, using defaults')
      return resolve(defaultTokens)
    }

    https.get(tokenListUrl, res => {
      const { statusCode } = res

      if (statusCode >= 400) {
        return useDefault(`request failed with status code: ${statusCode}`)
      }

      res.setEncoding('utf8')

      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData))
        } catch (e) {
          useDefault(e.message)
        }
      })
    })
  })
}

function parseVersion(tokenList) {
  return `${tokenList.version.major}.${tokenList.version.minor}.${tokenList.version.patch}`
}

async function loadTokens () {
  const list = await fetchTokenList()

  console.log(`loaded mainnet token list from ${list.name}, v${parseVersion(list)}`)

  return list.tokens
}

module.exports = {
  loadTokens
}
