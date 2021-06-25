const validate = require('./validate')
const chainMapping = require('./chains')

const diff = require('deep-diff').diff

const tokenNode = process.env.NODE_ENV === 'production'
? 'wss://mainnet.infura.io/ws/v3/786ade30f36244469480aa5c2bf0743b'
: 'wss://rinkeby.infura.io/ws/v3/786ade30f36244469480aa5c2bf0743b'

const ethProvider = require('eth-provider')

const eth = ethProvider()
const tokenProvider = ethProvider(tokenNode)

const nebula = require('nebula')(
  `https://${process.env.NEBULA_AUTH_TOKEN}@ipfs.nebula.land`, tokenProvider
)

const tokenDomain = process.env.TOKEN_DOMAIN || 'tokens.frame.eth'

const tokenBlacklist = [
  '0x6f2afbf4f5e5e804c5b954889d7bf3768a3c9a45',
  '0x0e69d0a2bbb30abcb7e5cfea0e4fde19c00a8d47', // IOV
  '0x5e3845a1d78db544613edbe43dc1ea497266d3b8',
  '0x47140a767a861f7a1f3b0dd22a2f463421c28814',
  '0x1c5b760f133220855340003b43cc9113ec494823',
  '0x426ca1ea2406c07d75db9585f22781c096e3d0e0' // MNE
]

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

async function getExistingList (cid) {
  try {
    const existingListCid = (await nebula.resolve(tokenDomain)).record.content
    const existingList = await nebula.ipfs.getJson(existingListCid)

    return existingList
  } catch (e) {
    console.warn('could not load existing list', e)
    return tokenList({ major: 0, minor: 0, patch: 0 }, [])
  }
}

async function updateTokens () {
  const chainId = parseInt(await eth.request({ method: 'eth_chainId' }))

  const existingList = await getExistingList()
  const existingVersion = version(existingList.version || { major: 0, minor: 0, patch: 0 })

  console.log(`found existing list, ${existingVersion} with ${existingList.tokens.length} tokens`)

  const chainTokens = (await chainMapping[chainId].loadTokens()).filter(t => !tokenBlacklist.includes(t.address))
  const tokens = existingList.tokens.filter(token => token.chainId !== chainId).concat(chainTokens)

  if (listChanged(existingList.tokens, tokens)) {
    const newVersion = existingVersion.bump()

    const completeList = tokenList(newVersion, tokens)

    validate(completeList)

    try {
      const resp = await nebula.update(tokenDomain, { content: JSON.stringify(completeList) })
      console.log(resp)
    } catch (e) {
      // this times out a lot due to a gateway max on the server of 30s
    }

    console.log(`updated token list at ${tokenDomain} to ${newVersion} with ${completeList.tokens.length} tokens`)
  } else {
    console.log(`no changes, latest token list is ${existingVersion}`)
  }
}

updateTokens().catch(console.error).finally(process.exit)
