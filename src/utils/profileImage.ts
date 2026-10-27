export const createProfileImageDataUrl = async (file: File): Promise<string> => {
	if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
		throw new Error("Choose a JPG, PNG, or WebP image.");
	}
	if (file.size > 8 * 1024 * 1024) {
		throw new Error("Choose an image smaller than 8 MB.");
	}

	const bitmap = await createImageBitmap(file);
	try {
		if (
			bitmap.width > 8192 ||
			bitmap.height > 8192 ||
			bitmap.width * bitmap.height > 40_000_000
		) {
			throw new Error("Choose an image with dimensions smaller than 8,192 × 8,192 pixels.");
		}
		const size = Math.min(bitmap.width, bitmap.height, 256);
		const sourceX = (bitmap.width - size) / 2;
		const sourceY = (bitmap.height - size) / 2;
		for (const dimension of [256, 192, 128]) {
			const canvas = document.createElement("canvas");
			canvas.width = dimension;
			canvas.height = dimension;
			const context = canvas.getContext("2d");
			if (!context) throw new Error("The profile photo could not be processed.");
			context.drawImage(bitmap, sourceX, sourceY, size, size, 0, 0, dimension, dimension);
			for (const quality of [0.82, 0.68, 0.54, 0.4]) {
				const dataUrl = canvas.toDataURL("image/jpeg", quality);
				if (dataUrl.length <= 160_000) return dataUrl;
			}
		}
		throw new Error("The selected image could not be compressed. Please choose another photo.");
	} finally {
		bitmap.close();
	}
};
