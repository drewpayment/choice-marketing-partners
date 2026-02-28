'use client'

import { useEffect, useState } from 'react'
import { useFeatureFlag } from './useFeatureFlag'
import { VendorFieldDefinition } from '@/lib/repositories/VendorFieldRepository'

interface UseVendorFieldsResult {
  fields: VendorFieldDefinition[]
  isConfigured: boolean
  isLoading: boolean
}

/**
 * Hook combining feature flag check + vendor field fetch.
 * Returns empty fields when flag is off or vendor has no config,
 * so consumers automatically fall back to default columns.
 */
export function useVendorFields(vendorId: number | null): UseVendorFieldsResult {
  const flagEnabled = useFeatureFlag('vendor_custom_fields')
  const [fields, setFields] = useState<VendorFieldDefinition[]>([])
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!flagEnabled || !vendorId) {
      setFields([])
      setIsConfigured(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetch(`/api/vendors/${vendorId}/fields`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setFields(data.fields ?? [])
          setIsConfigured(data.isConfigured ?? false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFields([])
          setIsConfigured(false)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [flagEnabled, vendorId])

  return { fields, isConfigured, isLoading }
}
