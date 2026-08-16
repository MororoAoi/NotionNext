import BLOG from '@/blog.config'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import { getPostBlocks, getSingleBlock } from '@/lib/notion/getPostBlocks'
import { idToUuid } from 'notion-utils'
import { deepClone } from '@/lib/utils'
import { getAllCategories } from '@/lib/notion/getAllCategories'
import getAllPageIds from '@/lib/notion/getAllPageIds'
import { getAllTags } from '@/lib/notion/getAllTags'
import getPageProperties from '@/lib/notion/getPageProperties'
import { compressImage, mapImgUrl } from '@/lib/notion/mapImage'
import { getConfigMapFromConfigPage } from '@/lib/notion/getNotionConfig'

export { getAllTags } from '../notion/getAllTags'
export { getPostBlocks } from '../notion/getPostBlocks'
export { getPost } from '../notion/getNotionPost'

export async function getGlobalData({ pageId = BLOG.NOTION_PAGE_ID, from }) {
    const data = await getNotionPageData({ pageId, from })
    const db = deepClone(data)
    delete db.block
    delete db.schema
    delete db.rawMetadata
    delete db.pageIds
    delete db.viewIds
    delete db.collection
    delete db.collectionQuery
    delete db.collectionId
    delete db.collectionView
    if (db?.notice) {
          db.notice = cleanBlock(db?.notice)
    }
    if (db?.post) {
          db.post = cleanBlock(db?.post)
    }
    return db
}

function cleanBlock(post) {
    const pageBlock = post?.blockMap?.block
    for (const i in pageBlock) {
          pageBlock[i] = cleanBlock(pageBlock[i])
          delete pageBlock[i]?.role
          delete pageBlock[i]?.value?.version
          delete pageBlock[i]?.value?.created_by_table
          delete pageBlock[i]?.value?.created_by_id
          delete pageBlock[i]?.value?.last_edited_by_table
          delete pageBlock[i]?.value?.last_edited_by_id
          delete pageBlock[i]?.value?.space_id
          delete pageBlock[i]?.value?.format?.copied_from_pointer
          delete pageBlock[i]?.value?.format?.block_locked_by
          delete pageBlock[i]?.value?.parent_table
          delete pageBlock[i]?.value?.copied_from_pointer
          delete pageBlock[i]?.value?.copied_from
          delete pageBlock[i]?.value?.permissions
          delete pageBlock[i]?.value?.alive
    }
    return post
}

function getLatestPosts({ allPages, from, latestPostCount }) {
    const allPosts = allPages?.filter(page => page.type === 'Post' && page.status === 'Published')
    const latestPosts = Object.create(allPosts).sort((a, b) => {
          const dateA = new Date(a?.lastEditedDate || a?.publishDate)
          const dateB = new Date(b?.lastEditedDate || b?.publishDate)
          return dateB - dateA
    })
    return latestPosts.slice(0, latestPostCount)
}

const EmptyData = (pageId) => {
    const empty = {
          notice: null,
          siteInfo: getSiteInfo({}),
          allPages: [{
                  id: 1,
                  title: `无法获取Notion数据，请检查Notion_ID： \n 当前 ${pageId}`,
                  summary: '访问文档获取帮助→ https://tangly1024.com/article/vercel-deploy-notion-next',
                  status: 'Published',
                  type: 'Post',
                  slug: '13a171332816461db29d50e9f575b00d',
                  date: { start_date: '2023-04-24', lastEditedDay: '2023-04-24', tagItems: [] }
          }],
          allNavPages: [],
          collection: [],
          collectionQuery: {},
          collectionId: null,
          collectionView: {},
          viewIds: [],
          block: {},
          schema: {},
          tagOptions: [],
          categoryOptions: [],
          rawMetadata: {},
          customNav: [],
          customMenu: [],
          postCount: 1,
          pageIds: [],
          latestPosts: []
    }
    return empty
}

