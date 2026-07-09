import React from 'react'
import dayjs from 'dayjs'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { PaystubDetail } from '@/lib/repositories/PayrollRepository'

// The template renders the exact PaystubDetail payload the on-screen statement and
// PDF/email routes produce, so its field names stay in lockstep with the repository.
export type PaystubPdfData = PaystubDetail

// Advance "method" codes → human labels for the Advances / Daily Pay "Type" column.
const ADVANCE_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  ach: 'ACH',
  check: 'Check',
  other: 'Other',
}

const ACCENT = '#2563eb' // single accent color (matches app primary blue)
const BORDER = '#e2e8f0'
const MUTED = '#64748b'
const TEXT = '#0f172a'
const NEGATIVE = '#dc2626'

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: TEXT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    paddingBottom: 10,
    marginBottom: 14,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
  },
  companySub: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
  },
  docTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  docMeta: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'right',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  td: {
    fontSize: 8.5,
  },
  num: {
    fontFamily: 'Helvetica',
    textAlign: 'right',
  },
  numBold: {
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  empty: {
    fontSize: 8.5,
    color: MUTED,
    fontStyle: 'italic',
  },
  totals: {
    marginTop: 8,
    alignSelf: 'flex-end',
    width: '55%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: MUTED,
  },
  totalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    paddingBottom: 4,
    borderTopWidth: 1.5,
    borderTopColor: ACCENT,
  },
  netLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  netValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
})

const DEFAULT_FIELD_CONFIG = [
  { field_key: 'invoice_id', field_label: 'Invoice', source: 'builtin' as const, display_order: 0 },
  { field_key: 'full_name', field_label: 'Customer', source: 'builtin' as const, display_order: 1 },
  { field_key: 'city', field_label: 'Location', source: 'builtin' as const, display_order: 2 },
  { field_key: 'sale_date', field_label: 'Date', source: 'builtin' as const, display_order: 3 },
  { field_key: 'amount', field_label: 'Amount', source: 'builtin' as const, display_order: 4 },
]

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number.isFinite(num) ? num : 0)
}

function formatDateValue(value: unknown): string {
  if (!value) return ''
  // Date-only strings ('YYYY-MM-DD', optionally with a time suffix) must be parsed
  // in LOCAL time. `new Date('YYYY-MM-DD')` parses as UTC midnight, which then
  // formats a day earlier in a negative (US) timezone — the "Issue Date one day
  // early" bug. dayjs parses a bare 'YYYY-MM-DD' as local time, so no shift.
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      return dayjs(`${m[1]}-${m[2]}-${m[3]}`).format('MM/DD/YYYY')
    }
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format('MM/DD/YYYY') : value
  }
  // Date objects come from mysql2 already in local time (dateStrings: false).
  const d = dayjs(value as Date)
  return d.isValid() ? d.format('MM/DD/YYYY') : String(value)
}

function getBuiltinValue(sale: Record<string, unknown>, key: string): string {
  switch (key) {
    case 'sale_date':
      return formatDateValue(sale.sale_date)
    case 'full_name':
      return `${sale.first_name ?? ''} ${sale.last_name ?? ''}`.trim()
    case 'first_name':
      return String(sale.first_name ?? '')
    case 'last_name':
      return String(sale.last_name ?? '')
    case 'address':
      return String(sale.address ?? '')
    case 'city':
      return String(sale.city ?? '')
    case 'status':
      return String(sale.status ?? '')
    case 'amount':
      return formatCurrency(sale.amount as string | number)
    case 'invoice_id':
      return `#${sale.invoice_id}`
    case 'vendor':
      return String(sale.vendor ?? '')
    default:
      return ''
  }
}

