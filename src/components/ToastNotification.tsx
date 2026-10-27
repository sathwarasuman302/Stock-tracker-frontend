import { useEffect, useState } from "react";
import "../assets/css/toast-notification.css";

export type ToastType = "success" | "info" | "warning" | "error";

interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

interface ToastContextType {
	toasts: Toast[];
	addToast: (message: string, type?: ToastType, duration?: number) => void;
	removeToast: (id: string) => void;
}

// Create context for global toast management
export const toastContext: ToastContextType = {
	toasts: [],
	addToast: () => {},
	removeToast: () => {},
};

interface ToastNotificationProps {
	message: string;
	type?: ToastType;
	duration?: number;
	onClose?: () => void;
}

export function ToastNotification({
	message,
	type = "info",
	duration = 3000,
	onClose,
}: ToastNotificationProps) {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		if (duration === 0) return; // Don't auto-close

		const timer = setTimeout(() => {
			setIsVisible(false);
			onClose?.();
		}, duration);

		return () => clearTimeout(timer);
	}, [duration, onClose]);

	if (!isVisible) return null;

	return (
		<div className={`toast-notification toast-${type}`}>
			<div className="toast-content">
				<span className="toast-icon">
					{type === "success" && "✓"}
					{type === "error" && "✕"}
					{type === "warning" && "⚠"}
					{type === "info" && "ℹ"}
				</span>
				<span className="toast-message">{message}</span>
			</div>
		</div>
	);
}

interface ToastContainerProps {
	toasts: Toast[];
	onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
	return (
		<div className="toast-container">
			{toasts.map((toast) => (
				<ToastNotification
					key={toast.id}
					message={toast.message}
					type={toast.type}
					duration={toast.duration}
					onClose={() => onRemove(toast.id)}
				/>
			))}
		</div>
	);
}

/**
 * Hook to manage toasts in components
 */
export function useToast() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = (
		message: string,
		type: ToastType = "info",
		duration: number = 3000
	) => {
		const id = `${Date.now()}-${Math.random()}`;
		setToasts((prev) => [...prev, { id, message, type, duration }]);
	};

	const removeToast = (id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	return { toasts, addToast, removeToast };
}
