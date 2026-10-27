import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";

function NotFoundPage() {
	const { t } = useTranslation("common");

	return (
		<PageShell title={t("notFoundTitle")} lead={t("notFoundLead")}>
			<NavLink className="jp-btn jp-btn--primary" to="/">
				{t("home")}
			</NavLink>
		</PageShell>
	);
}

export default NotFoundPage;