export async function getNotionPageData({ pageId, from }) {
    const cacheKey = 'page_block_' + pageId
    const data = await getDataFromCache(cacheKey)
    if (data && data.pageIds?.length > 0) {
          return data
    }
    const db = await getDataBaseInfoByNotionAPI({ pageId, from })
    if (db) {
          await setDataToCache(cacheKey, db)
    }
    return db
}

function getCustomNav({ allPages }) {
    const customNav = []
        if (allPages && allPages.length > 0) {
              allPages.forEach(p => {
                      p.to = p.slug
                      if (p?.slug?.indexOf('http') === 0) {
                                p.target = '_blank'
                      } else {
                                p.target = '_self'
                                if (p?.slug?.indexOf('/') !== 0) {
                                            p.to = '/' + p.slug
                                }
                      }
                      customNav.push({ icon: p.icon || null, name: p.title, to: p.slug, target: '_blank', show: true })
              })
        }
    return customNav
}

function getCustomMenu({ collectionData }) {
    const menuPages = collectionData.filter(post => post.status === 'Published' && (post?.type === BLOG.NOTION_PROPERTY_NAME.type_menu || post?.type === BLOG.NOTION_PROPERTY_NAME.type_sub_menu))
    const menus = []
        if (menuPages && menuPages.length > 0) {
              menuPages.forEach(e => {
                      e.show = true
                      if (e?.slug?.indexOf('http') === 0) {
                                e.target = '_blank'
                                e.to = e.slug
                      } else {
                                e.target = '_self'
                                if (e?.slug?.indexOf('/') !== 0) {
                                            e.to = '/' + e.slug
                                }
                      }
                      if (e.type === BLOG.NOTION_PROPERTY_NAME.type_menu) {
                                menus.push(e)
                      } else if (e.type === BLOG.NOTION_PROPERTY_NAME.type_sub_menu) {
                                const parentMenu = menus[menus.length - 1]
                                if (parentMenu) {
                                            if (parentMenu.subMenus) {
                                                          parentMenu.subMenus.push(e)
                                            } else {
                                                          parentMenu.subMenus = [e]
                                            }
                                }
                      }
              })
        }
    return menus
}

function getTagOptions(schema) {
    if (!schema) return {}
        const tagSchema = Object.values(schema).find(e => e.name === BLOG.NOTION_PROPERTY_NAME.tags)
    return tagSchema?.options || []
}

function getCategoryOptions(schema) {
    if (!schema) return {}
        const categorySchema = Object.values(schema).find(e => e.name === BLOG.NOTION_PROPERTY_NAME.category)
    return categorySchema?.options || []
}

function getSiteInfo({ collection, block }) {
    const title = collection?.name?.[0][0] || BLOG.TITLE
    const description = collection?.description ? Object.assign(collection).description[0][0] : BLOG.DESCRIPTION
    const pageCover = collection?.cover ? mapImgUrl(collection?.cover, block[idToUuid(BLOG.NOTION_PAGE_ID)]?.value) : BLOG.HOME_BANNER_IMAGE
    let icon = collection?.icon ? mapImgUrl(collection?.icon, collection, 'collection') : BLOG.AVATAR
    icon = compressImage(icon)
    const emojiPattern = /\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g
    if (!icon || emojiPattern.test(icon)) {
          icon = BLOG.AVATAR
    }
    return { title, description, pageCover, icon }
}

export function getNavPages({ allPages }) {
    const allNavPages = allPages?.filter(post => {
          return post && post?.slug && (!post?.slug?.startsWith('http')) && post?.type === 'Post' && post?.status === 'Published'
    })
    return allNavPages.map(item => ({
          id: item.id,
          title: item.title || '',
          pageCoverThumbnail: item.pageCoverThumbnail || '',
          category: item.category || null,
          tags: item.tags || null,
          summary: item.summary || null,
          slug: item.slug,
          pageIcon: item.pageIcon || '',
          lastEditedDate: item.lastEditedDate
    }))
}

