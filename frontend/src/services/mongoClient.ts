/**
 * In-Memory Database Service (Production Safe)
 * REMOVED all browser localStorage persistence to prevent sensitive data exposure.
 */

class MongoCollection<T extends { _id: string }> {
  private collectionName: string;
  private inMemoryData: T[] = [];

  constructor(name: string) {
    this.collectionName = name;
  }

  async find(query: Partial<T> = {}): Promise<T[]> {
    return this.inMemoryData.filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  async findOne(query: Partial<T>): Promise<T | null> {
    const results = await this.find(query);
    return results[0] || null;
  }

  async insertOne(doc: Omit<T, '_id'>): Promise<T> {
    const newDoc = {
      ...doc,
      _id: `657f${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as unknown as T;
    this.inMemoryData.push(newDoc);
    return newDoc;
  }

  async updateOne(query: Partial<T>, updates: Partial<T>): Promise<boolean> {
    const index = this.inMemoryData.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index !== -1) {
      this.inMemoryData[index] = { ...this.inMemoryData[index], ...updates, updatedAt: new Date().toISOString() };
      return true;
    }
    return false;
  }

  async deleteOne(query: Partial<T>): Promise<boolean> {
    const index = this.inMemoryData.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index !== -1) {
      this.inMemoryData.splice(index, 1);
      return true;
    }
    return false;
  }

  seed(docs: Omit<T, '_id'>[]): void {
    // In-memory seeding only (No LocalStorage)
    docs.forEach(doc => {
      const exists = this.inMemoryData.some((item: any) => {
        if ((doc as any).username && item.username === (doc as any).username && item.role === (doc as any).role) return true;
        return false;
      });
      if (!exists) {
        this.inMemoryData.push({
          ...doc,
          _id: `657f${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as unknown as T);
      }
    });
  }
}

export const db = {
  users: new MongoCollection<any>('users'),
  requests: new MongoCollection<any>('requests'),
  hospitals: new MongoCollection<any>('hospitals'),
  stocks: new MongoCollection<any>('stocks'),
  feedback: new MongoCollection<any>('feedback'),
  messages: new MongoCollection<any>('messages'),
  logs: new MongoCollection<any>('security_logs'),
  keys: new MongoCollection<any>('emergency_keys'),
  appointments: new MongoCollection<any>('appointments'),
  certificates: new MongoCollection<any>('certificates'),
  campaigns: new MongoCollection<any>('campaigns')
};

// Cleanup any legacy database keys in browser LocalStorage
export function clearLegacyLocalStorageCollections() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const legacyKeys = [
    'mongodb_collection_users',
    'mongodb_collection_stocks',
    'mongodb_collection_requests',
    'mongodb_collection_hospitals',
    'mongodb_collection_feedback',
    'mongodb_collection_messages',
    'mongodb_collection_security_logs',
    'mongodb_collection_emergency_keys',
    'mongodb_collection_appointments',
    'mongodb_collection_certificates',
    'mongodb_collection_campaigns',
    'bloodbank_storage_mode'
  ];
  legacyKeys.forEach(key => {
    localStorage.removeItem(key);
  });
}
