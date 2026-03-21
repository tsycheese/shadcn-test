/**
 * 生产级 Yjs WebSocket 协同服务器
 * 支持 Redis 多实例同步和 LevelDB 持久化
 */

import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import { Redis } from 'ioredis'
import { Level } from 'level'
import { randomUUID } from 'crypto'

// 环境变量
const PORT = parseInt(process.env.PORT || '8080', 10)
const HOST = process.env.HOST || '0.0.0.0'
const REDIS_URL = process.env.REDIS_URL
const DB_PATH = process.env.DB_PATH || './data/yjs-db'

// 日志工具
const log = (msg: string) => {
  const time = new Date().toISOString()
  console.log(`[${time}] ${msg}`)
}

// 创建 Redis 客户端（可选）
let redis: Redis | null = null
if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })
  redis.on('connect', () => log('Redis 连接成功'))
  redis.on('error', (err: Error) => log(`Redis 错误：${err.message}`))
}

// 创建 LevelDB 数据库（可选）
let db: Level<string, Buffer> | null = null
try {
  db = new Level(DB_PATH)
  log(`LevelDB 路径：${DB_PATH}`)
} catch (err) {
  log(`LevelDB 初始化失败：${err}`)
}

// 存储所有 Yjs 文档
const docs = new Map<string, Y.Doc>()

// 创建 WebSocket 服务器
const wss = new WebSocketServer({
  port: PORT,
  host: HOST,
})

log(`WebSocket 服务器启动在 ws://${HOST}:${PORT}`)

// 广播文档更新到 Redis（多实例同步）
function broadcastUpdate(docName: string, update: Uint8Array, origin: unknown) {
  if (redis) {
    redis.publish(`yjs:${docName}`, Buffer.from(update).toString('base64'))
  }
}

// 从 LevelDB 加载文档
async function loadDocument(docName: string): Promise<Y.Doc> {
  // 检查内存中是否已存在
  const existing = docs.get(docName)
  if (existing) return existing

  const doc = new Y.Doc()

  // 从 LevelDB 加载
  if (db) {
    try {
      const data = await db.get(docName)
      if (data) {
        Y.applyUpdate(doc, data)
        log(`文档 ${docName} 从 LevelDB 加载`)
      }
    } catch {
      // 文档不存在，创建新文档
    }
  }

  // 监听更新并保存
  doc.on('update', async (update: Uint8Array, origin: unknown) => {
    // 广播到 Redis
    broadcastUpdate(docName, update, origin)

    // 保存到 LevelDB
    if (db && origin !== 'db-loader') {
      try {
        await db.put(docName, Buffer.from(update))
      } catch (err) {
        log(`保存文档 ${docName} 失败：${err}`)
      }
    }
  })

  docs.set(docName, doc)
  return doc
}

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
  const clientId = randomUUID()
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const docName = url.pathname.slice(1) || 'default'

  log(`客户端 ${clientId} 连接，文档：${docName}`)

  let doc: Y.Doc | null = null
  let connected = false

  // 异步加载文档
  loadDocument(docName).then((loadedDoc) => {
    doc = loadedDoc
    connected = true

    // 发送初始状态
    const stateVector = Y.encodeStateVector(doc)
    const state = Y.encodeStateAsUpdate(doc)
    ws.send(JSON.stringify({ type: 'sync', state: Buffer.from(state).toString('base64') }))

    // 监听客户端消息
    ws.on('message', async (message) => {
      if (!doc) return

      try {
        const data = JSON.parse(message.toString())

        switch (data.type) {
          case 'sync': {
            // 客户端发送状态向量，服务器返回差异
            const clientState = new Uint8Array(Buffer.from(data.state, 'base64'))
            const update = Y.encodeStateAsUpdate(doc, clientState)
            if (update.length > 0) {
              ws.send(JSON.stringify({
                type: 'update',
                update: Buffer.from(update).toString('base64'),
              }))
            }
            break
          }

          case 'update': {
            // 客户端发送更新，应用到文档并广播
            const update = new Uint8Array(Buffer.from(data.update, 'base64'))
            Y.applyUpdate(doc, update)
            break
          }

          case 'awareness': {
            // Awareness 状态变更（用于光标等）
            const awareness = data.awareness
            if (redis) {
              redis.publish(`awareness:${docName}`, JSON.stringify({
                clientId,
                awareness,
              }))
            }
            // 广播给其他客户端
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'awareness',
                  clientId,
                  awareness,
                }))
              }
            })
            break
          }

          default:
            log(`未知消息类型：${data.type}`)
        }
      } catch (err) {
        log(`处理消息错误：${err}`)
      }
    })
  })

  // 监听 Redis 频道（多实例同步）
  if (redis && docName) {
    const subscribeChannel = async () => {
      const subscriber = redis!.duplicate()
      await subscriber.psubscribe(`yjs:${docName}`)
      subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
        if (doc && connected && channel === `yjs:${docName}`) {
          const update = new Uint8Array(Buffer.from(message, 'base64'))
          Y.applyUpdate(doc, update, 'redis')
        }
      })
    }
    subscribeChannel()
  }

  // 连接关闭
  ws.on('close', () => {
    log(`客户端 ${clientId} 断开`)
  })

  ws.on('error', (err) => {
    log(`客户端 ${clientId} 错误：${err.message}`)
  })

  // 心跳检测
  const pingInterval = setInterval(() => {
    if (ws.readyState === 1) {
      ws.ping()
    } else {
      clearInterval(pingInterval)
    }
  }, 30000)

  ws.on('close', () => {
    clearInterval(pingInterval)
  })
})

// 优雅关闭
process.on('SIGTERM', () => {
  log('收到 SIGTERM，正在关闭服务器...')

  wss.close(() => {
    log('WebSocket 服务器已关闭')

    if (redis) {
      redis.quit()
    }

    if (db) {
      db.close()
    }

    process.exit(0)
  })
})

log('服务器准备就绪')
