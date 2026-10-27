/* eslint-disable */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./translations/en/common.json";
import enInvestor from "./translations/en/investor.json";
import hiCommon from "./translations/hi/common.json";
import hiInvestor from "./translations/hi/investor.json";

i18n
	.use(initReactI18next)
	.init({
		resources: {
			en: {
				common: enCommon,
				investor: enInvestor,
			},
			hi: {
				common: hiCommon,
				investor: hiInvestor,
			},
		},
		lng: "en",
		fallbackLng: "en",
		ns: ["common", "investor"],
		defaultNS: "common",
		interpolation: {
			escapeValue: false,
		},
		react: {
			useSuspense: false,
		},
	});

export default i18n;
