import { utils, providers } from 'ethers'
import { NODE_URL } from './constants'
import { TxStatus } from './api/tx'
import { GraphQLSchema } from './graphql'

export const isEthAddress = (hash: string) => {
  try {
    if (utils.getAddress(hash)) {
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export const provider = new providers.JsonRpcProvider(NODE_URL)

export const getBlockStatus = (status: GraphQLSchema.BlockStatus | null): TxStatus => {
  switch (status) {
    case GraphQLSchema.BlockStatus.Committed: {
      return 'committed'
    }
    case GraphQLSchema.BlockStatus.Finalized: {
      return 'finalized'
    }
    default: {
      return 'pending'
    }
  }
}
