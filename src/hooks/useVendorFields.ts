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
  // Start loading as true when we have a vendorId and flag hasn't resolved yet (null)
  // so consumers don't flash default columns while we're fetching
  const [isLoading, setIsLoading] = useState(flagEnabled === null && vendorId !== null)

  useEffect(() => {
    if (flagEnabled === null) {
      // Feature flag still loading — keep isLoading true so consumers wait
      setIsLoading(vendorId !== null)
      return
    }

    if (!flagEnabled || !vendorId) {
      setFields([])
      setIsConfigured(false)
      setIsLoading(false)
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
