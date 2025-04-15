import chains from '@src/util/chain_id'

const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID)

export const getNodes = (chainId ? : number) => {
  chainId = chainId === undefined ? DEFAULT_CHAIN_ID : chainId
  const targetChain = chains.find(v => v.chainId == chainId)
  const nodes = targetChain.rpc
  return nodes
}

const getNodeUrl = (chainId?) => {
  chainId = chainId === undefined ? DEFAULT_CHAIN_ID : chainId
  const nodes = getNodes(chainId)
  return nodes[Math.floor(Math.random() * nodes.length)]
}

export const getChain = (chainId?) => {
  chainId = chainId === undefined ? DEFAULT_CHAIN_ID : chainId
  const targetChain = chains.find(v => v.chainId == chainId)
  return targetChain
}

export default getNodeUrl