import { SharedIndividualReport, SharedIndividualReportConfig } from "@/components/shared/SharedIndividualReport";

const adminConfig: SharedIndividualReportConfig = {
  candidatesEndpoint: '/api/admin/candidates',
  reportEndpoint: '/api/admin/compare',
  profileInsightsEndpoint: '/api/admin/profile-insights',
  contextType: 'admin',
};

export default function IndividualReportTab() {
  return <SharedIndividualReport config={adminConfig} />;
}
