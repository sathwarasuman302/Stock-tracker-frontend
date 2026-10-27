import { useState } from "react";

interface RightSidePanelItem {
	id: string;
	icon: string;
	label: string;
	onClick?: () => void;
}

const PANEL_ITEMS: RightSidePanelItem[] = [
	{ id: "chain", icon: "⛓️", label: "Chain" },
	{ id: "orders", icon: "📋", label: "Orders" },
	{ id: "watchlist", icon: "⭐", label: "Watchlist" },
	{ id: "depth", icon: "📊", label: "Depth" },
	{ id: "holdings", icon: "💼", label: "Holdings" },
	{ id: "layout", icon: "⚙️", label: "Layout" },
];

interface RightSidePanelProps {
	onItemClick?: (itemId: string) => void;
}

function RightSidePanel({ onItemClick }: RightSidePanelProps) {
	const [activeItem, setActiveItem] = useState<string | null>(null);

	const handleItemClick = (itemId: string) => {
		setActiveItem(activeItem === itemId ? null : itemId);
		onItemClick?.(itemId);
	};

	return (
		<aside className="right-side-panel">
			{PANEL_ITEMS.map((item) => (
				<button
					key={item.id}
					className={`right-side-panel__item ${
						activeItem === item.id ? "is-active" : ""
					}`}
					onClick={() => handleItemClick(item.id)}
					title={item.label}
				>
					<span className="right-side-panel__icon">
						{item.icon}
					</span>
					<span className="right-side-panel__label">
						{item.label}
					</span>
				</button>
			))}
		</aside>
	);
}

export default RightSidePanel;
