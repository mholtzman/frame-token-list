// ENV:
//   NODE_ENV: production will use mainnet, anything else will use Rinkeby
//  

const validate = require('./validate')
const chainMapping = require('./chains')

const diff = require('deep-diff').diff

const tokenNode = process.env.NODE_ENV === 'production'
? 'wss://mainnet.infura.io/ws/v3/786ade30f36244469480aa5c2bf0743b'
: 'wss://rinkeby.infura.io/ws/v3/786ade30f36244469480aa5c2bf0743b'

const ethProvider = require('eth-provider')
const eth = ethProvider(['frame', tokenNode])

const nebula = require('nebula').default(
  `https://${process.env.NEBULA_AUTH_TOKEN}@ipfs.nebula.land`, eth
)

const tokenDomain = process.env.TOKEN_DOMAIN || 'tokens.matt.eth'
const tokenBlacklist = require('./token-blacklist')

function version ({ major, minor, patch }) {
  return {
    major, minor, patch,
    bump: function (patchInc = 1, minorInc = 0, majorInc = 0) {
      return version({
        major: major + majorInc,
        minor: minor + minorInc,
        patch: patch + patchInc
      })
    },
    toString: () => `v${major}.${minor}.${patch}`
  }
}

function tokenList (version, tokens) {
  const { major, minor, patch } = version
  return {
    name: 'Frame Token List',
    timestamp: new Date().toISOString(),
    version: {
      major, minor, patch
    },
    tokens
  }
}

// returns true if the lists are not the same
function listChanged (oldList, newList) {
  function compareTokens (t1, t2) {
    if (t1.symbol < t2.symbol) {
      return -1
    }

    if (t2.symbol < t1.symbol) {
      return 1
    }

    return t1.chainId - t2.chainId
  }

  const differences = diff(oldList.sort(compareTokens), newList.sort(compareTokens))

  return !!differences
}

async function getExistingList () {
  try {
    const existingListCid = (await nebula.resolve(tokenDomain)).record.content
    const existingList = await nebula.ipfs.getJson(existingListCid)

    return existingList
  } catch (e) {
    console.warn('could not load existing list', e)
    return tokenList({ major: 0, minor: 0, patch: 0 }, [])
  }
}

async function loadTokens (chain) {
  let blacklistedTokens = [...tokenBlacklist]

  const tokens = (await chain.loadTokens()).map(token => {
    const blacklistIndex = blacklistedTokens
      .findIndex(t => t.address.toLowerCase() === token.address.toLowerCase())

    if (blacklistIndex >= 0) {
      blacklistedTokens.splice(blacklistIndex, 1)

      const badToken = { ...token }

      return {
        ...badToken,
        extensions: {
          ...badToken.extensions,
          omit: true
        }
      }
    }

    return token
  })

  // add any explicitly black-listed tokens that aren't already in the list
  return [...tokens, ...blacklistedTokens]
}

async function updateTokens () {
  const chainId = parseInt(await eth.request({ method: 'eth_chainId' }))

  const existingList = await getExistingList()
  const existingVersion = version(existingList.version || { major: 0, minor: 0, patch: 0 })

  console.log(`found existing list, ${existingVersion} with ${existingList.tokens.length} tokens`)

  const chainTokens = await loadTokens(chainMapping[chainId])

  const tokens = existingList.tokens.filter(token => token.chainId !== chainId).concat(chainTokens)

  if (listChanged(existingList.tokens, tokens)) {
    const newVersion = existingVersion.bump()

    const completeList = tokenList(newVersion, tokens)

    validate(completeList)

    try {
      const resp = await nebula.update(tokenDomain, {
        version: newVersion.toString().substring(1),
        content: {
          source: JSON.stringify(completeList)
        }
      })

      console.log('got response from Nebula', resp)
      console.log(`updated token list at ${tokenDomain} to ${newVersion} with ${completeList.tokens.length} tokens`)
    } catch (e) {
      // this times out a lot due to a gateway max on the server of 30s
      console.warn(e)
    }
  } else {
    console.log(`no changes, latest token list is ${existingVersion}`)
  }
}

updateTokens().catch(console.error).finally(process.exit)
