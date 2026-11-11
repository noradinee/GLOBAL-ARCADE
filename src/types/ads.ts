export type AdProviderName =
  | 'adsense'
  | 'adsterra'
  | 'monetag'
  | 'medianet'
  | 'hilltopads';

export type AdSlotPlacement =
  | 'header-top'
  | 'sidebar'
  | 'below-game'
  | 'in-feed'
  | 'game-sidebar'
  | 'interstitial';

export interface AdProviderConfig {
  enabled: boolean;
  publisherId: string;
  testMode: boolean;
  priority: number; // 1 to 5 for waterfall/bidding priority
}

export interface AdSlotConfig {
  id: string;
  placement: AdSlotPlacement;
  activeProvider: AdProviderName;
  desktopSize: [number, number];
  mobileSize: [number, number];
  refreshIntervalSeconds?: number;
  responsive: boolean;
}

export interface GlobalAdConfig {
  adsEnabled: boolean;
  devMockMode: boolean; // displays cleanly styled placeholder slots during development
  gdprConsentRequired: boolean;
  activeDefaultProvider: AdProviderName;
  providers: Record<AdProviderName, AdProviderConfig>;
  slots: Record<AdSlotPlacement, AdSlotConfig>;
}
