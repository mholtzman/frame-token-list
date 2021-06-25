const { createWatcher, aggregate } = require('@makerdao/multicall')

const contractAddresses = {
  '0x1': '0xeefba1e63905ef1d7acba5a8513c70307c1ce441', // mainnet
  '0x4': '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821', // rinkeby,
  '0x5': '0x77dca2c955b15e9de4dbbcf1246b4b85b651e50e', // goerli
  '0xa2': '0x2cc8688c5f75e365aaeeb4ea8d6a480405a48d2a', // kovan,
  '0x64': '0xb5b692a88bdfc81ca69dcb1d924f59f0413a602a' // xdai
}

function chainConfig (chainId) {
  return {
    rpcUrl: 'http://0.0.0.0:1248', // Frame websocket
    multicallAddress: contractAddresses[chainId]
  }
}

module.exports = function (chainId) {
  const config = chainConfig(chainId)

  return {
    call: async function (calls) {
      return aggregate(calls, config)
    },
    subscribe: function (calls, cb) {
      const watcher = createWatcher(calls, config)

      watcher.subscribe(update => cb(null, update))
      watcher.onError(cb)

      watcher.start()

      return watcher
    }
  }
}
