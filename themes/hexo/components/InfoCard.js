import { useRouter } from 'next/router'
import Card from './Card'
import SocialButton from './SocialButton'
import MenuGroupCard from './MenuGroupCard'
import LazyImage from '@/components/LazyImage'
import { siteConfig } from '@/lib/config'

/**
 * 社交信息卡
 * @param {*} props
 * @returns
 */
export function InfoCard(props) {
  const { className, siteInfo } = props
  const router = useRouter()
  return (
        <Card className={className}>
            <div
                className='justify-center items-center flex py-6 dark:text-gray-100  transform duration-200 cursor-pointer'
                onClick={() => {
                  router.push('/')
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <LazyImage src={siteInfo?.icon} className='rounded-full' width={120} alt={siteConfig('AUTHOR')} />
            </div>
            <div className='font-medium text-center text-xl pb-4'>{siteConfig('AUTHOR')}</div>
             <div className='text-sm pl-6' style={{ textAlign: 'left', whiteSpace: 'pre-line' }}>
                👩‍🔬 日本某国立大学助理教授<br/>
                🥗 NASM运动营养教练<br/>
                🏋️‍♀️ 健身摸鱼爱好者<br/>
                🍓 喜欢草莓和吐司，痛恨哑铃飞鸟
             </div>

            <MenuGroupCard {...props} />
            <SocialButton />
        </Card>
  )
}
