import { API_BASE_URL } from '../config';

const REAL_AVATAR_POOL = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34
];

/**
 * Returns a stable, deterministic real human avatar photo from public/media/avatars/
 */
export const getDeterministicAvatar = (seed?: string | null): string => {
    if (!seed || typeof seed !== 'string') {
        return '/media/avatars/300-1.png';
    }
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const avatarId = REAL_AVATAR_POOL[hash % REAL_AVATAR_POOL.length];
    return `/media/avatars/300-${avatarId}.png`;
};

/**
 * Generates the full profile image URL.
 * Automatically resolves ui-avatars.com or missing avatars to real high-resolution headshots.
 * 
 * @param path - The image path from the database (e.g., "/uploads/..." or "http://...")
 * @param seed - Optional identifier (e.g., mentor name or ID) for stable photo mapping
 * @returns The full URL to the image, or a real professional photo fallback.
 */
export const getProfileImageUrl = (path?: string | null, seed?: string | null): string => {
    // Check if path is empty or a placeholder / text avatar generator
    const isPlaceholder =
        !path ||
        path.includes('ui-avatars.com') ||
        path.includes('default-avatar.png') ||
        path.includes('blank.png') ||
        path.includes('mockeefy.png');

    if (isPlaceholder) {
        let nameSeed = seed;
        if (!nameSeed && path && path.includes('name=')) {
            const match = path.match(/name=([^&]+)/);
            if (match && match[1]) {
                nameSeed = decodeURIComponent(match[1].replace(/\+/g, ' '));
            }
        }
        return getDeterministicAvatar(nameSeed || path || seed);
    }

    // Blob URLs or Base64 data URLs
    if (path.startsWith('blob:') || path.startsWith('data:')) {
        return path;
    }

    // If it's already a full URL (Cloudinary or valid external image)
    if (path.startsWith('http')) {
        if (path.includes('cloudinary.com')) {
            return path;
        }

        // Legacy local uploads
        if (path.includes('/uploads/')) {
            const relativePath = path.substring(path.indexOf('/uploads/'));
            return `${API_BASE_URL}${relativePath}`;
        }
        return path;
    }

    // If it's already pointing to a local public media path
    if (path.startsWith('/media/') || path.startsWith('/images/')) {
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

/**
 * Compresses the full original image file before upload (preserving high resolution up to 1920px
 * and high quality 0.85) to optimize network speed while ensuring crystal clear re-crops later.
 */
export const compressOriginalImage = (file: File): Promise<File> => {
    return compressImage(file, 1920, 0.85);
};
