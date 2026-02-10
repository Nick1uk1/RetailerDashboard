export interface LinnworksAuthResponse {
  Token: string;
  Server: string;
}

export interface LinnworksOrderItem {
  ItemNumber: string;
  SKU: string; // Must match Linnworks inventory SKU exactly (with period for CASE items)
  ChannelSKU: string;
  ItemTitle: string;
  Qty: number;
  PricePerUnit: number;
  TaxRate: number;
  TaxCostInclusive: boolean;
  LinePercentDiscount: number;
  BinRack?: string; // StockItemId for direct inventory linking
}

export interface LinnworksAddress {
  FullName: string;
  Company?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  Town?: string;
  Region?: string;
  PostCode?: string;
  Country?: string;
  PhoneNumber?: string;
  EmailAddress?: string;
}

export interface LinnworksOrderNote {
  Note: string;
  NoteEntryDate: string;
  NoteUserName: string;
  IsInternal: boolean;
}

export interface LinnworksOrderPayload {
  Source: string;
  SubSource: string;
  ReferenceNumber: string;
  ExternalReference: string;
  ReceivedDate: string;
  DispatchBy?: string;
  Currency: string;
  ChannelBuyerName: string;
  DeliveryNotes?: string;
  OrderItems: LinnworksOrderItem[];
  DeliveryAddress?: LinnworksAddress;
  BillingAddress?: LinnworksAddress;
  Notes?: LinnworksOrderNote[];
  PaymentStatus?: string;
  PaidAmount?: number;
  Locked?: boolean; // false = not parked
  HoldOrCancel?: boolean; // false = don't hold
  Status?: number; // 0 = unpaid/open
  MatchPaymentMethodTag?: string;
  MatchPostalServiceTag?: string;
  PostalServiceId?: string;
  PaymentMethodId?: string;
  Site?: string;
  AutomaticallyLinkBySKU?: boolean;
}

export interface CreateOrderResult {
  pkOrderId: string;
  referenceNumber: string;
  success: boolean;
  error?: string;
}

export interface LinnworksOrderInfo {
  pkOrderId: string;
  referenceNumber: string;
  status: number;
  invoicePrinted: boolean;
  labelPrinted: boolean;
  processed: boolean;
}

export interface LinnworksClient {
  createOrders(orders: LinnworksOrderPayload[]): Promise<CreateOrderResult[]>;
  getOrdersById(pkOrderIds: string[]): Promise<LinnworksOrderInfo[]>;
  getProcessedOrderIds(pkOrderIds: string[]): Promise<string[]>;
  unparkOrder(pkOrderId: string): Promise<boolean>;
}
