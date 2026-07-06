import Dexie from 'dexie';

export const db = new Dexie('pos_offline_db');

// Schema versioning
db.version(2).stores({
    products: '++id, uuid, barcode, category_id, name',
    categories: '++id, uuid, name',
    product_batches: '++id, uuid, product_id',
    customers: '++id, uuid, name, phone',
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

export const cacheProducts = async (inputData) => {
    // Handle Laravel resource wrapper (res.data.data) or direct array (res.data)
    const products = Array.isArray(inputData) ? inputData : (inputData?.data && Array.isArray(inputData.data) ? inputData.data : []);
    
    if (products.length === 0) {
        if (inputData && !Array.isArray(inputData)) console.warn('[Dexie] cacheProducts received non-array input and could not find .data wrapper.', inputData);
        return;
    }

    const validProducts = [];
    const invalidProducts = [];

    for (const p of products) {
        if (p && p.id !== undefined && p.id !== null && !isNaN(Number(p.id))) {
            validProducts.push({
                ...p,
                id: Number(p.id),
                category_id: p.category_id ? Number(p.category_id) : null
            });
        } else {
            invalidProducts.push(p);
        }
    }

    if (invalidProducts.length > 0) {
        console.error(`[Dexie] DataError: ${invalidProducts.length} products skipped due to missing or invalid 'id' field.`, invalidProducts);
    }

    if (validProducts.length === 0) return;

    return db.transaction('rw', db.products, async () => {
        await db.products.bulkPut(validProducts);
    });
};

export const cacheCategories = async (inputData) => {
    // Handle Laravel resource wrapper (res.data.data) or direct array (res.data)
    const categories = Array.isArray(inputData) ? inputData : (inputData?.data && Array.isArray(inputData.data) ? inputData.data : []);

    if (categories.length === 0) {
        if (inputData && !Array.isArray(inputData)) console.warn('[Dexie] cacheCategories received non-array input and could not find .data wrapper.', inputData);
        return;
    }

    const validCategories = [];
    const invalidCategories = [];

    for (const c of categories) {
        if (c && c.id !== undefined && c.id !== null && !isNaN(Number(c.id))) {
            validCategories.push({
                ...c,
                id: Number(c.id)
            });
        } else {
            invalidCategories.push(c);
        }
    }

    if (invalidCategories.length > 0) {
        console.error(`[Dexie] DataError: ${invalidCategories.length} categories skipped due to missing or invalid 'id' field.`, invalidCategories);
    }

    if (validCategories.length === 0) return;

    return db.transaction('rw', db.categories, async () => {
        await db.categories.bulkPut(validCategories);
    });
};

export const cacheSettings = async (inputData) => {
    if (!inputData) return;

    // Extract setting object if wrapped in Laravel resource
    const settings = inputData.data ? inputData.data : inputData;

    try {
        await db.app_cache.put({
            key: 'app_settings',
            value: settings,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error("[Dexie] Failed to cache settings:", err, settings);
    }
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

export const clearProducts = async () => {
    return db.products.clear();
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
