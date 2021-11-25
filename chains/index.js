const mainnet = require('./mainnet')
const xdai = require('./xdai')

const mapping = {
  1: {
    name: 'mainnet',
    multicallAddress: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    loadTokens: mainnet.loadTokens
  },
  4: {
    name: 'rinkeby',
    multicallAddress: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    loadTokens: mainnet.loadTokens
  },
  100: {
    name: 'xDai',
    multicallAddress: '0xb5b692a88bdfc81ca69dcb1d924f59f0413a602a',
    loadTokens: xdai.loadTokens
  }
}

module.exports = mapping
