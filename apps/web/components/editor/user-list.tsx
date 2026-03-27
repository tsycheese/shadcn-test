"use client"

import { WebsocketProvider } from 'y-websocket'
import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

interface User {
  id: string
  name: string
  color: string
  image?: string | null
}

interface UserListProps {
  provider: WebsocketProvider | null
}

export function UserList({ provider }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (!provider) return

    // 获取其他用户
    const updateUsers = () => {
      const states = provider.awareness.getStates()
      const userList: User[] = []
      
      states.forEach((state, clientId) => {
        if (state.user) {
          userList.push(state.user as User)
        }
      })
      
      setUsers(userList)
    }

    updateUsers()
    provider.awareness.on('update', updateUsers)

    return () => {
      provider.awareness.off('update', updateUsers)
    }
  }, [provider])

  if (users.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.map((user) => (
          <Avatar 
            key={user.id} 
            className="h-6 w-6 border-2 ring-2 ring-background"
            style={{ borderColor: user.color }}
            title={user.name}
          >
            <AvatarImage src={user.image || undefined} alt={user.name} />
            <AvatarFallback 
              className="text-[10px] font-medium text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  )
}
