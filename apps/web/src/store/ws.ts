import { create } from 'zustand'

interface WsState {
  lastMessage: any | null
  setLastMessage: (msg: any) => void
}

export const useWsStore = create<WsState>((set) => ({
  lastMessage: null,
  setLastMessage: (msg) => set({ lastMessage: msg }),
}))