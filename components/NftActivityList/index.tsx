import { useTranslation } from 'next-i18next'
import NextLink from 'next/link'
import { gql } from 'graphql-request'
import Table from 'components/Table'
import Tooltip from 'components/Tooltip'
import Address from 'components/TruncatedAddress'
import Pagination from 'components/SimplePagination'
import TxStatusIcon from 'components/TxStatusIcon'
import TransferDirection from 'components/TransferDirection'
import NoDataIcon from 'assets/icons/no-data.svg'
import { client, timeDistance, getBlockStatus, GraphQLSchema } from 'utils'
import styles from './styles.module.scss'

// TODO: update empty list style after PR https://github.com/Magickbase/godwoken-explorer-ui/pull/417 is merged

export type NftActivityListProps = {
  erc721_token_transfers: {
    entries: Array<{
      transaction: Pick<GraphQLSchema.Transaction, 'eth_hash' | 'method_id' | 'method_name'>
      block: Pick<GraphQLSchema.Block, 'number' | 'status' | 'timestamp'>
      from_address: string
      from_account?: Pick<GraphQLSchema.Account, 'type'>
      to_address: string
      to_account?: Pick<GraphQLSchema.Account, 'type'>
      log_index: number
      polyjuice: Pick<GraphQLSchema.Polyjuice, 'status'>
      token_id: number
      token_contract_address_hash: string
    }>
    metadata: GraphQLSchema.PageMetadata
  }
}

interface Cursor {
  limit?: number
  before: string
  after: string
}

export interface CollectionTransferListVariables extends Nullable<Cursor> {
  address: string
  token_id?: string
}

const nftActivityListQuery = gql`
  query ($address: HashAddress, $before: String, $after: String, $limit: Int, $token_id: Int) {
    erc721_token_transfers(
      input: {
        token_contract_address_hash: $address
        before: $before
        after: $after
        limit: $limit
        token_id: $token_id
      }
    ) {
      entries {
        transaction {
          method_id
          method_name
          eth_hash
        }
        from_address
        from_account {
          type
        }
        to_address
        to_account {
          type
        }
        log_index
        block {
          number
          timestamp
          status
        }
        polyjuice {
          status
        }
        token_id
        token_contract_address_hash
      }

      metadata {
        total_count
        before
        after
      }
    }
  }
`

export const fetchNftActivityList = (variables: CollectionTransferListVariables) =>
  client.request<NftActivityListProps>(nftActivityListQuery, variables).then(data => data.erc721_token_transfers)

const NftActivityList: React.FC<
  NftActivityListProps & {
    viewer?: string
    token_id?: string
  }
> = ({ erc721_token_transfers, viewer, token_id }) => {
  const [t, { language }] = useTranslation('list')

  return (
    <div className={styles.container}>
      <Table>
        <thead>
          <tr>
            <th>{t('txHash')}</th>
            <th>{t('method')} </th>
            <th>{t('age')} </th>
            <th>{t('from')}</th>
            <th>{t('to')}</th>
            {viewer ? <th></th> : null}
            {token_id ? null : <th>{`${t('token_id')}`}</th>}
          </tr>
        </thead>
        <tbody>
          {erc721_token_transfers?.metadata.total_count ? (
            erc721_token_transfers.entries.map(item => {
              const method = item.transaction.method_name || item.transaction.method_id

              return (
                <tr key={item.transaction.eth_hash + item.log_index}>
                  <td>
                    <div className={styles.hash}>
                      <Tooltip title={item.transaction.eth_hash} placement="top">
                        <span>
                          <NextLink href={`/tx/${item.transaction.eth_hash}`}>
                            <a className="mono-font">{`${item.transaction.eth_hash.slice(
                              0,
                              8,
                            )}...${item.transaction.eth_hash.slice(-8)}`}</a>
                          </NextLink>
                        </span>
                      </Tooltip>
                      <TxStatusIcon
                        status={getBlockStatus(item.block.status)}
                        isSuccess={item.polyjuice.status === GraphQLSchema.PolyjuiceStatus.Succeed}
                      />
                    </div>
                  </td>
                  <td>
                    {method ? (
                      <Tooltip title={item.transaction.method_id} placement="top">
                        <div className={styles.method} title={method}>
                          {method}
                        </div>
                      </Tooltip>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <time dateTime={item.block.timestamp}>
                      {timeDistance(new Date(item.block.timestamp).getTime(), language)}
                    </time>
                  </td>
                  <td>{<Address address={item.from_address} type={item.from_account?.type} />}</td>
                  <td>{<Address address={item.to_address} type={item.to_account?.type} />}</td>
                  {viewer ? (
                    <td>
                      <TransferDirection from={item.from_address} to={item.to_address} viewer={viewer ?? ''} />
                    </td>
                  ) : null}
                  {token_id ? null : (
                    <td>
                      <NextLink href={`/nft-item/${item.token_contract_address_hash}/${item.token_id}`}>
                        <a>{(+item.token_id).toLocaleString('en')}</a>
                      </NextLink>
                    </td>
                  )}
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={7 - +!!viewer - +!!token_id}>
                <div className={styles.noRecords}>
                  <NoDataIcon />
                  <span>{t(`no_records`)}</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      {erc721_token_transfers ? (
        <Pagination {...erc721_token_transfers.metadata} note={t(`last-n-records`, { n: '10k' })} />
      ) : null}
    </div>
  )
}
export default NftActivityList
