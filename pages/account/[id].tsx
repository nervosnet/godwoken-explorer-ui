import type { GetStaticPaths, GetStaticProps } from 'next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useQuery } from 'react-query'
import BigNumber from 'bignumber.js'
import {
  Alert,
  Stack,
  Container,
  Paper,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Typography,
  Snackbar,
  Skeleton,
} from '@mui/material'
import { ContentCopyOutlined as CopyIcon } from '@mui/icons-material'
import SubpageHead from 'components/SubpageHead'
import AccountOverview, {
  fetchAccountOverview,
  fetchAccountBalance,
  fetchDeployAddress,
  AccountOverviewProps,
  PolyjuiceContract,
} from 'components/AccountOverview'
import ERC20TransferList from 'components/ERC20TransferList'
import AssetList, { fetchUdtList } from 'components/UdtList'
import TxList, { fetchTxList } from 'components/TxList'
import BridgedRecordList from 'components/BridgedRecordList'
import ContractInfo from 'components/ContractInfo'
import ContractEventsList from 'components/ContractEventsList'
import {
  handleCopy,
  handleApiError,
  fetchERC20TransferList,
  fetchBridgedRecordList,
  fetchEventLogsListByType,
  isEthAddress,
  GraphQLSchema,
  NotFoundException,
  API_ENDPOINT,
  CKB_DECIMAL,
} from 'utils'
import PageTitle from 'components/PageTitle'
import DownloadMenu, { DOWNLOAD_HREF_LIST } from 'components/DownloadMenu'

type State = AccountOverviewProps
const tabs = ['transactions', 'erc20', 'bridged', 'assets', 'contract', 'events']

const isSmartContractAccount = (account: AccountOverviewProps['account']): account is PolyjuiceContract => {
  return !!(account as PolyjuiceContract)?.smart_contract
}

