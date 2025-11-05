/**
 * Phase 10.5 - Keyboard Shortcuts
 * 
 * Keyboard shortcuts system
 * - Shortcut registration
 * - Shortcut handlers
 * - Shortcut conflicts
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export interface KeyboardShortcut {
  id: string
  key: string // e.g., 'Ctrl+K', 'Cmd+S'
  action: string
  description: string
  context: string // 'global' | 'editor' | 'dashboard'
  handler: string
  isActive: boolean
  createdAt: Date
}

class KeyboardShortcuts {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()

  async initialize() {
    logInfo('Initializing Keyboard Shortcuts...')
    await this.initializeDefaultShortcuts()
    logInfo('✅ Keyboard Shortcuts initialized')
  }

  private async initializeDefaultShortcuts(): Promise<void> {
    const defaults = [
      { key: 'Ctrl+K', action: 'search', description: 'Open search', context: 'global' },
      { key: 'Ctrl+S', action: 'save', description: 'Save', context: 'global' },
      { key: 'Esc', action: 'close', description: 'Close modal', context: 'global' }
    ]

    for (const def of defaults) {
      const id = nanoid()
      const shortcut: KeyboardShortcut = {
        id,
        key: def.key,
        action: def.action,
        description: def.description,
        context: def.context,
        handler: def.action,
        isActive: true,
        createdAt: new Date()
      }
      this.shortcuts.set(id, shortcut)
    }
  }

  async registerShortcut(
    key: string,
    action: string,
    description: string,
    context: string,
    handler: string
  ): Promise<KeyboardShortcut> {
    const id = nanoid()
    const shortcut: KeyboardShortcut = {
      id,
      key,
      action,
      description,
      context,
      handler,
      isActive: true,
      createdAt: new Date()
    }
    this.shortcuts.set(id, shortcut)
    return shortcut
  }
}

export const keyboardShortcuts = new KeyboardShortcuts()

