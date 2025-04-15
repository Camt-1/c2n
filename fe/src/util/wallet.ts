import { BASE_BSC_SCAN_URL } from '@src/config'
import { getNodes, getChain } from './getRpcUrl'

export const serupNetwork = async () => {
  const provider = window.ethereum
  if (provider) {
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID, 10)
    const chain = getChain(chainId)
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        pararms: [
          {
            chainId: `0x${chainId.toString(16)}`,
            chainName: chain.name,
            nativeCurrency: {
              name: chain.nativeCurrency.name,
              symbol: chain.nativeCurrency.symbol,
              decimals: chain.nativeCurrency.decimals,
            },
            rpcUrls: getNodes(chainId),
            blockEplorerUrls: [`${chain.infoURL}/`],
          },
        ],
      })
      return true
    } catch (error) {
      console.error('Failed to setup the network in Metamask:', error)
      return false
    }
  } else {
    console.error("Can't setup the BSC nerwork on metamask because window.ethereum is undefinded")
    return false
  }
}