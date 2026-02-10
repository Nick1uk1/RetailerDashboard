export type PricesSource = 'PORTAL' | 'LINNWORKS';
export type TaxMode = 'INCLUSIVE' | 'EXCLUSIVE';
export type OrderUnits = 'CASES_ONLY' | 'EACHES_ALLOWED';

export interface AppConfig {
  pricesSource: PricesSource;
  taxMode: TaxMode;
  orderUnits: OrderUnits;
  magicLinkExpiryMinutes: number;
  sessionExpiryDays: number;
  appUrl: string;
  isLinnworksMocked: boolean;
  minimumOrderValue: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string): string | undefined {
  const value = process.env[key];
  return value === '' ? undefined : value;
}

export function getConfig(): AppConfig {
  const pricesSource = getEnvVar('PRICES_SOURCE', 'PORTAL') as PricesSource;
  const taxMode = getEnvVar('TAX_MODE', 'INCLUSIVE') as TaxMode;
  const orderUnits = getEnvVar('ORDER_UNITS', 'CASES_ONLY') as OrderUnits;

  // Validate enum values
  if (!['PORTAL', 'LINNWORKS'].includes(pricesSource)) {
    throw new Error(`Invalid PRICES_SOURCE: ${pricesSource}`);
  }
  if (!['INCLUSIVE', 'EXCLUSIVE'].includes(taxMode)) {
    throw new Error(`Invalid TAX_MODE: ${taxMode}`);
  }
  if (!['CASES_ONLY', 'EACHES_ALLOWED'].includes(orderUnits)) {
    throw new Error(`Invalid ORDER_UNITS: ${orderUnits}`);
  }

  // Check if Linnworks should be mocked
  const linnworksAppId = getOptionalEnvVar('LINNWORKS_APP_ID');
  const linnworksAppSecret = getOptionalEnvVar('LINNWORKS_APP_SECRET');
  const linnworksInstallToken = getOptionalEnvVar('LINNWORKS_INSTALL_TOKEN');
  const isLinnworksMocked = !linnworksAppId || !linnworksAppSecret || !linnworksInstallToken;

  return {
    pricesSource,
    taxMode,
    orderUnits,
    magicLinkExpiryMinutes: parseInt(getEnvVar('MAGIC_LINK_EXPIRY_MINUTES', '15'), 10),
    sessionExpiryDays: parseInt(getEnvVar('SESSION_EXPIRY_DAYS', '7'), 10),
    appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000').trim(),
    isLinnworksMocked,
    minimumOrderValue: parseFloat(getEnvVar('MINIMUM_ORDER_VALUE', '250')),
  };
}

// Singleton config instance
let configInstance: AppConfig | null = null;

export function config(): AppConfig {
  if (!configInstance) {
    configInstance = getConfig();
  }
  return configInstance;
}
