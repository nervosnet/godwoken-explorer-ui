import { useTranslation } from 'next-i18next'
import CardFieldsetList, { CardFieldsetListProps } from 'components/CardFieldsetList'

const MetaContract = () => {
  const [t] = useTranslation('account')
  const fieldsetList: CardFieldsetListProps['fieldsetList'] = [
    [
      { label: t('status'), value: <span title={t('status')}>status</span> },
      { label: t('accountMerkleState'), value: <span title={t('accountMerkleState')}>accountMerkleState</span> },
      { label: t('blockMerkleState'), value: <span title={t('blockMerkleState')}>blockMerkleState</span> },
    ],
    [
      { label: t('revertedBlockRoot'), value: <span title={t('revertedBlockRoot')}>revertedBlockRoot</span> },
      {
        label: t('lastFinalizedBlockNumber'),
        value: <span title={t('lastFinalizedBlockNumber')}>lastFinalizedBlockNumber</span>,
      },
    ],
  ]
  return (
    <div className="card-container">
      <h2 className="card-subheader">
        {`${t('type')}:`}
        <span>Meta Contract</span>
      </h2>
      <CardFieldsetList fieldsetList={fieldsetList} t={t} />
    </div>
  )
}

export default MetaContract
