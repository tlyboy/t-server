import type { Peer } from 'crossws'

interface WSMessage {
  type: string
  payload?: any
  timestamp?: number
}

class WSManager {
  // userId -> Set<Peer> (一个用户可能多端登录)
  private userConnections = new Map<number, Set<Peer>>()

  // peer -> userId
  private peerUserMap = new Map<Peer, number>()

  // 所有连接的 peer（包括匿名用户）
  private allPeers = new Set<Peer>()

  /**
   * 添加 peer 到全局连接池（包括匿名用户）
   */
  addPeer(peer: Peer) {
    this.allPeers.add(peer)
    console.log(`[ws-manager] 新连接，当前总连接数: ${this.allPeers.size}`)
  }

  /**
   * 从全局连接池移除 peer
   */
  removePeer(peer: Peer) {
    this.allPeers.delete(peer)
    console.log(`[ws-manager] 连接断开，剩余连接数: ${this.allPeers.size}`)
  }

  /**
   * 添加用户连接
   */
  addConnection(userId: number, peer: Peer) {
    // 记录 peer 对应的 userId
    this.peerUserMap.set(peer, userId)

    // 获取或创建用户的连接集合
    let peers = this.userConnections.get(userId)
    if (!peers) {
      peers = new Set()
      this.userConnections.set(userId, peers)
    }
    peers.add(peer)

    console.log(`[ws-manager] 用户 ${userId} 已连接，当前连接数: ${peers.size}`)
  }

  /**
   * 移除用户连接
   */
  removeConnection(peer: Peer) {
    const userId = this.peerUserMap.get(peer)
    if (userId === undefined) return

    this.peerUserMap.delete(peer)

    const peers = this.userConnections.get(userId)
    if (peers) {
      peers.delete(peer)
      console.log(
        `[ws-manager] 用户 ${userId} 断开连接，剩余连接数: ${peers.size}`,
      )

      if (peers.size === 0) {
        this.userConnections.delete(userId)
      }
    }

    return userId
  }

  /**
   * 获取 peer 对应的 userId
   */
  getUserId(peer: Peer): number | undefined {
    return this.peerUserMap.get(peer)
  }

  /**
   * 发送消息给指定用户的所有连接
   */
  sendToUser(userId: number, message: WSMessage) {
    const peers = this.userConnections.get(userId)
    if (!peers || peers.size === 0) return false

    const msgStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
    })

    for (const peer of peers) {
      try {
        peer.send(msgStr)
      } catch (error) {
        console.error(`[ws-manager] 发送消息给用户 ${userId} 失败:`, error)
      }
    }

    return true
  }

  /**
   * 广播消息给多个用户
   */
  broadcastToUsers(
    userIds: number[],
    message: WSMessage,
    excludeUserId?: number,
  ) {
    const msgStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
    })

    for (const userId of userIds) {
      if (userId === excludeUserId) continue

      const peers = this.userConnections.get(userId)
      if (!peers) continue

      for (const peer of peers) {
        try {
          peer.send(msgStr)
        } catch (error) {
          console.error(`[ws-manager] 广播消息给用户 ${userId} 失败:`, error)
        }
      }
    }
  }

  /**
   * 广播消息给所有在线用户
   */
  broadcastToAll(message: WSMessage, excludeUserId?: number) {
    const userIds = Array.from(this.userConnections.keys())
    this.broadcastToUsers(userIds, message, excludeUserId)
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: number): boolean {
    const peers = this.userConnections.get(userId)
    return peers !== undefined && peers.size > 0
  }

  /**
   * 获取所有在线用户ID
   */
  getOnlineUserIds(): number[] {
    return Array.from(this.userConnections.keys())
  }

  /**
   * 获取在线用户数量
   */
  getOnlineCount(): number {
    return this.userConnections.size
  }

  /**
   * 广播消息给所有连接的 peer（包括匿名用户）
   */
  broadcastToAllPeers(message: WSMessage, excludePeer?: Peer) {
    const msgStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
    })

    for (const peer of this.allPeers) {
      if (peer === excludePeer) continue
      try {
        peer.send(msgStr)
      } catch (error) {
        console.error('[ws-manager] 广播消息失败:', error)
      }
    }
  }
}

// 导出单例
export const wsManager = new WSManager()