const Account = (initState: State) => {
  const {
    push,
    query: { tab = 'transactions', before = null, after = null, block_from = null, block_to = null, page = '1' },
  } = useRouter()
  const [accountAndList, setAccountAndList] = useState(initState)
  const [isCopied, setIsCopied] = useState(false)
  const [t] = useTranslation(['account', 'common'])

  const id = accountAndList.account.eth_address || accountAndList.account.script_hash

  useEffect(() => {
    setAccountAndList(initState)
  }, [setAccountAndList, initState])

  const q = isEthAddress(id) ? { address: id } : { script_hash: id }

  const { isLoading: isOverviewLoading, data: overview } = useQuery(
    ['account-overview', id],
    () => fetchAccountOverview(q),
    {
      refetchInterval: 10000,
      enabled: !!id,
    },
  )

  const { isLoading: isBalanceLoading, data: balance = '0' } = useQuery(
    ['account-balance', id],
    () => fetchAccountBalance(id),
    {
      refetchInterval: 10000,
      enabled: !!id,
    },
  )

  const { isLoading: isTxListLoading, data: txList } = useQuery(
    ['account-tx-list', id, before, after, block_from, block_to],
    () =>
      fetchTxList({
        ...q,
        before: before as string,
        after: after as string,
        start_block_number: block_from ? +block_from : null,
        end_block_number: block_to ? +block_to : null,
      }),
    {
      enabled: tab === 'transactions' && !!id,
    },
  )

  const { isLoading: isTransferListLoading, data: transferList } = useQuery(
    ['account-transfer-list', q.address, page],
    () =>
      fetchERC20TransferList({
        eth_address: q.address,
        page: page as string,
      }),
    { enabled: tab === 'erc20' && !!q.address },
  )

  const { isLoading: isBridgedListLoading, data: bridgedRecordList } = useQuery(
    ['account-bridged-list', q.address, page],
    () => fetchBridgedRecordList({ eth_address: q.address, page: page as string }),
    { enabled: tab === 'bridged' && !!q.address },
  )

  const { isLoading: isEventListLoading, data: eventsList } = useQuery(
    ['account-event-list', q.address],
    () => fetchEventLogsListByType('accounts', q.address),
    { enabled: tab === 'events' && !!q.address },
  )

  const { isLoading: isUdtListLoading, data: udtList } = useQuery(
    ['account-udt-list', id],
    () => fetchUdtList(q.address ? { address_hashes: [id] } : { script_hashes: [id] }),
    { enabled: tab === 'assets' && !!(q.address || q.script_hash) },
  )

  const account = overview ?? accountAndList.account

  /* is script hash supported? */
  const downloadItems = account.eth_address
    ? [
        { label: t('transactionRecords'), href: DOWNLOAD_HREF_LIST.accountTxList(account.eth_address) },
        { label: t('ERC20Records'), href: DOWNLOAD_HREF_LIST.accountTransferList(account.eth_address) },
        {
          label: t('bridgedRecords'),
          href: DOWNLOAD_HREF_LIST.accountBridgeRecordList(account.eth_address),
        },
      ]
    : []

  const handleAddressCopy = async () => {
    await handleCopy(id)
    setIsCopied(true)
  }

  const title = `${t('accountType.' + account.type)} ${id}`
  const accountType = account.type

  return (
    <>
      <SubpageHead subtitle={title} />
      <Container sx={{ py: 6 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <PageTitle>
            <Stack direction="row" alignItems="center">
              <Typography variant="inherit" overflow="hidden" textOverflow="ellipsis" noWrap>
                {title}
              </Typography>

              <IconButton aria-label="copy" onClick={handleAddressCopy}>
                <CopyIcon fontSize="inherit" />
              </IconButton>
            </Stack>
          </PageTitle>
          <DownloadMenu items={downloadItems} />
        </Stack>
        <Stack spacing={2}>
          <AccountOverview
            isOverviewLoading={isOverviewLoading}
            isBalanceLoading={isBalanceLoading}
            account={account}
            balance={balance}
            deployerAddr={accountAndList.deployerAddr}
          />
          <Paper>
            <Tabs value={tabs.indexOf(tab as string)} variant="scrollable" scrollButtons="auto">
              {[
                t('transactionRecords'),
                [GraphQLSchema.AccountType.EthUser, GraphQLSchema.AccountType.PolyjuiceContract].includes(accountType)
                  ? t(`ERC20Records`)
                  : null,
                [GraphQLSchema.AccountType.EthUser, GraphQLSchema.AccountType.PolyjuiceContract].includes(accountType)
                  ? t(`bridgedRecords`)
                  : null,
                [GraphQLSchema.AccountType.EthUser, GraphQLSchema.AccountType.PolyjuiceContract].includes(accountType)
                  ? t('userDefinedAssets')
                  : null,
                [GraphQLSchema.AccountType.PolyjuiceContract].includes(accountType) &&
                isSmartContractAccount(account) &&
                account.smart_contract?.abi
                  ? t('contract')
                  : null,
                [GraphQLSchema.AccountType.PolyjuiceContract].includes(accountType) ? t('events') : null,
              ].map((label, idx) =>
                label ? (
                  <Tab
                    key={label}
                    label={label}
                    onClick={e => {
                      e.stopPropagation()
                      e.preventDefault()
                      push(`/account/${id}?tab=${tabs[idx]}`, undefined, { scroll: false })
                    }}
                  />
                ) : (
                  <Tab key="none" sx={{ display: 'none' }} />
                ),
              )}
            </Tabs>
            <Divider />
            {tab === 'transactions' ? (
              !isTxListLoading ? (
                <TxList
                  transactions={txList ?? { entries: [], metadata: { total_count: 0, before: null, after: null } }}
                  maxCount="100k"
                  viewer={id}
                />
              ) : (
                <Skeleton animation="wave" />
              )
            ) : null}
            {tab === 'erc20' ? (
              !isTransferListLoading && transferList ? (
                <ERC20TransferList list={transferList} viewer={id} />
              ) : (
                <Skeleton animation="wave" />
              )
            ) : null}
            {tab === 'bridged' ? (
              !isBridgedListLoading && bridgedRecordList ? (
                <BridgedRecordList list={bridgedRecordList} />
              ) : (
                <Skeleton animation="wave" />
              )
            ) : null}
            {tab === 'assets' ? (
              !isUdtListLoading && udtList ? (
                <AssetList list={udtList} />
              ) : (
                <Skeleton animation="wave" />
              )
            ) : null}
            {tab === 'contract' && isSmartContractAccount(account) && account.smart_contract?.abi ? (
              <ContractInfo address={account.eth_address} contract={account.smart_contract} />
            ) : null}
            {tab === 'events' ? (
              !isEventListLoading && eventsList ? (
                <ContractEventsList list={eventsList} />
              ) : (
                <Skeleton animation="wave" />
              )
            ) : null}
          </Paper>
        </Stack>
        <Snackbar
          open={isCopied}
          onClose={() => setIsCopied(false)}
          anchorOrigin={{
            horizontal: 'center',
            vertical: 'top',
          }}
          autoHideDuration={3000}
          color="secondary"
        >
          <Alert severity="success" variant="filled">
            {t(`addressCopied`, { ns: 'common' })}
          </Alert>
        </Snackbar>
      </Container>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: [],
  fallback: 'blocking',
})

export const getStaticProps: GetStaticProps<State, { id: string }> = async ({ locale, params }) => {
  const { id } = params

  try {
    const q = isEthAddress(id) ? { address: id } : { script_hash: id }

    const [account, lng] = await Promise.all([
      fetchAccountOverview(q),
      serverSideTranslations(locale, ['common', 'account', 'list']),
      null,
    ])

    if (!account) {
      throw new NotFoundException()
    }

    const balance = await fetch(`${API_ENDPOINT}/accounts/${account.eth_address}`)
      .then(r => r.json())
      .then(a => new BigNumber(a.ckb).multipliedBy(new BigNumber(CKB_DECIMAL)).toString())
      .catch(() => '0')

    const deployerAddr =
      isSmartContractAccount(account) && account.smart_contract?.deployment_tx_hash
        ? await fetchDeployAddress({ eth_hash: account.smart_contract.deployment_tx_hash })
        : null

    return { props: { ...lng, account, deployerAddr, balance } }
  } catch (err) {
    return handleApiError(err, null, locale, id)
  }
}
export default Account
