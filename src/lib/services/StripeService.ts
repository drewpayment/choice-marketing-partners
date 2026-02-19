import Stripe from 'stripe'

export class StripeService {
  private stripe: Stripe

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    this.stripe = new Stripe(key)
  }

  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name: name || undefined,
    })
  }

  async createProduct(name: string, description?: string): Promise<Stripe.Product> {
    return this.stripe.products.create({
      name,
      description: description || undefined,
    })
  }

  async deactivateProduct(stripeProductId: string): Promise<Stripe.Product> {
    return this.stripe.products.update(stripeProductId, { active: false })
  }

  async createPrice(
    stripeProductId: string,
    amountCents: number,
    interval: 'month' | 'quarter' | 'year' | 'one_time',
    intervalCount: number = 1
  ): Promise<Stripe.Price> {
    if (interval === 'one_time') {
      return this.stripe.prices.create({
        product: stripeProductId,
        unit_amount: amountCents,
        currency: 'usd',
      })
    }

    // Stripe only supports day/week/month/year — map quarter to 3 months
    let stripeInterval: 'month' | 'year' = 'month'
    let stripeIntervalCount = intervalCount
    if (interval === 'quarter') {
      stripeInterval = 'month'
      stripeIntervalCount = 3 * intervalCount
    } else if (interval === 'year') {
      stripeInterval = 'year'
    } else {
      stripeInterval = 'month'
    }

    return this.stripe.prices.create({
      product: stripeProductId,
      unit_amount: amountCents,
      currency: 'usd',
      recurring: {
        interval: stripeInterval,
        interval_count: stripeIntervalCount,
      },
    })
  }

  async createSubscription(
    stripeCustomerId: string,
    stripePriceId: string
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: stripePriceId }],
      payment_behavior: 'default_incomplete',
    })
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(stripeSubscriptionId)
  }

  async createOneTimeCharge(
    stripeCustomerId: string,
    amountCents: number,
    description: string
  ): Promise<Stripe.Invoice> {
    await this.stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: amountCents,
      currency: 'usd',
      description,
    })

    const invoice = await this.stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true,
    })

    return this.stripe.invoices.pay(invoice.id)
  }

  async createSetupLink(stripeCustomerId: string): Promise<string> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
    })
    return setupIntent.client_secret!
  }

  async createBillingPortalSession(
    stripeCustomerId: string,
    returnUrl: string
  ): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    })
    return session.url
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set')
    }
    return this.stripe.webhooks.constructEvent(payload, signature, secret)
  }
}
