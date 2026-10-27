import { useTheme } from "../contexts/ThemeContext";

interface ThemeToggleProps {
	className?: string;
}

function ThemeToggle({ className = "" }: ThemeToggleProps) {
	const { theme, toggleTheme } = useTheme();
	const nextTheme = theme === "dark" ? "light" : "dark";

	return (
		<button
			type="button"
			className={`theme-toggle ${className}`.trim()}
			onClick={toggleTheme}
			aria-label={`Switch to ${nextTheme} mode`}
			aria-pressed={theme === "dark"}
			title={`Switch to ${nextTheme} mode`}
		>
			<span className="theme-toggle__icon" aria-hidden="true">
				{theme === "dark" ? "☀" : "☾"}
			</span>
			<span>{theme === "dark" ? "Light" : "Dark"}</span>
		</button>
	);
}

export default ThemeToggle;
