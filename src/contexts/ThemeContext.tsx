import {
	createContext,
	useCallback,
	useContext,
	useLayoutEffect,
	useState,
	type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
	theme: Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "stock-tracker-theme";

const getInitialTheme = (): Theme => {
	try {
		return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
	} catch {
		return "light";
	}
};

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	useLayoutEffect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.style.colorScheme = theme;
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			// The theme remains active for this page when storage is unavailable.
		}
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light");
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used within a ThemeProvider.");
	return context;
}
