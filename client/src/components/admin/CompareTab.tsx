import { SharedCompareTab, SharedCompareTabConfig } from "@/components/shared/SharedCompareTab";

const adminConfig: SharedCompareTabConfig = {
  candidatesEndpoint: '/api/admin/candidates',
  rolesEndpoint: '/api/admin/roles',
  compareEndpoint: '/api/admin/compare',
  contextType: 'admin',
};

export default function CompareTab() {
  return <SharedCompareTab config={adminConfig} />;
}
