declare global {
  interface Window {
    Stripe: (publishableKey: string) => Record<string, unknown>;
  }
}

export {};