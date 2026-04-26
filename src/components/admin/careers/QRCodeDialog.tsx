'use client'

import { useEffect, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Download, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface QRCodeDialogProps {
  path: string
  siteOrigin?: string
  filename: string
  title: string
  subtitle?: string
  trigger?: ReactNode
}

function resolveOrigin(siteOrigin?: string): string {
  if (siteOrigin) return siteOrigin.replace(/\/$/, '')
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL
  if (envOrigin) return envOrigin.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export default function QRCodeDialog({
  path,
  siteOrigin,
  filename,
  title,
  subtitle,
  trigger,
}: QRCodeDialogProps) {
  const [open, setOpen] = useState(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const fullUrl = resolveOrigin(siteOrigin) + path
    setUrl(fullUrl)
    setError(null)
    setDataUrl(null)

    QRCode.toDataURL(fullUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((png) => {
        if (!cancelled) setDataUrl(png)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to generate QR code')
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, path, siteOrigin])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" aria-label="Show QR code">
            <QrCode className="size-4" />
            QR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="flex size-64 items-center justify-center rounded-lg border border-border bg-white p-2">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : dataUrl ? (
              // next/image can't optimize data URLs and offers no benefit here
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt={`QR code for ${url}`}
                width={240}
                height={240}
                className="size-full object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Generating…</p>
            )}
          </div>

          {url && (
            <code className="block w-full break-all rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
              {url}
            </code>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            disabled={!url}
            className="sm:mr-auto"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy link
              </>
            )}
          </Button>
          <Button asChild disabled={!dataUrl}>
            <a
              href={dataUrl ?? '#'}
              download={`${filename}.png`}
              aria-disabled={!dataUrl}
            >
              <Download className="size-4" />
              Download PNG
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
