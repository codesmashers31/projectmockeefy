import { toast } from "sonner";

/**
 * Centralized Notification Manager for Mockeefy.
 * - Prevents toast collisions and duplicate event spam
 * - Stacks notifications with clean vertical spacing (expand=true)
 * - Deduplicates identical notifications arriving within a 3-second window
 * - Supports responsive mobile and desktop viewports
 */
const recentToastTimestamps = new Map<string, number>();

export interface NotifyOptions {
  description?: string;
  id?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

export const notify = {
  show: (title: string, options?: NotifyOptions) => {
    if (!title) return;
    const key = options?.id || `${title}_${options?.description || ''}`;
    const now = Date.now();
    const lastShown = recentToastTimestamps.get(key);

    // Suppress rapid duplicates within 3000ms
    if (lastShown && now - lastShown < 3000) {
      return;
    }
    recentToastTimestamps.set(key, now);

    // Clean up cache entry after duration
    setTimeout(() => {
      if (recentToastTimestamps.get(key) === now) {
        recentToastTimestamps.delete(key);
      }
    }, (options?.duration || 4500) + 1000);

    const type = options?.type || 'info';
    const toastFn = toast[type] || toast.info;

    toastFn(title, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration || 4500,
    });
  },

  success: (title: string, description?: string, id?: string) => {
    notify.show(title, { description, id, type: 'success' });
  },

  info: (title: string, description?: string, id?: string) => {
    notify.show(title, { description, id, type: 'info' });
  },

  error: (title: string, description?: string, id?: string) => {
    notify.show(title, { description, id, type: 'error' });
  },

  warning: (title: string, description?: string, id?: string) => {
    notify.show(title, { description, id, type: 'warning' });
  },

  dismiss: (id?: string) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  }
};