async function getNotice(post) {
    if (!post) {
          return null
    }
    post.blockMap = await getPostBlocks(post.id, 'data-notice')
    return post
}

async function getDataBaseInfoByNotionAPI({ pageId, from }) {
    const pageRecordMap = await getPostBlocks(pageId, from)
    if (!pageRecordMap) {
          console.error('can`t get Notion Data ; Which id is: ', pageId)
          return {}
    }
    pageId = idToUuid(pageId)
    const block = pageRecordMap.block || {}
        const rawMetadata = block[pageId]?.value
    console.error('[DEBUG-TYPE]', 'pageId:', pageId, 'type:', rawMetadata?.type, 'blockKeysCount:', Object.keys(block).length, 'blockKeysSample:', Object.keys(block).slice(0, 5))
    if (
          rawMetadata?.type !== 'collection_view_page' && rawMetadata?.type !== 'collection_view'
        ) {
          console.error(`pageId "${pageId}" is not a database`)
          return EmptyData(pageId)
    }
    const collection = Object.values(pageRecordMap.collection)[0]?.value || {}
        const siteInfo = getSiteInfo({ collection, block })
    const collectionId = rawMetadata?.collection_id
    const collectionQuery = pageRecordMap.collection_query
    const collectionView = pageRecordMap.collection_view
    const schema = collection?.schema
    const viewIds = rawMetadata?.view_ids
    const collectionData = []
        const pageIds = getAllPageIds(collectionQuery, collectionId, collectionView, viewIds)
    if (pageIds?.length === 0) {
          console.error('获取到的文章列表为空，请检查notion模板', collectionQuery, collection, collectionView, viewIds, pageRecordMap)
    }

  for (let i = 0; i < pageIds.length; i++) {
        const id = pageIds[i]
        const value = block[id]?.value
        if (!value) {
                const pageBlock = await getSingleBlock(id, from)
                if (pageBlock.block[id].value) {
                          const properties = (await getPageProperties(id, pageBlock.block[id].value, schema, null, getTagOptions(schema))) || null
                          if (properties) {
                                      collectionData.push(properties)
                          }
                }
                continue
        }
        const properties = (await getPageProperties(id, value, schema, null, getTagOptions(schema))) || null
        if (properties) {
                collectionData.push(properties)
        }
  }
    let postCount = 0
    const allPages = collectionData.filter(post => {
          if (post?.type === 'Post' && post.status === 'Published') {
                  postCount++
          }
          return post && post?.slug &&
                  (!post?.slug?.startsWith('http')) &&
                  (post?.status === 'Invisible' || post?.status === 'Published')
    })
    const NOTION_CONFIG = await getConfigMapFromConfigPage(collectionData) || {}
        if (BLOG.POSTS_SORT_BY === 'date') {
              allPages.sort((a, b) => {
                      return b?.publishDate - a?.publishDate
              })
        }

  const notice = await getNotice(collectionData.filter(post => {
        return post && post?.type && post?.type === 'Notice' && post.status === 'Published'
  })?.[0])
    const categoryOptions = getAllCategories({ allPages, categoryOptions: getCategoryOptions(schema) })
    const tagOptions = getAllTags({ allPages, tagOptions: getTagOptions(schema) })
    const customNav = getCustomNav({ allPages: collectionData.filter(post => post?.type === 'Page' && post.status === 'Published') })
    const customMenu = await getCustomMenu({ collectionData })
    const latestPosts = getLatestPosts({ allPages, from, latestPostCount: 6 })
    const allNavPages = getNavPages({ allPages })
    return {
          NOTION_CONFIG,
          notice,
          siteInfo,
          allPages,
          allNavPages,
          collection,
          collectionQuery,
          collectionId,
          collectionView,
          viewIds,
          block,
          schema,
          tagOptions,
          categoryOptions,
          rawMetadata,
          customNav,
          customMenu,
          postCount,
          pageIds,
          latestPosts
    }
}
