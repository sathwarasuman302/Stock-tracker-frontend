import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function TradingHeader() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			// Navigate to stocks page with search
			navigate(`/stocks?search=${encodeURIComponent(searchQuery)}`);
		}
	};

	return (
		<header className="trading-header">
			<div className="trading-header__container">
				<div className="trading-header__left">
					<div className="trading-header__logo">
						<div className="trading-header__logo-icon">📊</div>
						<span className="trading-header__logo-text">
							Stock Tracker
						</span>
					</div>
				</div>

				<form className="trading-header__search" onSubmit={handleSearch}>
					<input
						type="text"
						className="trading-header__search-input"
						placeholder="Search for Stocks, F&O, Indices etc."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</form>

				<div className="trading-header__right">
					<button className="trading-header__auth-btn">
						{t("login")} / {t("signup")}
					</button>
				</div>
			</div>
		</header>
	);
}

export default TradingHeader;
