import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance } from 'tippy.js'
import type { Editor } from '@tiptap/core'

import { SlashCommandList, type CommandItem, defaultCommands } from '@/components/editor/slash-command/slash-command-list'

export interface SlashCommandRenderProps {
  editor: Editor
  clientRect: () => DOMRect | null
  command: (command: CommandItem) => void
  items?: CommandItem[]
}

export function createSlashCommandRender() {
  let component: ReactRenderer | null = null
  let popup: Instance[] | null = null

  return {
    onStart: ({ editor, clientRect, command, items }: SlashCommandRenderProps) => {
      const commandItems = items || defaultCommands

      component = new ReactRenderer(SlashCommandList, {
        props: {
          command,
          items: commandItems,
        },
        editor,
      })

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
      popup = tippy(document.body as any, {
        getReferenceClientRect: clientRect as any,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        zIndex: 100,
      })
    },

    onUpdate: ({ editor, clientRect, command, items }: SlashCommandRenderProps) => {
      if (component) {
        const commandItems = items || defaultCommands
        component.updateProps({ command, items: commandItems })
      }

      if (popup && popup[0]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        popup[0].setProps({ getReferenceClientRect: clientRect as any })
      }
    },

    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (component?.ref) {
        return (component.ref as any).onKeyDown?.({ event })
      }
      return false
    },

    onExit: () => {
      if (popup) {
        popup[0]?.destroy()
        popup = null
      }
      if (component) {
        component.destroy()
        component = null
      }
    },
  }
}
