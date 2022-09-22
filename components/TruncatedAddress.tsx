import { Box, SxProps } from '@mui/material'
import HashLink from './HashLink'
import { getAddressDisplay, GraphQLSchema, ZERO_ADDRESS } from 'utils'

const TruncatedAddress = ({
  address,
  leading = 8,
  ellipsisPosition = 'middle',
  sx = {},
  type,
  monoFont = true,
}: {
  address: string
  leading?: number
  ellipsisPosition?: 'middle' | 'end'
  sx?: SxProps
  type?: GraphQLSchema.AccountType
  monoFont?: boolean
}) => {
  if (address === ZERO_ADDRESS) {
    return (
      <Box sx={sx} className="tooltip" data-tooltip={address}>
        <span className="mono-font" style={{ color: 'var(--primary-text-color)', userSelect: 'none' }}>
          zero address
        </span>
      </Box>
    )
  }

  const addrDisplay = getAddressDisplay({
    eth_address: address,
    script_hash: address,
    type,
    smart_contract: null,
  })

  let label = addrDisplay.label

  if (label.startsWith('0x') && label.length > leading * 2) {
    if (ellipsisPosition === 'middle') {
      label = `${label.slice(0, leading)}...${label.slice(-leading)}`
    } else {
      label = `${label.slice(0, leading)}...`
    }
  }

  return (
    <Box className="tooltip" data-tooltip={address} sx={sx}>
      <HashLink label={label} href={`/account/${address}`} monoFont={monoFont} />
    </Box>
  )
}

export default TruncatedAddress
