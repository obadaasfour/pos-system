import Dexie from 'dexie';

export const db = new Dexie('pos_offline_db');

// Schema versioning
db.version(1).stores({
    products: 'id, uuid, barcode, category_id, name',
    categories: 'id, uuid, name',
    product_batches: 'id, uuid, product_id',
    customers: 'id, uuid, name, phone',
    orders: 'uuid, customer_id, status, created_at',
    sync_queue: '++id, table, action, timestamp',
    app_cache: 'key' // For settings, exchange rate, etc.
});

/**
 * Image Compression Utility
 */
export const compressImage = async (file, maxWidth = 300, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * ── Helper functions for Data Persistence ─────────────────
 */

export const cacheProducts = async (products) => {
    return db.transaction('rw', db.products, async () => {
        // We use put for idempotency
        await db.products.bulkPut(products.map(p => ({
            ...p,
            id: Number(p.id),
            category_id: p.category_id ? Number(p.category_id) : null
        })));
    });
};

export const getCachedProducts = async () => {
    return db.products.toArray();
};

export const savePendingOrder = async (order) => {
    return db.transaction('rw', [db.orders, db.sync_queue, db.products], async () => {
        // 1. Save order locally
        await db.orders.put({
            ...order,
            synced: 0,
            created_at: order.created_at || new Date().toISOString()
        });

        // 2. Add to sync queue
        await db.sync_queue.add({
            table: 'orders',
            action: 'create',
            data: order,
            timestamp: Date.now()
        });

        // 3. Update local stock (optimistic update)
        for (const item of order.items) {
            const product = await db.products.get(item.product_id);
            if (product) {
                await db.products.update(item.product_id, {
                    stock_quantity: Math.max(0, product.stock_quantity - item.quantity)
                });
            }
        }
    });
};

export const getSyncQueueCount = async () => {
    return db.sync_queue.count();
};

export const clearSyncItem = async (id) => {
    return db.sync_queue.delete(id);
};

export const getSyncQueue = async () => {
    return db.sync_queue.toArray();
};
