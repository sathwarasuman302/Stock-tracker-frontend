import { type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";

function AddStockPage() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		navigate("/portfolio/dashboard");
	};

	return (
		<PageShell title={t("addStock")} lead={t("addStockLead")}>
			<form className="jp-form jp-form--narrow" onSubmit={handleSubmit}>
				<label className="jp-field">
					<span>{t("stockSymbol")}</span>
					<input type="text" name="symbol" required placeholder="RELIANCE" />
				</label>
				<label className="jp-field">
					<span>{t("stockExchange")}</span>
					<input type="text" name="exchange" required placeholder="NSE" />
				</label>
				<button className="jp-btn jp-btn--primary" type="submit">
					{t("addStock")}
				</button>
			</form>
		</PageShell>
	);
}

export default AddStockPage;
