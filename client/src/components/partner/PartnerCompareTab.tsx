import { SharedCompareTab, SharedCompareTabConfig } from "@/components/shared/SharedCompareTab";

const partnerConfig: SharedCompareTabConfig = {
  candidatesEndpoint: '/api/partner/me/candidates',
  rolesEndpoint: '/api/partner/me/roles',
  compareEndpoint: '/api/partner/me/compare',
  contextType: 'partner',
};

export default function PartnerCompareTab() {
  return <SharedCompareTab config={partnerConfig} />;
}
