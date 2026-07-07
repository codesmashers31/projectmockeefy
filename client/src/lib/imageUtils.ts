import { API_BASE_URL } from '../config';

/**
 * Generates the full profile image URL.
 * 
 * @param path - The image path from the database (e.g., "/uploads/..." or "http://...")
 * @returns The full URL to the image, or a default fallback if invalid.
 */
export const getProfileImageUrl = (path?: string | null): string => {
    if (!path) {
        return '/mockeefy.png';
    }

    // If it's already a full URL (including UI avatars or external links), return it
    if (path.startsWith('http')) {
        // Cloudinary or external URLs should be returned as-is
        if (path.includes('cloudinary.com') || path.includes('ui-avatars.com')) {
            return path;
        }

        // Legacy local uploads (if any exist) might need rebasing, but usually not needed for Cloudinary
        if (path.includes('/uploads/')) {
            const relativePath = path.substring(path.indexOf('/uploads/'));
            return `${API_BASE_URL}${relativePath}`;
        }
        return path;
    }

    // If it's a relative path (starts with /), append to API_BASE_URL
    if (path.startsWith('/')) {
        return `${API_BASE_URL}${path}`;
    }

    // Fallback for unexpected formats, try to treat as relative path
    return `${API_BASE_URL}/${path}`;
};

/**
 * Compresses an image file client-side before upload to speed up network transfer.
 * If the file is not an image, it returns the original file untouched.
 */
export const compressImage = (file: File, maxWidth = 600, quality = 0.5): Promise<File> => {
    return new Promise((resolve) => {
        if (!file || !file.type || typeof file.type !== "string" || !file.type.startsWith("image/")) {
            // Non-image files (e.g. PDF/DOCX govt ID verification files) cannot be compressed via canvas
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Scale dimensions if larger than maxWidth
                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                type: "image/jpeg",
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    "image/jpeg",
                    quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};
