import type { API } from 'utils/api/utils'
import { useEffect, useState } from 'react'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import {
  Alert,
  Container,
  Stack,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
  Link,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  IconButton,
  Snackbar,
} from '@mui/material'
import { OpenInNew as OpenInNewIcon, ContentCopyOutlined as CopyIcon } from '@mui/icons-material'
import SubpageHead from 'components/SubpageHead'
import TxList from 'components/TxList'
import BridgedRecordList from 'components/BridgedRecordList'
import PageTitle from 'components/PageTitle'
import {
  fetchBlock,
  handleApiError,
  formatDatetime,
  useWS,
  getBlockRes,
  CKB_EXPLORER_URL,
  CHANNEL,
  formatInt,
  fetchTxList,
  getTxListRes,
  fetchBridgedRecordList,
  getBridgedRecordListRes,
  handleCopy,
  TabNotFoundException,
} from 'utils'

type ParsedTxList = ReturnType<typeof getTxListRes>
type ParsedBridgedRecordList = ReturnType<typeof getBridgedRecordListRes>

const tabs = ['transactions', 'bridged']

type State = API.Block.Parsed & Partial<{ txList: ParsedTxList; bridgedRecordList: ParsedBridgedRecordList }>

const Block = (initState: State) => {
  const [block, setBlock] = useState(initState)
  const [isCopied, setIsCopied] = useState(false)
  const [t] = useTranslation('block')
  const {
    push,
    query: { tab = 'transactions' },
  } = useRouter()

  useEffect(() => {
    setBlock(initState)
  }, [setBlock, initState])

  useWS(
    `${CHANNEL.BLOCK_INFO}${block.number}`,
    (init: API.Block.Raw) => {
      setBlock(prev => ({ ...prev, ...getBlockRes(init) }))
    },
    ({
      l1_block,
      tx_hash,
      finalize_state,
    }: Partial<Pick<API.Block.Raw, 'l1_block' | 'tx_hash' | 'finalize_state'>>) => {
      let update: Partial<Pick<API.Block.Parsed, 'l1Block' | 'txHash' | 'finalizeState'>> = {}
      if (l1_block) {
        update.l1Block = l1_block
      }
      if (tx_hash) {
        update.txHash = tx_hash
      }
      if (finalize_state) {
        update.finalizeState = finalize_state
      }
      setBlock(prev => ({ ...prev, ...update }))
    },
    [setBlock, block.number],
  )

  const handleHashCopy = async () => {
    await handleCopy(block.hash)
    setIsCopied(true)
  }

  const fields = [
    {
      label: 'hash',
      value: (
        <Stack direction="row" alignItems="center">
          <Tooltip title={block.hash} placement="top">
            <Typography
              variant="body2"
              className="mono-font"
              overflow="hidden"
              textOverflow="ellipsis"
              color="#000000de"
            >
              {block.hash}
            </Typography>
          </Tooltip>
          <IconButton aria-label="copy" size="small" onClick={handleHashCopy}>
            <CopyIcon fontSize="inherit" />
          </IconButton>
        </Stack>
      ),
    },
    {
      label: 'timestamp',
      value: (
        <Typography variant="body2">
          <time dateTime={new Date(block.timestamp).toISOString()} title={t('timestamp')}>
            {formatDatetime(block.timestamp)}
          </time>
        </Typography>
      ),
    },
    {
      label: 'l1Block',
      value: (
        <Typography variant="body2">
          {block.l1Block ? (
            <Link
              href={`${CKB_EXPLORER_URL}/block/${block.l1Block}`}
              underline="none"
              target="_blank"
              rel="noopener noreferrer"
              display="flex"
              alignItems="center"
              color="secondary"
            >
              {formatInt(block.l1Block)}
              <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
            </Link>
          ) : (
            t('pending')
          )}
        </Typography>
      ),
    },
    {
      label: 'l1TxHash',
      value: (
        <Typography variant="body2">
          {block.txHash ? (
            <Link
              href={`${CKB_EXPLORER_URL}/transaction/${block.txHash}`}
              underline="none"
              target="_blank"
              rel="noopener noreferrer"
              display="flex"
              alignItems="center"
              color="secondary"
            >
              <Typography variant="body2" overflow="hidden" textOverflow="ellipsis" className="mono-font">
                {block.txHash}
              </Typography>
              <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
            </Link>
          ) : (
            t('pending')
          )}
        </Typography>
      ),
    },
    {
      label: 'finalizeState',
      value: (
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {t(block.finalizeState)}
        </Typography>
      ),
    },
    {
      label: 'txCount',
      value: <Typography variant="body2">{formatInt(block.txCount)}</Typography>,
    },
    {
      label: 'aggregator',
      value: <Typography variant="body2">{block.aggregator}</Typography>,
    },
  ]
  const title = `${t('block')} # ${formatInt(block.number)}`
  return (
    <>
      <SubpageHead subtitle={title} />
      <Container sx={{ py: 6 }}>
        <PageTitle>{title}</PageTitle>
        <Stack spacing={2}>
          <Paper>
            <List sx={{ textTransform: 'capitalize' }}>
              {fields.map(field => (
                <ListItem key={field.label}>
                  <ListItemText primary={t(field.label)} secondary={field.value} />
                </ListItem>
              ))}
            </List>
          </Paper>
          <Paper>
            <Tabs value={tabs.indexOf(tab as string)} variant="scrollable" scrollButtons="auto">
              {[t('transactionRecords'), t(`bridgedRecords`)].map((label, idx) => (
                <Tab
                  key={label}
                  label={label}
                  onClick={e => {
                    e.stopPropagation()
                    e.preventDefault()
                    push(`/block/${block.hash}?tab=${tabs[idx]}`)
                  }}
                />
              ))}
            </Tabs>
            <Divider />
            {tab === 'transactions' && block.txList ? <TxList list={block.txList} /> : null}
            {tab === 'bridged' && block.bridgedRecordList ? (
              <BridgedRecordList list={block.bridgedRecordList} showUser />
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
            {t(`blockHashCopied`, { ns: 'common' })}
          </Alert>
        </Snackbar>
      </Container>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<State> = async ({ locale, res, params, query }) => {
  const { id } = params
  const { tab = tabs[0] } = query
  try {
    if (typeof tab !== 'string' || !tabs.includes(tab)) {
      throw new TabNotFoundException()
    }

    const [block, lng] = await Promise.all([
      fetchBlock(id as string),
      serverSideTranslations(locale, ['common', 'block', 'list']),
    ])

    const txList =
      tab === 'transactions' && block.hash
        ? await fetchTxList({ block_hash: block.hash, page: query.page as string })
        : null

    const bridgedRecordList =
      tab === 'bridged' && block.hash
        ? await fetchBridgedRecordList({ block_number: block.number, page: query.page as string })
        : null

    return { props: { ...block, ...lng, txList, bridgedRecordList } }
  } catch (err) {
    return handleApiError(err, res, locale, id.toString())
  }
}

export default Block
