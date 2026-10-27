import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../assets/css/auth-layout.css";

type AuthLayoutProps = {
	title: string;
	children: ReactNode;
	footer?: ReactNode;
};

function AuthLayout({ title, children, footer }: AuthLayoutProps) {
	const { t } = useTranslation("common");

	return (
		<div className="gw-auth">
		<aside className="gw-auth__brand-panel" aria-hidden="true">
				<div className="gw-auth__pattern" />
				<div className="gw-auth__brand-content">
					<NavLink to="/" className="gw-auth__logo">
						<img
							className="gw-auth__logo-mark"
							src="/Favicon.png"
							alt="Stock Tracker"
						/>
						<span>Stock Tracker</span>
					</NavLink>
					<p className="gw-auth__tagline">
						{t("authTaglineLine1")}
					</p>
					<p className="gw-auth__tagline-accent">
						{t("authTaglineLine2")}
					</p>
					<p className="gw-auth__chip">{t("stocks")}</p>
				</div>
			</aside>

			<main className="gw-auth__form-panel">
				<div className="gw-auth__form-inner">
					<h1 className="gw-auth__title">{title}</h1>
					{children}
					{footer}
					<p className="gw-auth__legal">
						{t("authLegalPrefix")}{" "}
						<a href="#terms">{t("terms")}</a>,{" "}
						<a href="#privacy">{t("privacyPolicy")}</a> &{" "}
						<a href="#tariff">{t("tariffRates")}</a>
					</p>
				</div>
			</main>
		</div>
	);
}

export default AuthLayout;
