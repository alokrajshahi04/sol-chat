import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModelSelector } from './ModelSelector'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useAuth } from '@/hooks/useAuth'
import { Coins, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AppHeader({
  balance,
  onTopUp,
  onRefreshBalance,
  selectedModels,
  onChangeModels,
  availableModels,
}) {
  const { publicKey, connected } = useWallet()
  const { linkWallet, wallet, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [linking, setLinking] = useState(false)

  // Auto-link wallet when connected
  useEffect(() => {
    if (connected && publicKey) {
      const newWallet = publicKey.toBase58()
      if (wallet !== newWallet && !linking) {
        setLinking(true)
        linkWallet({ wallet: newWallet })
          .then(() => onRefreshBalance?.())
          .catch(() => { })
          .finally(() => setLinking(false))
      } else if (wallet === newWallet) {
        onRefreshBalance?.()
      }
    }
  }, [connected, publicKey, wallet, linking, linkWallet, onRefreshBalance])

  return (
    <header className="relative h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <ModelSelector
          options={availableModels}
          selected={selectedModels}
          onChange={onChangeModels}
        />
        <Badge className="uppercase text-[10px] tracking-wide px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
          Online
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background">
          <Coins className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold">{balance ?? '-'}</span>
          <span className="text-xs text-muted-foreground">credits</span>
        </div>
        <Button size="sm" variant="secondary" onClick={onTopUp}>
          Top up
        </Button>
        <WalletMultiButton
          style={{
            height: '36px',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#512da8',
            color: 'white',
          }}
        />
        {!isAuthenticated && (
          <Button size="sm" variant="outline" onClick={() => navigate('/login')}>
            <LogIn className="h-4 w-4 mr-1" />
            Sign in
          </Button>
        )}
      </div>
    </header>
  )
}
