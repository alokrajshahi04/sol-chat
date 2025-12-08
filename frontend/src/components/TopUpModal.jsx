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
import { Card, CardContent } from '@/components/ui/card'
import { Coins, Check, Sparkles } from 'lucide-react'
import { creditBundles } from '@/data/mock'
import { PaymentModal } from '@/components/PaymentModal'

export function TopUpModal({ open, onClose, onTopUpComplete }) {
  const [selectedBundle, setSelectedBundle] = useState(null)
  const [paymentRequest, setPaymentRequest] = useState(null)

  const handleSelectBundle = (bundle) => {
    setSelectedBundle(bundle)
    setPaymentRequest({
      amount: bundle.price,
      currency: bundle.currency,
      recipient: 'SoLxxx...MockRecipient123',
      purpose: `Purchase ${bundle.credits} credits`,
      bundleId: bundle.id,
      credits: bundle.credits,
    })
  }

  const handlePaymentComplete = () => {
    if (selectedBundle) {
      onTopUpComplete?.(selectedBundle.credits)
    }
    setSelectedBundle(null)
    setPaymentRequest(null)
    onClose()
  }

  return (
    <>
      <Dialog open={open && !paymentRequest} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Top Up Credits</DialogTitle>
            <DialogDescription>
              Choose a bundle and pay with Solana x402. Credits never expire.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {creditBundles.map((bundle) => (
              <Card
                key={bundle.id}
                className={`cursor-pointer transition-all ${
                  bundle.popular
                    ? 'border-primary shadow-md'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelectBundle(bundle)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-secondary/30 flex items-center justify-center">
                        <Coins className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-bold text-lg">
                          {bundle.credits} Credits
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${bundle.price} {bundle.currency}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {bundle.popular && (
                        <Badge className="bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      )}
                      {bundle.savings && (
                        <Badge variant="secondary" className="text-xs">
                          Save {bundle.savings}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>1 credit = 1 message (any model)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Credits never expire</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Use across all unlocked agents</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentModal
        open={!!paymentRequest}
        onClose={() => {
          setPaymentRequest(null)
          setSelectedBundle(null)
        }}
        paymentRequest={paymentRequest}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  )
}
