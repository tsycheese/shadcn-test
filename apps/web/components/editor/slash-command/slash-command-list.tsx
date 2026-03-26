"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type Ref,
} from 'react'
import { Button } from "@workspace/ui/components/button"
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Type,
  Pilcrow,
} from 'lucide-react'
import PinyinMatch from 'pinyin-match'

export interface CommandItem {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  command: (props: { editor: any; range: { from: number; to: number } }) => void
}

export interface SlashCommandListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

export const SlashCommandList = forwardRef(
  ({ items, command }: SlashCommandListProps, ref: Ref<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }>) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) {
        command(item)
      }
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-1 w-72 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground p-2 text-center">
            无匹配结果
          </div>
        ) : (
          items.map((item, index) => (
            <Button
              key={item.title}
              variant={index === selectedIndex ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2 h-auto py-2 px-3"
              onClick={() => selectItem(index)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </Button>
          ))
        )}
      </div>
    )
  }
)

SlashCommandList.displayName = 'SlashCommandList'

// 默认命令列表
export const defaultCommands: CommandItem[] = [
  {
    title: '正文',
    description: '普通文本',
    icon: Pilcrow,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
  },
  {
    title: '标题 1',
    description: '大标题',
    icon: Heading1,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run()
    },
  },
  {
    title: '标题 2',
    description: '副标题',
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run()
    },
  },
  {
    title: '粗体',
    description: '加粗文本',
    icon: Bold,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBold().run()
    },
  },
  {
    title: '斜体',
    description: '倾斜文本',
    icon: Italic,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run()
    },
  },
  {
    title: '列表',
    description: '无序列表',
    icon: List,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: '编号列表',
    description: '有序列表',
    icon: ListOrdered,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: '引用',
    description: '引用块',
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: '代码块',
    description: '插入代码块',
    icon: Code2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: '分割线',
    description: '插入水平线',
    icon: Minus,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
]

/**
 * 拼音搜索匹配函数
 * 支持中文、拼音首字母、完整拼音搜索
 */
export function matchCommand(query: string, item: CommandItem): boolean {
  if (!query) return true
  
  const searchText = `${item.title} ${item.description}`
  
  // 1. 直接文本匹配
  if (searchText.toLowerCase().includes(query.toLowerCase())) {
    return true
  }
  
  // 2. 拼音匹配（支持首字母和完整拼音）
  const matchResult = PinyinMatch.match(searchText, query)
  if (matchResult) {
    return true
  }
  
  return false
}

/**
 * 过滤命令列表
 */
export function filterCommands(query: string): CommandItem[] {
  if (!query) {
    return defaultCommands
  }
  
  return defaultCommands.filter((item) => matchCommand(query, item))
}
