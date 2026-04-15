import api from '../api';
import { db, clearSyncItem } from '../db';
import { toastSuccess, toastError } from '../utils/swal';

class SyncService {
    constructor() {
        this.isSyncing = false;
        this.listeners = [];
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(stats) {
        this.listeners.forEach(cb => cb(stats));
    }

    async getStats() {
        const pendingCount = await db.sync_queue.count();
        const isOnline = navigator.onLine;
        return { pendingCount, isOnline, isSyncing: this.isSyncing };
    }

    async sync() {
        if (this.isSyncing || !navigator.onLine) return;

        const queue = await db.sync_queue.toArray();
        if (queue.length === 0) return;

        this.isSyncing = true;
        this.notifyListeners(await this.getStats());

        console.log(`[SyncService] Starting sync for ${queue.length} items...`);

        for (const item of queue) {
            try {
                if (item.table === 'orders') {
                    await api.post('/sales', item.data);
                    await db.orders.update(item.data.uuid, { synced: 1 });
                } else if (item.table === 'products') {
                    const formData = new FormData();
                    Object.keys(item.data).forEach(key => {
                        if (key === 'image_blob' && item.data[key]) {
                            formData.append('image', item.data[key], 'product.jpg');
                        } else if (item.data[key] !== null) {
                            formData.append(key, item.data[key]);
                        }
                    });

                    await api.post('/products', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
                
                await clearSyncItem(item.id);
            } catch (err) {
                console.error(`[SyncService] Failed to sync item ${item.id}:`, err);
                if (!navigator.onLine) break;
            }
        }

        this.isSyncing = false;
        const stats = await this.getStats();
        this.notifyListeners(stats);
        
        if (stats.pendingCount === 0) {
            toastSuccess('تمت مزامنة جميع البيانات بنجاح! 🔄');
        }
    }

    // Auto-sync setup
    startAutoSync() {
        window.addEventListener('online', () => this.sync());
        setInterval(() => this.sync(), 30000); // Check every 30s
    }
}

const syncServiceInstance = new SyncService();
export default syncServiceInstance;
