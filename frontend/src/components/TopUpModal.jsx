import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Coins } from 'lucide-react'
import { purchaseCredits, verifyPayment, getPricing } from '@/api/pay'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

export function TopUpModal({ open, onClose, onTopUpComplete, paymentHint }) {
  const { publicKey, connected, sendTransaction, connect } = useWallet()
  const { connection } = useConnection()
  const [credits, setCredits] = useState(10)
  const [pricing, setPricing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setCredits(paymentHint?.creditsMissing || 10)
  }, [paymentHint])

  useEffect(() => {
    if (!open) return
    getPricing()
      .then(setPricing)
      .catch(() => setPricing(null))
  }, [open])

  const handlePurchase = async () => {
    if (!connected || !publicKey) {
      await connect()
      return
    }
    const creditInt = Number(credits)
    const min = pricing?.minPurchase || 1
    if (!creditInt || creditInt < min) {
      setError(`Minimum purchase is ${min} credits`)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const request = await purchaseCredits(creditInt)
      const { payment, reference } = request

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(payment.recipient),
          lamports: parseInt(payment.amount, 10),
        })
      )
      transaction.feePayer = publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      await verifyPayment(reference, {
        signature,
        payerWallet: publicKey.toBase58(),
      })

      onTopUpComplete?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Top up credits</DialogTitle>
          {pricing ? (
            <p className="text-sm text-muted-foreground">
              {pricing.pricePerCredit?.lamports} lamports per credit • min {pricing.minPurchase} credits
            </p>
          ) : null}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Credits to buy</span>
            <Input
              type="number"
              min={pricing?.minPurchase || 1}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-amber-600" />
            <span>
              Total SOL:{' '}
              {pricing
                ? (
                    ((pricing.pricePerCredit?.lamports || 0) * Number(credits || 0)) /
                    1e9
                  ).toFixed(6)
                : '-'}
            </span>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handlePurchase} disabled={submitting}>
              {submitting ? 'Processing...' : 'Pay with wallet'}
            </Button>
          </div>

          <Badge variant="secondary">Wallet required • Solana {pricing?.network || 'devnet'}</Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
