
/**
 * Simulated Cloud Engine (Firebase Mimic)
 * Provides a localized version of Firestore and Firebase Auth for demo environments.
 */

class MockStore {
  private getTable(name: string): any[] {
    const data = localStorage.getItem(`bloodbank_db_${name}`);
    return data ? JSON.parse(data) : [];
  }

  private setTable(name: string, data: any[]) {
    localStorage.setItem(`bloodbank_db_${name}`, JSON.stringify(data));
  }

  // Firestore Mock methods
  collection(name: string) {
    return {
      name,
      getDocs: async () => ({
        docs: this.getTable(name).map(d => ({ 
          id: d._id, 
          data: () => d,
          exists: () => true 
        }))
      }),
      addDoc: async (docData: any) => {
        const table = this.getTable(name);
        const newDoc = { ...docData, _id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
        table.push(newDoc);
        this.setTable(name, table);
        return { id: newDoc._id };
      }
    };
  }

  doc(collName: string, id: string) {
    return {
      id,
      get: async () => {
        const item = this.getTable(collName).find(i => i._id === id);
        return { 
          exists: () => !!item, 
          data: () => item,
          id
        };
      },
      set: async (data: any) => {
        const table = this.getTable(collName);
        const idx = table.findIndex(i => i._id === id);
        if (idx !== -1) table[idx] = { ...table[idx], ...data, _id: id };
        else table.push({ ...data, _id: id });
        this.setTable(collName, table);
      },
      update: async (data: any) => {
        const table = this.getTable(collName);
        const idx = table.findIndex(i => i._id === id);
        if (idx !== -1) {
          table[idx] = { ...table[idx], ...data };
          this.setTable(collName, table);
        }
      },
      delete: async () => {
        const table = this.getTable(collName);
        this.setTable(collName, table.filter(i => i._id !== id));
      }
    };
  }
}

class MockAuth {
  private currentUser: any = null;
  private listeners: ((user: any) => void)[] = [];

  constructor() {
    const saved = localStorage.getItem('bloodbank_auth_session');
    if (saved) this.currentUser = JSON.parse(saved);
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentUser));
  }

  async signInWithEmailAndPassword(email: string, pass: string) {
    const users = JSON.parse(localStorage.getItem('bloodbank_db_users') || '[]');
    const user = users.find((u: any) => (u.email === email || `${u.username}@bloodbank.com` === email));
    
    if (user && pass) { // In mock, we accept any password for valid usernames
      this.currentUser = { uid: user._id, email };
      localStorage.setItem('bloodbank_auth_session', JSON.stringify(this.currentUser));
      this.notify();
      return { user: this.currentUser };
    }
    throw new Error("auth/user-not-found");
  }

  async createUserWithEmailAndPassword(email: string, pass: string) {
    const uid = Math.random().toString(36).substr(2, 9);
    this.currentUser = { uid, email };
    localStorage.setItem('bloodbank_auth_session', JSON.stringify(this.currentUser));
    this.notify();
    return { user: this.currentUser };
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('bloodbank_auth_session');
    this.notify();
  }

  get authUser() { return this.currentUser; }
}

// Export mimics of the Firebase SDK
export const dbEngine = new MockStore();
export const authEngine = new MockAuth();

// Functional exports to match Modular SDK style
export const collection = (db: any, name: string) => db.collection(name);
export const doc = (db: any, coll: string, id: string) => db.doc(coll, id);
export const getDoc = async (d: any) => d.get();
export const getDocs = async (c: any) => c.getDocs();
export const addDoc = async (c: any, data: any) => c.addDoc(data);
export const updateDoc = async (d: any, data: any) => d.update(data);
export const setDoc = async (d: any, data: any) => d.set(data);
export const deleteDoc = async (d: any) => d.delete();
export const query = (c: any, ...args: any[]) => c; // Simple mock
export const where = (field: string, op: string, val: any) => ({ field, op, val });
export const orderBy = (field: string, dir: string) => ({ field, dir });

export const signInWithEmailAndPassword = async (auth: any, email: string, pass: string) => auth.signInWithEmailAndPassword(email, pass);
export const createUserWithEmailAndPassword = async (auth: any, email: string, pass: string) => auth.createUserWithEmailAndPassword(email, pass);
export const signOut = async (auth: any) => auth.signOut();
export const onAuthStateChanged = (auth: any, cb: any) => auth.onAuthStateChanged(cb);
export const updatePassword = async (user: any, pass: string) => true;

export const db = dbEngine;
export const auth = authEngine;
