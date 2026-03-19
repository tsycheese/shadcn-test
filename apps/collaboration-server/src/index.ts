import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import * as Y from 'yjs'

const PORT = process.env.PORT || 3001

// 房间存储：docId → { doc, clients, lastUpdate }
const docs = new Map<string, {
  doc: Y.Doc
  clients: Set<WebSocket>
  lastUpdate: number
}>()

// 创建 HTTP 服务器（用于健康检查）
const server = http.createServer((req, res) => {
  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
    return
  }
  
  // 房间列表端点（调试用）
  if (req.url === '/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      rooms: Array.from(docs.keys()),
      count: docs.size
    }))
    return
  }
  
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // 从 URL 提取文档 ID
  const url = new URL(req.url!, 'http://localhost')
  const docId = url.pathname.slice(1)
  
  if (!docId) {
    ws.close()
    return
  }

  console.log(`[${new Date().toISOString()}] 客户端连接：${docId}`)

  // 创建或获取房间
  if (!docs.has(docId)) {
    docs.set(docId, {
      doc: new Y.Doc(),
      clients: new Set(),
      lastUpdate: Date.now()
    })
    console.log(`[${new Date().toISOString()}] 创建房间：${docId}`)
  }

  const room = docs.get(docId)!
  room.clients.add(ws)

  // 发送当前文档状态给新客户端
  const state = Y.encodeStateAsUpdate(room.doc)
  ws.send(state)

  // 处理 WebSocket 消息（Yjs 更新）
  ws.on('message', (message: Buffer) => {
    try {
      const update = new Uint8Array(message)
      Y.applyUpdate(room.doc, update)
      room.lastUpdate = Date.now()

      // 广播给其他客户端
      room.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(update)
        }
      })
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 应用更新失败：${docId}`, error)
    }
  })

  // 处理断开连接
  ws.on('close', () => {
    room.clients.delete(ws)
    console.log(`[${new Date().toISOString()}] 客户端断开：${docId}`)
    
    // 房间为空时记录（不立即删除，以便用户重连）
    if (room.clients.size === 0) {
      room.lastUpdate = Date.now()
      console.log(`[${new Date().toISOString()}] 房间为空：${docId}`)
    }
  })

  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket 错误：${docId}`, error)
    room.clients.delete(ws)
  })
})

// 定期清理空房间（超过 30 分钟无活动）
setInterval(() => {
  const now = Date.now()
  docs.forEach((room, docId) => {
    const minutesSinceUpdate = (now - room.lastUpdate) / 60000
    if (room.clients.size === 0 && minutesSinceUpdate > 30) {
      console.log(`[${new Date().toISOString()}] 清理空房间：${docId}`)
      docs.delete(docId)
    }
  })
}, 60000) // 每分钟检查一次

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] WebSocket 服务器运行在端口 ${PORT}`)
  console.log(`健康检查：http://localhost:${PORT}/health`)
  console.log(`房间列表：http://localhost:${PORT}/rooms`)
})
