import BLOG from '@/blog.config'
import { NotionAPI } from 'notion-client'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import { deepClone, delay } from '../utils'

const NOTION_GOT_OPTIONS = {
  hooks: {
    beforeRequest: [
      (options) => {
        if (options.url && options.url.pathname && options.url.pathname.includes('/api/v3/syncRecordValues')) {
          options.url.pathname = options.url.pathname.replace('/api/v3/syncRecordValues', '/api/v3/syncRecordValuesMain')
        }
      }
    ]
  }
}

export async function getPostBlocks(id, from, slice) {
  const cacheKey = 'page_block_' + id
  let pageBlock = await getDataFromCache(cacheKey)
  if (pageBlock) {
    return filterPostBlocks(id, pageBlock, slice)
  }

  pageBlock = await getPageWithRetry(id, from)

  if (pageBlock) {
    await setDataToCache(cacheKey, pageBlock)
    return filterPostBlocks(id, pageBlock, slice)
  }
  return pageBlock
}

export async function getSingleBlock(id, from) {
  const cacheKey = 'single_block_' + id
  let pageBlock = await getDataFromCache(cacheKey)
  if (pageBlock) {
    return pageBlock
  }

  pageBlock = await getPageWithRetry(id, from)

  if (pageBlock) {
    await setDataToCache(cacheKey, pageBlock)
  }
  return pageBlock
}

export async function getPageWithRetry(id, from, retryAttempts = 6) {
  if (retryAttempts && retryAttempts > 0) {
    console.log('[API-->>请求]', `from:${from}`, `id:${id}`, retryAttempts < 6 ? `剩余重试次数:${retryAttempts}` : '')
    try {
      const authToken = BLOG.NOTION_ACCESS_TOKEN || null
      const api = new NotionAPI({ authToken, userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      const start = new Date().getTime()
      const pageData = await api.getPage(id, { gotOptions: NOTION_GOT_OPTIONS })
      const end = new Date().getTime()
      console.log('[API<<--响应]', `耗时:${end - start}ms - from:${from}`)
      return pageData
    } catch (e) {
      console.warn('[API<<--异常]:', e)
      await delay(3000)
      const cacheKey = 'page_block_' + id
      const pageBlock = await getDataFromCache(cacheKey)
      if (pageBlock) {
        return pageBlock
      }
      return await getPageWithRetry(id, from, retryAttempts - 1)
    }
  } else {
    console.error('[请求失败]:', `from:${from}`, `id:${id}`)
    return null
  }
}

function filterPostBlocks(id, blockMap, slice) {
  const clonePageBlock = deepClone(blockMap)
  let count = 0

  for (const i in clonePageBlock?.block) {
    const b = clonePageBlock?.block[i]
    if (slice && slice > 0 && count > slice) {
      delete clonePageBlock?.block[i]
      continue
    }
    if (b?.value?.id === id) {
      delete b?.value?.properties
      continue
    }

    count++
    if (b?.value?.type === 'code') {
      if (b?.value?.properties?.language?.[0][0] === 'C++') {
        b.value.properties.language[0][0] = 'cpp'
      }
      if (b?.value?.properties?.language?.[0][0] === 'C#') {
        b.value.properties.language[0][0] = 'csharp'
      }
      if (b?.value?.properties?.language?.[0][0] === 'Assembly') {
        b.value.properties.language[0][0] = 'asm6502'
      }
    }

    if ((b?.value?.type === 'file' || b?.value?.type === 'pdf' || b?.value?.type === 'video' || b?.value?.type === 'audio') && b?.value?.properties?.source?.[0][0] && b?.value?.properties?.source?.[0][0].indexOf('amazonaws.com') > 0) {
      const oldUrl = b?.value?.properties?.source?.[0][0]
      const newUrl = `https://notion.so/signed/${encodeURIComponent(oldUrl)}?table=block&id=${b?.value?.id}`
      b.value.properties.source[0][0] = newUrl
    }
  }

  if (id === BLOG.NOTION_PAGE_ID) {
    return clonePageBlock
  }
  return clonePageBlock
}
