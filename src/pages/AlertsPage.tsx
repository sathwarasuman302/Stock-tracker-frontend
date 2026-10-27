	import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";

function AlertsPage() {
	const { t } = useTranslation("common");

	return (
		<PageShell title={t("alerts")} lead={t("alertsLead")}>
			<ul className="jp-job-list">
				<li className="jp-job-row">
					<div className="jp-job-row__main">
						<span className="jp-job-row__title">RELIANCE</span>
						<span className="jp-job-row__meta">Above ₹2,500</span>
					</div>
				</li>
				<li className="jp-job-row">
					<div className="jp-job-row__main">
						<span className="jp-job-row__title">TCS</span>
						<span className="jp-job-row__meta">Below ₹3,900</span>
					</div>
				</li>
			</ul>
		</PageShell>
	);
}

export default AlertsPage;
