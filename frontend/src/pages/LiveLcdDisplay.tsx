import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Flame, Clock, CheckCircle2, Volume2, VolumeX, Maximize2, Minimize2, 
  Tv, ChefHat, Users, RefreshCw, ZoomIn, ZoomOut, AlertTriangle, ArrowRight,
  UtensilsCrossed, Package, ShoppingBag, Bike
} from 'lucide-react'
import { kitchenService } from '../services/kitchenService'
import { formatReceiptOrderNumber } from '../utils/receiptOrderNumber'
import { audioChime } from '../utils/audioChime'

export interface LcdTicketItem {
  id: string
  name: string
  quantity: number
  notes: string | null
  modifiers: { name: string }[]
  status: string
  category: string
  comboComponents?: any[]
}

export interface LcdTicket {
  id: string
  orderNumber: string
  orderType: string
  tableId: string | null
  customer: string
  orderTime: string
  elapsedMinutes: number
  priority: string
  status: 'Waiting' | 'Preparing' | 'Ready' | 'Served'
  items: LcdTicketItem[]
  notes: string
  isVip: boolean
}

export const LiveLcdDisplay: React.FC = () => {
  // View mode: 'kitchen' = Chef prep screen, 'customer' = Fast-food pickup screen, 'grid' = All tickets grid
  const [viewMode, setViewMode] = useState<'kitchen' | 'customer' | 'grid'>(() => {
    return (localStorage.getItem('df_lcd_mode') as any) || 'kitchen'
  })

  // Display zoom scale for different TV screen sizes (0.8x to 1.4x)
  const [zoomScale, setZoomScale] = useState<number>(() => {
    const saved = localStorage.getItem('df_lcd_zoom')
    return saved ? Number(saved) : 1
  })

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('df_lcd_sound') !== 'false'
  })

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tickets, setTickets] = useState<LcdTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [filterStation, setFilterStation] = useState<string>('ALL')

  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  const initialLoadDoneRef = useRef(false)

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Save preferences
  useEffect(() => {
    localStorage.setItem('df_lcd_mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    localStorage.setItem('df_lcd_zoom', String(zoomScale))
  }, [zoomScale])

  useEffect(() => {
    localStorage.setItem('df_lcd_sound', String(soundEnabled))
  }, [soundEnabled])

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  // Fetch live queue from backend
  const fetchQueue = async () => {
    try {
      // First try dedicated public LCD queue, fallback to standard queue
      let res: any
      try {
        res = await kitchenService.getLcdQueue()
      } catch {
        res = await kitchenService.getQueue({ monitorMode: false })
      }

      if (res && (res.data || res.success)) {
        const rawTickets = (res.data?.tickets || res.data || []) as any[]
        
        const mapped: LcdTicket[] = rawTickets.map((row: any) => {
          let s: 'Waiting' | 'Preparing' | 'Ready' | 'Served' = 'Waiting'
          const rawStatus = (row.kitchen_state || row.order_kitchen_state || '').toUpperCase()
          if (rawStatus === 'PREPARING') s = 'Preparing'
          else if (rawStatus === 'READY') s = 'Ready'
          else if (rawStatus === 'SERVED' || rawStatus === 'COMPLETED') s = 'Served'
          else s = 'Waiting'

          const dateStr = row.created_at || row.order_created_at || new Date().toISOString()
          const orderTimeMs = new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z').getTime()
          const elapsedMinutes = Math.max(0, Math.floor((Date.now() - orderTimeMs) / 60000))

          const items: LcdTicketItem[] = (row.items || []).map((i: any) => ({
            id: i.id || i.item_id,
            name: i.product_name_snapshot || i.product_name || 'Shawarma',
            quantity: i.quantity || 1,
            notes: i.item_notes || i.notes || null,
            modifiers: (i.modifiers || []).map((m: any) => ({
              name: m.modifier_name_snapshot || m.name || ''
            })),
            status: i.item_kitchen_state || i.kitchen_state || 'PENDING',
            category: i.category_name || 'SHAWARMA',
            comboComponents: i.combo_components || []
          }))

          return {
            id: row.id || row.order_id,
            orderNumber: formatReceiptOrderNumber(row.order_number),
            orderType: (row.order_type || 'TAKEAWAY').toUpperCase(),
            tableId: row.table_id || null,
            customer: row.customer_id || 'Guest',
            orderTime: dateStr,
            elapsedMinutes,
            priority: row.priority || 'NORMAL',
            status: s,
            items,
            notes: row.kitchen_notes || row.customer_notes || '',
            isVip: !!row.is_vip
          }
        })

        // Filter out completed/served orders for kitchen active view
        const activeTickets = mapped.filter(t => t.status !== 'Served')

        // Sound alert for new incoming orders
        if (initialLoadDoneRef.current && soundEnabled) {
          const currentIds = new Set(activeTickets.map(t => t.id))
          const hasNew = activeTickets.some(t => !knownOrderIdsRef.current.has(t.id))
          if (hasNew) {
            audioChime.playNewOrderChime()
          }
          knownOrderIdsRef.current = currentIds
        } else if (!initialLoadDoneRef.current) {
          knownOrderIdsRef.current = new Set(activeTickets.map(t => t.id))
          initialLoadDoneRef.current = true
        }

        setTickets(activeTickets)
      }
    } catch (err) {
      console.warn('[LCD Screen] Error fetching live queue:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and auto-polling every 6 seconds
  useEffect(() => {
    fetchQueue()
    const pollInterval = setInterval(fetchQueue, 6000)

    // Listen to real-time socket events via window custom event
    const handleLcdSocketUpdate = () => {
      fetchQueue()
    }
    window.addEventListener('lcd-queue-updated', handleLcdSocketUpdate)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('lcd-queue-updated', handleLcdSocketUpdate)
    }
  }, [soundEnabled])

  // Filtered tickets based on station
  const filteredTickets = useMemo(() => {
    if (filterStation === 'ALL') return tickets
    return tickets.filter(t => 
      t.items.some(i => i.category.toUpperCase().includes(filterStation))
    )
  }, [tickets, filterStation])

  // Active preparing tickets vs Ready tickets
  const preparingTickets = useMemo(() => {
    return filteredTickets.filter(t => t.status === 'Waiting' || t.status === 'Preparing')
  }, [filteredTickets])

  const readyTickets = useMemo(() => {
    return filteredTickets.filter(t => t.status === 'Ready')
  }, [filteredTickets])

  // Currently focused order in kitchen mode
  const currentPrepTicket = useMemo(() => {
    if (selectedTicketId) {
      const found = preparingTickets.find(t => t.id === selectedTicketId)
      if (found) return found
    }
    return preparingTickets[0] || null
  }, [preparingTickets, selectedTicketId])

  // Next orders in line (excluding current)
  const nextOrdersQueue = useMemo(() => {
    if (!currentPrepTicket) return []
    return preparingTickets.filter(t => t.id !== currentPrepTicket.id)
  }, [preparingTickets, currentPrepTicket])

  // Action: Mark Entire Order as Ready
  const handleMarkOrderReady = async (ticket: LcdTicket) => {
    try {
      if (soundEnabled) audioChime.playOrderReadyChime()
      
      for (const item of ticket.items) {
        try {
          await kitchenService.lcdMarkReady(item.id)
        } catch {
          await kitchenService.markItemReady(item.id)
        }
      }
      fetchQueue()
    } catch (err) {
      console.error('Failed to mark order ready', err)
    }
  }

  // Action: Mark Entire Order as Served / Cleared
  const handleMarkOrderServed = async (ticket: LcdTicket) => {
    try {
      for (const item of ticket.items) {
        try {
          await kitchenService.lcdMarkServed(item.id)
        } catch {
          await kitchenService.markItemServed(item.id)
        }
      }
      fetchQueue()
    } catch (err) {
      console.error('Failed to mark order served', err)
    }
  }

  // Helper: Detect shawarma customization badges
  const renderCustomizationTags = (notes: string | null, modifiers: { name: string }[]) => {
    const tags: { text: string; bg: string; border: string; textCol: string }[] = []

    modifiers.forEach(m => {
      const name = m.name.toLowerCase()
      if (name.includes('spicy') || name.includes('chilli')) {
        tags.push({ text: `🌶️ ${m.name}`, bg: 'bg-red-500/20', border: 'border-red-500/40', textCol: 'text-red-400' })
      } else if (name.includes('garlic') || name.includes('toum')) {
        tags.push({ text: `🧄 ${m.name}`, bg: 'bg-amber-500/20', border: 'border-amber-500/40', textCol: 'text-amber-300' })
      } else if (name.includes('cheese')) {
        tags.push({ text: `🧀 ${m.name}`, bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', textCol: 'text-yellow-300' })
      } else if (name.includes('no ') || name.includes('without')) {
        tags.push({ text: `🚫 ${m.name}`, bg: 'bg-rose-900/30', border: 'border-rose-500/30', textCol: 'text-rose-300' })
      } else {
        tags.push({ text: m.name, bg: 'bg-blue-500/20', border: 'border-blue-500/30', textCol: 'text-blue-300' })
      }
    })

    if (notes) {
      tags.push({ text: `📝 Note: ${notes}`, bg: 'bg-purple-500/20', border: 'border-purple-500/40', textCol: 'text-purple-300' })
    }

    if (tags.length === 0) return null

    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {tags.map((t, idx) => (
          <span 
            key={idx} 
            className={`px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-wider border ${t.bg} ${t.border} ${t.textCol}`}
          >
            {t.text}
          </span>
        ))}
      </div>
    )
  }

  // Timer urgency color
  const getElapsedBadge = (mins: number) => {
    if (mins >= 10) {
      return (
        <span className="px-3 py-1 rounded-lg bg-red-600/30 text-red-400 border border-red-500/50 font-black text-sm flex items-center gap-1.5 animate-pulse">
          <Flame className="w-4 h-4 text-red-500" /> {mins}m (Overdue)
        </span>
      )
    }
    if (mins >= 5) {
      return (
        <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-sm flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-400" /> {mins}m (Rush)
        </span>
      )
    }
    return (
      <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-sm flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-emerald-400" /> {mins}m
      </span>
    )
  }

  return (
    <div 
      className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none overflow-x-hidden"
      style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
    >
      {/* ── TOP LCD TV CONTROL BAR ── */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg">
        {/* Left: Branding & Live Indicator */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-6 h-6 text-neutral-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider uppercase text-neutral-100 flex items-center gap-2">
                Shawarma Live Screen
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-black tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> LIVE LCD
              </span>
            </div>
            <p className="text-xs font-semibold text-neutral-400">
              Kitchen Display & Token Monitor System
            </p>
          </div>
        </div>

        {/* Center: Digital Clock */}
        <div className="hidden md:flex flex-col items-center justify-center px-6 py-1 rounded-xl bg-neutral-950/80 border border-neutral-800">
          <span className="text-2xl font-black tracking-widest text-amber-400 font-mono">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Right: Mode Switcher & Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setViewMode('kitchen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                viewMode === 'kitchen' 
                  ? 'bg-amber-500 text-neutral-950 shadow-md font-black' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Kitchen Prep
            </button>
            <button
              onClick={() => setViewMode('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                viewMode === 'customer' 
                  ? 'bg-emerald-500 text-neutral-950 shadow-md font-black' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Customer TV
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' 
                  ? 'bg-blue-500 text-neutral-950 shadow-md font-black' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              All Tickets
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled
              setSoundEnabled(next)
              if (next) audioChime.playNewOrderChime()
            }}
            title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Zoom In / Out */}
          <div className="hidden lg:flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setZoomScale(z => Math.max(0.8, Number((z - 0.1).toFixed(1))))}
              title="Zoom Out for Small TVs"
              className="p-1 text-neutral-400 hover:text-neutral-100 rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-neutral-400">{Math.round(zoomScale * 100)}%</span>
            <button
              onClick={() => setZoomScale(z => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
              title="Zoom In for Giant LCDs"
              className="p-1 text-neutral-400 hover:text-neutral-100 rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle TV Fullscreen (F11)"
            className="p-2 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-neutral-100 rounded-xl transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchQueue}
            title="Refresh Live Queue"
            className="p-2 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-neutral-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 p-6 flex flex-col overflow-hidden">
        {/* ── MODE 1: KITCHEN PREP MASTER (FOR SHAWARMA CHEFS) ── */}
        {viewMode === 'kitchen' && (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            {/* Top Stat Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Orders in Queue</p>
                  <p className="text-3xl font-black text-amber-400 mt-0.5">{preparingTickets.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Ready for Pickup</p>
                  <p className="text-3xl font-black text-emerald-400 mt-0.5">{readyTickets.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Shawarma Items</p>
                  <p className="text-3xl font-black text-orange-400 mt-0.5">
                    {preparingTickets.reduce((acc, t) => acc + t.items.reduce((sum, i) => sum + i.quantity, 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-orange-400" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Overdue (&gt;10m)</p>
                  <p className="text-3xl font-black text-red-500 mt-0.5">
                    {preparingTickets.filter(t => t.elapsedMinutes >= 10).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>

            {/* Main Stage: Focus Box + Next Queue */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
              {/* Left / Center: CURRENT ACTIVE ORDER (HERO FOCUS) */}
              <div className="lg:col-span-8 flex flex-col bg-neutral-900/90 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {currentPrepTicket ? (
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Header: Giant Token Number & Timer */}
                    <div>
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-amber-500 text-neutral-950 rounded-lg">
                            Now Preparing
                          </span>
                          <span className="text-4xl sm:text-5xl font-black text-neutral-100 tracking-tight font-mono">
                            {currentPrepTicket.orderNumber}
                          </span>
                          {currentPrepTicket.isVip && (
                            <span className="px-2 py-0.5 rounded text-xs font-black bg-yellow-400 text-neutral-950 uppercase">
                              VIP
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {getElapsedBadge(currentPrepTicket.elapsedMinutes)}
                          <span className="px-3 py-1 rounded-lg bg-neutral-800 text-neutral-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                            {currentPrepTicket.orderType === 'TAKEAWAY' && <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />}
                            {currentPrepTicket.orderType === 'DINE IN' && <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />}
                            {currentPrepTicket.orderType === 'DELIVERY' && <Bike className="w-3.5 h-3.5 text-amber-400" />}
                            {currentPrepTicket.orderType}
                            {currentPrepTicket.tableId && ` • Table ${currentPrepTicket.tableId}`}
                          </span>
                        </div>
                      </div>

                      {/* Items List (Large & Clear for Shawarma Master) */}
                      <div className="space-y-4 max-h-[42vh] overflow-y-auto pr-2 custom-scrollbar">
                        {currentPrepTicket.items.map((item, idx) => (
                          <div 
                            key={item.id || idx}
                            className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex items-start justify-between gap-4"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-lg">
                                  {item.quantity}x
                                </span>
                                <span className="text-xl sm:text-2xl font-black text-neutral-100 tracking-tight">
                                  {item.name}
                                </span>
                              </div>
                              
                              {/* Customizations: Spicy, Garlic, Cheese, No Onion etc. */}
                              {renderCustomizationTags(item.notes, item.modifiers)}
                            </div>
                          </div>
                        ))}

                        {/* Order Notes Callout */}
                        {currentPrepTicket.notes && (
                          <div className="p-3 bg-neutral-950 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-semibold flex items-center gap-2">
                            <span>📌 Special Instructions:</span>
                            <span className="text-neutral-200 font-bold">{currentPrepTicket.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar: Big Touch / Mouse Buttons */}
                    <div className="pt-4 border-t border-neutral-800 flex items-center gap-4 mt-4">
                      <button
                        onClick={() => handleMarkOrderReady(currentPrepTicket)}
                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-black rounded-2xl text-xl uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
                      >
                        <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                        Mark Order Ready (تیار ہے)
                      </button>

                      <button
                        onClick={() => handleMarkOrderServed(currentPrepTicket)}
                        className="py-4 px-6 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-2xl text-sm uppercase tracking-wider transition-colors"
                      >
                        Done &amp; Dismiss
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-neutral-600">
                    <CheckCircle2 className="w-20 h-20 mb-4 stroke-1 text-emerald-500/40" />
                    <h2 className="text-2xl font-black text-neutral-300">All Shawarmas Prepared!</h2>
                    <p className="text-sm text-neutral-500 mt-1">Kitchen queue is currently clear.</p>
                  </div>
                )}
              </div>

              {/* Right Side: NEXT ORDERS IN QUEUE */}
              <div className="lg:col-span-4 flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl p-5 overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black uppercase tracking-wider text-neutral-200">
                      Next in Queue
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-bold font-mono">
                      {nextOrdersQueue.length}
                    </span>
                  </div>
                </div>

                {nextOrdersQueue.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-600">
                    <Package className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">No other orders in line</p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                    {nextOrdersQueue.map((ticket, idx) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          selectedTicketId === ticket.id
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                            : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-500 font-mono">#{idx + 2}</span>
                            <span className="text-lg font-black text-neutral-100 font-mono">{ticket.orderNumber}</span>
                          </div>
                          {getElapsedBadge(ticket.elapsedMinutes)}
                        </div>

                        {/* Items summary */}
                        <div className="space-y-1">
                          {ticket.items.map((item, iIdx) => (
                            <div key={iIdx} className="text-xs text-neutral-300 font-medium flex items-center justify-between">
                              <span className="truncate">{item.quantity}x {item.name}</span>
                              {item.modifiers.length > 0 && (
                                <span className="text-[10px] text-amber-400 font-bold ml-2 shrink-0">
                                  +{item.modifiers.length} mod
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
                          <span>{ticket.orderType}</span>
                          <span className="text-amber-400 font-bold flex items-center gap-1 hover:underline">
                            Bring to Focus <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 2: CUSTOMER TOKEN PICKUP SCREEN (FAST-FOOD STYLE) ── */}
        {viewMode === 'customer' && (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
              
              {/* LEFT COLUMN: PREPARING (IN PROGRESS) */}
              <div className="flex flex-col bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-amber-400 tracking-wider uppercase flex items-center gap-2">
                      <Flame className="w-7 h-7 text-amber-400" />
                      Preparing
                    </h2>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                      تیار ہو رہا ہے
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-lg font-black font-mono">
                    {preparingTickets.length}
                  </span>
                </div>

                {preparingTickets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
                    <p className="text-base font-bold text-neutral-500">No orders currently preparing</p>
                  </div>
                ) : (
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start overflow-y-auto pr-1 custom-scrollbar">
                    {preparingTickets.map(ticket => (
                      <div 
                        key={ticket.id}
                        className="aspect-[4/3] rounded-2xl bg-neutral-950 border border-amber-500/30 flex flex-col items-center justify-center p-3 shadow-md"
                      >
                        <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight">
                          {ticket.orderNumber}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                          {ticket.orderType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: READY FOR PICKUP */}
              <div className="flex flex-col bg-neutral-900/90 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      Ready for Pickup
                    </h2>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                      تیار ہے - تشریف لائیں
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-lg font-black font-mono animate-pulse">
                    {readyTickets.length}
                  </span>
                </div>

                {readyTickets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
                    <p className="text-base font-bold text-neutral-500">Orders will appear here when ready</p>
                  </div>
                ) : (
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start overflow-y-auto pr-1 custom-scrollbar">
                    {readyTickets.map(ticket => (
                      <div 
                        key={ticket.id}
                        className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-emerald-950/80 to-neutral-950 border-2 border-emerald-500 flex flex-col items-center justify-center p-3 shadow-lg shadow-emerald-500/10 animate-bounce-short"
                      >
                        <span className="text-4xl sm:text-5xl font-black text-emerald-300 font-mono tracking-tight drop-shadow-md">
                          {ticket.orderNumber}
                        </span>
                        <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mt-1">
                          COLLECT NOW
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Marquee / Ticker */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-neutral-400 overflow-hidden shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-amber-400">Fresh Charcoal &amp; Grill Shawarma</span>
              </div>
              <div className="truncate mx-4 text-neutral-300">
                Please have your receipt ready • Thank you for your patience!
              </div>
              <div className="text-neutral-500 font-mono">
                SH-POS
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 3: ALL TICKETS GRID (OVERVIEW) ── */}
        {viewMode === 'grid' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-sm font-black uppercase tracking-wider text-neutral-300">
                Active Order Tickets ({filteredTickets.length})
              </span>
              <div className="flex gap-2">
                {['ALL', 'SHAWARMA', 'DEAL', 'DRINK'].map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStation(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                      filterStation === st ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
                <CheckCircle2 className="w-16 h-16 mb-2 text-emerald-500/40" />
                <p className="text-lg font-bold text-neutral-400">No active tickets</p>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1 custom-scrollbar">
                {filteredTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className={`bg-neutral-900 border rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all ${
                      ticket.status === 'Ready'
                        ? 'border-emerald-500/60 shadow-emerald-500/10'
                        : ticket.elapsedMinutes >= 10
                        ? 'border-red-500/60 shadow-red-500/10'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
                        <span className="text-2xl font-black text-neutral-100 font-mono tracking-tight">
                          {ticket.orderNumber}
                        </span>
                        {getElapsedBadge(ticket.elapsedMinutes)}
                      </div>

                      <div className="text-xs text-neutral-400 mb-3 flex items-center justify-between">
                        <span>{ticket.orderType}</span>
                        {ticket.tableId && <span>Table {ticket.tableId}</span>}
                      </div>

                      {/* Items */}
                      <div className="space-y-2 mb-4">
                        {ticket.items.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-amber-400">{item.quantity}x</span>
                              <span className="font-bold text-neutral-200">{item.name}</span>
                            </div>
                            {renderCustomizationTags(item.notes, item.modifiers)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-3 border-t border-neutral-800">
                      {ticket.status === 'Ready' ? (
                        <button
                          onClick={() => handleMarkOrderServed(ticket)}
                          className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs uppercase tracking-wider"
                        >
                          Clear (Served)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkOrderReady(ticket)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider shadow"
                        >
                          Mark Ready (تیار ہے)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default LiveLcdDisplay
