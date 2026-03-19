import { SharedIndividualReport, SharedIndividualReportConfig } from "@/components/shared/SharedIndividualReport";

const adminConfig: SharedIndividualReportConfig = {
  candidatesEndpoint: '/api/admin/candidates',
  reportEndpoint: '/api/admin/compare',
  contextType: 'admin',
};

export default function IndividualReportTab() {
  return <SharedIndividualReport config={adminConfig} />;
}
