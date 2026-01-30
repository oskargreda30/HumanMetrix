import { SharedCompareTab, SharedCompareTabConfig } from "@/components/shared/SharedCompareTab";

const partnerConfig: SharedCompareTabConfig = {
  candidatesEndpoint: '/api/partner/me/candidates',
  rolesEndpoint: '/api/partner/me/roles',
  compareEndpoint: '/api/partner/me/compare',
  insightsEndpoint: '/api/partner/me/compare-insights',
  contextType: 'partner',
};

export default function PartnerCompareTab() {
  return <SharedCompareTab config={partnerConfig} />;
}
