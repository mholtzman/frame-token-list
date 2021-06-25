const mainnet = require('./mainnet')
const xdai = require('./xdai')

const mapping = {
  1: {
    name: 'mainnet',
    multicallAddress: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
    loadTokens: mainnet.loadTokens
  },
  100: {
    name: 'xDai',
    multicallAddress: '0xb5b692a88bdfc81ca69dcb1d924f59f0413a602a',
    loadTokens: xdai.loadTokens
  }
}

module.exports = mapping
