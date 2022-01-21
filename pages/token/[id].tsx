import { GetServerSideProps } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import {
  Container,
  Stack,
  Grid,
  Paper,
  Tabs,
  Tab,
  Divider,
  List,
  ListSubheader,
  ListItem,
  ListItemText,
  Avatar,
  Typography,
  Link,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SubpageHead from 'components/SubpageHead'
import PageTitle from 'components/PageTitle'
import ERC20TransferList from 'components/ERC20TransferList'
import BridgedRecordList from 'components/BridgedRecordList'
import Address from 'components/AddressInHalfPanel'
import {
  handleApiError,
  fetchToken,
  fetchERC20TransferList,
  nameToColor,
  getERC20TransferListRes,
  getBridgedRecordListRes,
  fetchBridgedRecordList,
} from 'utils'
import { PageNonPositiveException, PageOverflowException, TabNotFoundException } from 'utils/exceptions'
import type { API } from 'utils/api/utils'

type ParsedTransferList = ReturnType<typeof getERC20TransferListRes>
type ParsedbridgedRecordList = ReturnType<typeof getBridgedRecordListRes>

const tabs = ['transfers', 'bridged']

type Props = {
  token: API.Token.Parsed
  transferList?: ParsedTransferList
  bridgedRecordList?: ParsedbridgedRecordList
}

const Token = ({ token, transferList, bridgedRecordList }: Props) => {
  const [t] = useTranslation('tokens')
  const {
    push,
    query: { tab = 'transfers' },
  } = useRouter()
  const tokenInfo = [
    { label: 'decimal', value: <Typography variant="body2">{token.decimal || '-'}</Typography> },
    { label: 'type', value: <Typography variant="body2">{t(token.type)}</Typography> },
    {
      label: 'contract',
      value: token.shortAddress ? <Address address={token.shortAddress} /> : <Typography variant="body2">-</Typography>,
    },
    // {
    //   label: 'layer1Lock',
    //   value: token.typeScript.codeHash ? (
    //     <pre className="text-xs">{`{\n\t"code_hash": "${token.typeScript.codeHash}",\n\t"args": "${token.typeScript.args}",\n\t"hash_type": "${token.typeScript.hashType}"\n}`}</pre>
    //   ) : (
    //     '-'
    //   ),
    // },
    {
      label: 'officialSite',
      value: (
        <Typography variant="body2">
          {token.officialSite ? (
            <Link
              href={token.officialSite}
              underline="none"
              target="_blank"
              rel="noopener noreferrer"
              display="flex"
              alignItems="center"
              color="secondary"
            >
              <Typography variant="body2" overflow="hidden" textOverflow="ellipsis" className="mono-font">
                {token.officialSite}
              </Typography>
              <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
            </Link>
          ) : (
            '-'
          )}
        </Typography>
      ),
    },
    {
      label: 'description',
      value: <Typography variant="body2">{token.description || '-'}</Typography>,
    },
  ]
  const tokenData = [
    { label: 'totalSupply', value: <Typography variant="body2">{token.supply || '-'}</Typography> },
    // {label: 'value', value: token.supply ?? '-'},
    { label: 'holderCount', value: <Typography variant="body2">{token.holderCount || '-'}</Typography> },
    { label: 'transferCount', value: <Typography variant="body2">{token.transferCount || '-'}</Typography> },
  ]

  return (
    <>
      <SubpageHead subtitle={`${t('token')} ${token.name || token.symbol || '-'}`} />
      <Container sx={{ py: 6 }}>
        <PageTitle>
          <Stack direction="row" alignItems="center">
            <Avatar src={token.icon ?? null} sx={{ bgcolor: nameToColor(token.name ?? ''), mr: 2 }}>
              {token.name?.[0] ?? '?'}
            </Avatar>
            <Typography variant="h5" fontWeight="inherit">
              {token.name || '-'}
            </Typography>
            {token.symbol ? (
              <Typography
                fontWeight="inherit"
                color="primary.light"
                whiteSpace="pre"
              >{` (${token.symbol})`}</Typography>
            ) : null}
          </Stack>
        </PageTitle>
        <Stack spacing={2}>
          <Paper>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <List subheader={<ListSubheader sx={{ bgcolor: 'transparent' }}>{t('tokenInfo')}</ListSubheader>}>
                  <Divider variant="middle" />
                  {tokenInfo.map(field => (
                    <ListItem key={field.label}>
                      <ListItemText primary={t(field.label)} secondary={field.value} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <List subheader={<ListSubheader sx={{ bgcolor: 'transparent' }}>{t('tokenData')}</ListSubheader>}>
                  <Divider variant="middle" />
                  {tokenData.map(field => (
                    <ListItem key={field.label}>
                      <ListItemText primary={t(field.label)} secondary={field.value} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </Paper>
          <Paper>
            <Tabs value={tabs.indexOf(tab as string)} variant="scrollable" scrollButtons="auto">
              {[t('transferRecords'), t(`bridgedRecords`)].map((label, idx) => (
                <Tab
                  key={label}
                  label={label}
                  onClick={e => {
                    e.stopPropagation()
                    e.preventDefault()
                    push(`/token/${token.id}?tab=${tabs[idx]}`)
                  }}
                />
              ))}
            </Tabs>
            <Divider />
            {tab === 'transfers' && transferList ? <ERC20TransferList list={transferList} /> : null}
            {tab === 'bridged' && bridgedRecordList ? <BridgedRecordList list={bridgedRecordList} showUser /> : null}
          </Paper>
        </Stack>
      </Container>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props, { id: string }> = async ({ locale, res, params, query }) => {
  const { id } = params
  const { page, tab = tabs[0] } = query

  try {
    if (typeof tab !== 'string' || !tabs.includes(tab)) {
      throw new TabNotFoundException()
    }

    // if (+page < 1) {
    //   throw new PageNonPositiveException()
    // }

    const [token, lng] = await Promise.all([
      fetchToken(id),
      serverSideTranslations(locale, ['common', 'tokens', 'list']),
    ])
    // const q = { udt_address: token.shortAddress, }
    // if (typeof page === 'string' && !Number.isNaN(+page)) {
    //   q['page'] = page
    // }
    const transferList =
      tab === 'transfers' && token.shortAddress
        ? await fetchERC20TransferList({ udt_address: token.shortAddress, page: page as string })
        : null

    const bridgedRecordList =
      tab === 'bridged' && token.id
        ? await fetchBridgedRecordList({ udt_id: token.id.toString(), page: page as string })
        : null
    // const totalPage = Math.ceil(+transferListRes.totalCount / 10)
    // if (totalPage < +page) {
    //   throw new PageOverflowException(totalPage)
    // }

    return {
      props: {
        token,
        transferList,
        bridgedRecordList,
        ...lng,
      },
    }
  } catch (err) {
    switch (true) {
      case err instanceof PageNonPositiveException: {
        return {
          redirect: {
            destination: `/${locale}/token/${id}`,
            permanent: false,
          },
        }
      }
      case err instanceof PageOverflowException: {
        return {
          redirect: {
            destination: `/${locale}/token/${id}?page=${err.page}`,
            permanent: false,
          },
        }
      }
      default: {
        return handleApiError(err, res, locale)
      }
    }
  }
}

export default Token
