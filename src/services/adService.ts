import { GlobalAdConfig, AdProviderName, AdSlotPlacement, AdSlotConfig } from '../types/ads';
import adsConfigData from '../data/adsConfig.json';

class AdService {
  private config: GlobalAdConfig = adsConfigData as GlobalAdConfig;
  private consentGiven: boolean = false;

  constructor() {
    this.checkConsent();
  }

  public checkConsent(): boolean {
    if (typeof window === 'undefined') return false;
    const consent = localStorage.getItem('global_arcade_cookie_consent');
    this.consentGiven = consent === 'accepted';
    return this.consentGiven;
  }

  public setConsent(accepted: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('global_arcade_cookie_consent', accepted ? 'accepted' : 'declined');
    this.consentGiven = accepted;
  }

  public isAdsEnabled(): boolean {
    return this.config.adsEnabled;
  }

  public isDevMockMode(): boolean {
    return this.config.devMockMode || import.meta.env.DEV;
  }

  public getSlotConfig(placement: AdSlotPlacement): AdSlotConfig | undefined {
    return this.config.slots[placement];
  }

  public isProviderEnabled(provider: AdProviderName): boolean {
    return this.config.providers[provider]?.enabled ?? false;
  }

  public getActiveProvider(placement: AdSlotPlacement): AdProviderName {
    const slot = this.config.slots[placement];
    if (slot && this.isProviderEnabled(slot.activeProvider)) {
      return slot.activeProvider;
    }
    return this.config.activeDefaultProvider;
  }

  public getPublisherId(provider: AdProviderName): string {
    return this.config.providers[provider]?.publisherId || '';
  }
}

export const adService = new AdService();
