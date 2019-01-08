import LicensingService, { Features, FingerprintType, LicenseInfo, LicenseStatus } from 'common/licensing-service'
import { injectable } from 'inversify'

@injectable()
export default class CELicensingService implements LicensingService {
  installProtection(): void {}

  refreshLicenseKey(): Promise<boolean> {
    throw new Error('Not implemented')
  }

  replaceLicenseKey(): Promise<boolean> {
    throw new Error('Not implemented')
  }

  async getLicenseStatus(): Promise<LicenseStatus> {
    return {
      breachReasons: [],
      status: 'licensed'
    }
  }

  getLicenseKey(): Promise<string> {
    throw new Error('Not implemented')
  }

  getFingerprint(fingerprintType: FingerprintType): Promise<string> {
    throw new Error('Not implemented')
  }

  getLicenseInfo(): Promise<LicenseInfo> {
    throw new Error('Not implemented')
  }

  assertFeatureLicensed(feature: Features): void {
    throw new Error('Method not implemented.')
  }

  setFeatureValue(feature: Features, value: number): void {
    throw new Error('Method not implemented.')
  }
}
