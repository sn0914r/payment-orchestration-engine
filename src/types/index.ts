export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface CashfreeRequestShape {
  order_id: string;
  order_amount: number;
  order_currency?: "INR";
  customer_details: {
    customer_id: string;
    customer_phone: string;
    customer_email?: string;
  };
}
