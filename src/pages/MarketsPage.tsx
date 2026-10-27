import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";
import { markets } from "../data/stocks";
import {
	formatSessionHours,
	isMarketOpen,
	marketSessions,
} from "../utils/marketStatus";

function MarketsPage() {
	const { t } = useTranslation("common");
	const [, setTick] = useState(0);

	useEffect(() => {
		const timer = window.setInterval(() => setTick((value) => value + 1), 30000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<PageShell title={t("marketStatus")} lead={t("marketStatusLead")}>
			<ul className="jp-job-list">
				{markets.map((market) => {
					const session = marketSessions[market.id];
					const open = session ? isMarketOpen(session) : false;
					return (
						<li key={market.id} className="jp-job-row">
							<div className="jp-job-row__main">
								<span className="jp-job-row__title">
									{t(market.nameKey)}
								</span>
								<span className="jp-job-row__meta">
									{t(market.descKey)}
									{session
										? ` · ${formatSessionHours(session)} ${session.timeZone.replace("_", " ")}`
										: ""}
								</span>
							</div>
							<span
								className={`jp-status ${open ? "jp-status--open" : "jp-status--closed"}`}
							>
								{open ? t("marketOpen") : t("marketClosed")}
							</span>
						</li>
					);
				})}
			</ul>
		</PageShell>
	);
}

export default MarketsPage;