export function PaystubPdf({ paystub }: { paystub: PaystubPdfData }) {
  const fieldConfig =
    paystub.fieldConfig?.length ? paystub.fieldConfig : DEFAULT_FIELD_CONFIG

  const advances = paystub.advances ?? []
  const advancesTotal = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  return (
    <Document
      title={`Paystub - ${paystub.employee.name} - ${paystub.issueDate}`}
      author="Choice Marketing Partners"
    >
      <Page size="A4" style={styles.page}>
        {/* Company header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>Choice Marketing Partners</Text>
            <Text style={styles.companySub}>Pay Statement</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>PAYSTUB</Text>
            <Text style={styles.docMeta}>Issue Date: {formatDateValue(paystub.issueDate)}</Text>
            {paystub.weekending ? (
              <Text style={styles.docMeta}>Week Ending: {paystub.weekending}</Text>
            ) : null}
          </View>
        </View>

        {/* Employee / vendor meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Employee</Text>
            <Text style={styles.metaValue}>{paystub.employee.name}</Text>
            {paystub.employee.sales_id1 ? (
              <Text style={styles.companySub}>Agent ID: {paystub.employee.sales_id1}</Text>
            ) : null}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Vendor</Text>
            <Text style={styles.metaValue}>{paystub.vendor.name}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Week Ending</Text>
            <Text style={styles.metaValue}>
              {paystub.weekending || formatDateValue(paystub.issueDate)}
            </Text>
          </View>
        </View>

        {/* Sales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Sales Transactions ({paystub.sales.length})
          </Text>
          {paystub.sales.length === 0 ? (
            <Text style={styles.empty}>No sales for this period.</Text>
          ) : (
            <View>
              <View style={styles.tableHeaderRow}>
                {fieldConfig.map((field) => (
                  <Text
                    key={field.field_key}
                    style={[
                      styles.th,
                      { flex: 1 },
                      field.field_key === 'amount' ? styles.num : {},
                    ]}
                  >
                    {field.field_label}
                  </Text>
                ))}
              </View>
              {paystub.sales.map((sale, idx) => (
                <View style={styles.tableRow} key={sale.invoice_id ?? idx}>
                  {fieldConfig.map((field) => {
                    const value =
                      field.source === 'builtin'
                        ? getBuiltinValue(
                            sale as unknown as Record<string, unknown>,
                            field.field_key
                          )
                        : sale.custom_fields?.[field.field_key] ?? ''
                    const isAmount = field.field_key === 'amount'
                    return (
                      <Text
                        key={field.field_key}
                        style={[
                          styles.td,
                          { flex: 1 },
                          isAmount ? styles.numBold : {},
                        ]}
                      >
                        {value}
                      </Text>
                    )
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Overrides */}
        {paystub.overrides.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Override Commissions ({paystub.overrides.length})
            </Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 0.8 }]}>ID</Text>
              <Text style={[styles.th, { flex: 2.5 }]}>Name</Text>
              <Text style={[styles.th, styles.num, { flex: 1 }]}>Sales</Text>
              <Text style={[styles.th, styles.num, { flex: 1.4 }]}>Commission</Text>
              <Text style={[styles.th, styles.num, { flex: 1.4 }]}>Total</Text>
            </View>
            {paystub.overrides.map((o, idx) => (
              <View style={styles.tableRow} key={o.ovrid ?? idx}>
                <Text style={[styles.td, { flex: 0.8 }]}>#{o.ovrid}</Text>
                <Text style={[styles.td, { flex: 2.5 }]}>{o.name}</Text>
                {/* Sale counts render as integers */}
                <Text style={[styles.td, styles.num, { flex: 1 }]}>
                  {Math.trunc(Number(o.sales) || 0)}
                </Text>
                <Text style={[styles.td, styles.num, { flex: 1.4 }]}>
                  {formatCurrency(o.commission)}
                </Text>
                <Text style={[styles.td, styles.numBold, { flex: 1.4 }]}>
                  {formatCurrency(o.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Adjustments & Reimbursements (signed amounts) */}
        {paystub.expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Adjustments &amp; Reimbursements ({paystub.expenses.length})
            </Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 0.8 }]}>ID</Text>
              <Text style={[styles.th, { flex: 1.6 }]}>Type</Text>
              <Text style={[styles.th, { flex: 3 }]}>Notes</Text>
              <Text style={[styles.th, styles.num, { flex: 1.4 }]}>Amount</Text>
            </View>
            {paystub.expenses.map((e, idx) => {
              const amt = parseFloat(e.amount) || 0
              return (
                <View style={styles.tableRow} key={e.expid ?? idx}>
                  <Text style={[styles.td, { flex: 0.8 }]}>#{e.expid}</Text>
                  <Text style={[styles.td, { flex: 1.6 }]}>{e.type}</Text>
                  <Text style={[styles.td, { flex: 3 }]}>{e.notes}</Text>
                  <Text
                    style={[
                      styles.td,
                      styles.numBold,
                      { flex: 1.4 },
                      amt < 0 ? { color: NEGATIVE } : {},
                    ]}
                  >
                    {formatCurrency(amt)}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Advances / Daily pay — only when present in payload */}
        {advances.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Advances / Daily Pay ({advances.length})</Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 1.4 }]}>Date</Text>
              <Text style={[styles.th, { flex: 1.6 }]}>Type</Text>
              <Text style={[styles.th, { flex: 3 }]}>Notes</Text>
              <Text style={[styles.th, styles.num, { flex: 1.4 }]}>Amount</Text>
            </View>
            {advances.map((a, idx) => {
              const amt = Number(a.amount) || 0
              return (
                <View style={styles.tableRow} key={a.advance_id ?? idx}>
                  <Text style={[styles.td, { flex: 1.4 }]}>{formatDateValue(a.advance_date)}</Text>
                  <Text style={[styles.td, { flex: 1.6 }]}>
                    {ADVANCE_METHOD_LABELS[a.method] ?? a.method ?? ''}
                  </Text>
                  <Text style={[styles.td, { flex: 3 }]}>{a.notes ?? ''}</Text>
                  <Text
                    style={[
                      styles.td,
                      styles.numBold,
                      { flex: 1.4 },
                      amt < 0 ? { color: NEGATIVE } : {},
                    ]}
                  >
                    {formatCurrency(amt)}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Sales</Text>
            <Text style={styles.totalValue}>{formatCurrency(paystub.totals.sales)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Overrides</Text>
            <Text style={styles.totalValue}>{formatCurrency(paystub.totals.overrides)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Adjustments &amp; Reimbursements</Text>
            <Text
              style={[
                styles.totalValue,
                paystub.totals.expenses < 0 ? { color: NEGATIVE } : {},
              ]}
            >
              {formatCurrency(paystub.totals.expenses)}
            </Text>
          </View>
          {advances.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Advances / Daily Pay</Text>
              <Text style={styles.totalValue}>{formatCurrency(advancesTotal)}</Text>
            </View>
          )}
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Net Pay</Text>
            <Text style={styles.netValue}>{formatCurrency(paystub.totals.netPay)}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Choice Marketing Partners  •  Generated ${formatDateValue(new Date())}  •  Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}

/**
 * Render the paystub to a PDF Buffer. Kept here (a .tsx module) so the JSX
 * <Document> element satisfies @react-pdf's DocumentProps typing.
 */
export function renderPaystubPdf(paystub: PaystubPdfData): Promise<Buffer> {
  return renderToBuffer(<PaystubPdf paystub={paystub} />)
}
