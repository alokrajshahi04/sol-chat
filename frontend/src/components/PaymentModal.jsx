import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, Check, ExternalLink } from 'lucide-react'

export function PaymentModal({ open, onClose, paymentRequest, onPaymentComplete }) {
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [txSignature, setTxSignature] = useState(null)

  const handlePay = async () => {
    setPaying(true)
    // Simulate wallet payment (mock Solana transaction)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    const mockTxSig = `${Math.random().toString(36).substring(2)}${Date.now()}`
    setTxSignature(mockTxSig)
    setPaid(true)
    setPaying(false)

    // Store transaction receipt
    const receipt = {
      txSignature: mockTxSig,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      purpose: paymentRequest.purpose,
      timestamp: new Date().toISOString(),
    }
    const stored = JSON.parse(localStorage.getItem('sol-chat-receipts') || '[]')
    stored.push(receipt)
    localStorage.setItem('sol-chat-receipts', JSON.stringify(stored))

    // Notify parent
    setTimeout(() => {
      onPaymentComplete?.(receipt)
      setPaid(false)
      setTxSignature(null)
      onClose()
    }, 1500)
  }

  if (!paymentRequest) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Required</DialogTitle>
          <DialogDescription>
            {paymentRequest.purpose || 'Complete payment to continue'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Payment Details */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-2xl font-bold">
                ${paymentRequest.amount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Currency</span>
              <Badge variant="secondary">{paymentRequest.currency}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                Solana Devnet
              </Badge>
            </div>
          </div>

          {/* Recipient */}
          <div className="rounded-lg border border-border p-3 bg-background">
            <div className="text-xs text-muted-foreground mb-1">Recipient Address</div>
            <div className="text-xs font-mono break-all text-foreground">
              {paymentRequest.recipient}
            </div>
          </div>

          {/* Transaction Signature (after payment) */}
          {paid && txSignature && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-green-800 mb-1">Payment Confirmed</div>
                <div className="text-xs text-green-700">Tx: {txSignature.substring(0, 16)}...</div>
              </div>
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={paying}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePay}
              disabled={paying || paid}
              className="flex-1 gap-2"
            >
              {paying ? (
                <>
                  <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : paid ? (
                <>
                  <Check className="h-4 w-4" />
                  Paid
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Pay with Wallet
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            This is a mock payment on Solana Devnet. No real funds will be transferred.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
