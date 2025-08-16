const DB_NAME = 'StuBroImageCache';
const DB_VERSION = 1;
const STORE_NAME = 'generatedImages';

let db: IDBDatabase | null = null;

// Simple hash function for creating a key from a string prompt
const hashPrompt = async (prompt: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(prompt); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
};

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening DB');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBOpenDBRequest).result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                tempDb.createObjectStore(STORE_NAME);
            }
        };
    });
};

export const saveImage = async (prompt: string, imageBytes: string): Promise<void> => {
    try {
        const dbInstance = await initDB();
        const key = await hashPrompt(prompt);
        
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(imageBytes, key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Failed to save image to IndexedDB:", error);
        // Fail silently so the app can continue
    }
};

export const getImage = async (prompt: string): Promise<string | null> => {
    try {
        const dbInstance = await initDB();
        const key = await hashPrompt(prompt);

        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Failed to retrieve image from IndexedDB:", error);
        return null; // Return null if DB fails
    }
};
