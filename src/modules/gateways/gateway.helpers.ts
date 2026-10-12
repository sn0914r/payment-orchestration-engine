export const mapCashfreePaymentMethod = (method: string) => {
  const cashfreePaymentMethodMap: Record<string, string> = {
    upi: "upi",
    card: "cc,dc",
    netbanking: "nb",
    wallet: "app,wallet",
    emi: "emi",
  };

  return cashfreePaymentMethodMap[method];
};

export const toPayloadString = (payload: unknown): string => {
  if (Buffer.isBuffer(payload)) return payload.toString();
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};
