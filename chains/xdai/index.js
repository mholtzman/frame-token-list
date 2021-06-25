const mainnet = require('../mainnet')
const multicall = require('../../multicall')

const xDaiChainId = '0x64'
const mediatorContractAddress = '0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d'

function isZero (address) {
  return address === '0x0000000000000000000000000000000000000000'
}

function mediatorContractCalls (tokens) {
  return tokens.map(token => ({
    target: mediatorContractAddress,
    call: ['homeTokenAddress(address)(address)', token.address],
    returns: [[`${token.symbol.toUpperCase()}_TOKEN_ADDRESS`, val => val.toLowerCase()]]
  }))
}

async function getxDaiTokenAddresses (tokens) {
  const calls = mediatorContractCalls(tokens)

  const response = await multicall(xDaiChainId).call(calls)

  return Object.entries(response.results.transformed).map(([key, address]) => ({
    symbol: key.split('_')[0],
    address
  }))
}

async function loadTokens () {
  const mainnetTokenList = (await mainnet.loadTokens()).slice(0, 500)
  const xDaiAddresses = await getxDaiTokenAddresses(mainnetTokenList)

  const xDaiTokens = xDaiAddresses
    .filter(token => token.address && !isZero(token.address))
    .map(token => {
      const mainnetToken = mainnetTokenList.find(t => t.symbol === token.symbol)

      return {
        ...mainnetToken,
        chainId: parseInt(xDaiChainId),
        address: token.address
      }
    })

  return xDaiTokens
}

module.exports = { loadTokens }
