/**
 * MongoDB Client Simulation
 * Mimics the MongoDB Node.js Driver API (find, insertOne, updateOne, etc.)
 * This provides the exact structure needed to move to a real MongoDB Atlas backend.
 */

class MongoCollection<T extends { _id: string }> {
  private collectionName: string;

  constructor(name: string) {
    this.collectionName = `mongodb_collection_${name}`;
  }

  private getData(): T[] {
    const data = localStorage.getItem(this.collectionName);
    return data ? JSON.parse(data) : [];
  }

  private saveData(data: T[]): void {
    localStorage.setItem(this.collectionName, JSON.stringify(data));
  }

  async find(query: Partial<T> = {}): Promise<T[]> {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 150));
    const data = this.getData();
    return data.filter(item => {
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
    const data = this.getData();
    // Use unknown cast to fix overlapping type error
    const newDoc = {
      ...doc,
      _id: `657f${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`, // Simulated ObjectId
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as unknown as T;
    data.push(newDoc);
    this.saveData(data);
    return newDoc;
  }

  async updateOne(query: Partial<T>, updates: Partial<T>): Promise<boolean> {
    const data = this.getData();
    const index = data.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index !== -1) {
      data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveData(data);
      return true;
    }
    return false;
  }

  async deleteOne(query: Partial<T>): Promise<boolean> {
    const data = this.getData();
    const index = data.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index !== -1) {
      data.splice(index, 1);
      this.saveData(data);
      return true;
    }
    return false;
  }

  seed(docs: Omit<T, '_id'>[]): void {
    const data = this.getData();
    let modified = false;
    docs.forEach(doc => {
      const exists = data.some((item: any) => {
        if ((doc as any).username && item.username === (doc as any).username && item.role === (doc as any).role) return true;
        if ((doc as any).donorName && item.donorName === (doc as any).donorName && item.type === (doc as any).type) return true;
        if ((doc as any).name && item.name === (doc as any).name && item.city === (doc as any).city) return true;
        if ((doc as any).message && item.message === (doc as any).message) return true;
        if ((doc as any).bloodGroup && item.bloodGroup === (doc as any).bloodGroup) return true;
        return false;
      });
      if (!exists) {
        data.push({
          ...doc,
          _id: `657f${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as unknown as T);
        modified = true;
      }
    });
    if (modified || data.length === 0) {
      this.saveData(data);
    }
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

// Seed Default Users
db.users.seed([
  { username: 'rajput', password: 'rajput', role: 'ADMIN', name: 'System Admin', email: 'admin@bloodbank.com', status: 'Active', is_verified: true, joinDate: '2023-10-01' },
  { username: 'anuj', password: 'singh', role: 'DONOR', name: 'Anuj Donor', email: 'anuj_donor@example.com', bloodType: 'A+', status: 'Active', is_verified: true, joinDate: '2023-10-01', phone: '+91 98765 43210', location: 'New Delhi' },
  { username: 'vikram', password: 'vikram', role: 'DONOR', name: 'Vikram Sharma', email: 'vikram.sharma@example.com', bloodType: 'O+', status: 'Active', is_verified: true, joinDate: '2024-01-15', phone: '+91 98111 22334', location: 'New Delhi' },
  { username: 'priya', password: 'priya', role: 'DONOR', name: 'Priya Patel', email: 'priya.patel@example.com', bloodType: 'B+', status: 'Active', is_verified: true, joinDate: '2024-03-10', phone: '+91 98222 33445', location: 'Mumbai' },
  { username: 'rohit', password: 'rohit', role: 'DONOR', name: 'Rohit Verma', email: 'rohit.verma@example.com', bloodType: 'AB-', status: 'Active', is_verified: true, joinDate: '2024-04-20', phone: '+91 98333 44556', location: 'Bangalore' },
  { username: 'amit', password: 'amit', role: 'DONOR', name: 'Amit Kumar', email: 'amit.kumar@example.com', bloodType: 'O-', status: 'Active', is_verified: true, joinDate: '2024-05-12', phone: '+91 98555 66778', location: 'Hyderabad' },
  { username: 'anuj', password: 'anuj', role: 'USER', name: 'Anuj User', email: 'anuj_user@example.com', bloodType: 'B-', status: 'Active', is_verified: true, joinDate: '2023-10-01', phone: '+91 99999 88888', location: 'Mumbai' },
  { username: 'sneha', password: 'sneha', role: 'USER', name: 'Sneha Gupta', email: 'sneha.gupta@example.com', bloodType: 'A-', status: 'Active', is_verified: true, joinDate: '2024-02-18', phone: '+91 98444 55667', location: 'Kolkata' }
]);

// Seed Default Blood Stocks
db.stocks.seed([
  { bloodGroup: 'O+', units: 120, maxCapacity: 500, lastUpdated: new Date().toISOString() },
  { bloodGroup: 'A+', units: 85, maxCapacity: 400, lastUpdated: new Date().toISOString() },
  { bloodGroup: 'B+', units: 95, maxCapacity: 400, lastUpdated: new Date().toISOString() },
  { bloodGroup: 'AB+', units: 45, maxCapacity: 250, lastUpdated: new Date().toISOString() },
  { bloodGroup: 'O-', units: 30, maxCapacity: 200, lastUpdated: new Date().toISOString() },
  { bloodGroup: 'A-', units: 25, maxCapacity: 200, lastUpdated: new Date().toISOString() },
  { bloodGroup: 'B-', units: 20, maxCapacity: 200, lastUpdated: new Date().toISOString() },
  { bloodGroup: 'AB-', units: 15, maxCapacity: 150, lastUpdated: new Date().toISOString() }
]);

// Seed Default Hospitals
db.hospitals.seed([
  { name: 'AIIMS Super Speciality Hospital', city: 'New Delhi', address: 'Ansari Nagar East, New Delhi', phone: '+91 11 2658 8500', email: 'aiims_blood@example.com', status: 'Active' },
  { name: 'Apollo Super Speciality Care', city: 'Mumbai', address: '66 Mathura Road, Sarita Vihar', phone: '+91 22 2692 5000', email: 'apollo_mumbai@example.com', status: 'Active' },
  { name: 'Fortis Health Center', city: 'Bangalore', address: '154/9 Bannerghatta Road', phone: '+91 80 6621 4444', email: 'fortis_blr@example.com', status: 'Active' },
  { name: 'Max Care Hospital', city: 'Kolkata', address: 'Plot No 34, Salt Lake City', phone: '+91 33 2355 6000', email: 'max_kol@example.com', status: 'Active' }
]);

// Seed Default Donation & Patient Requests
db.requests.seed([
  { donorName: 'Anuj Donor', bloodType: 'A+', type: 'Donation', status: 'Pending', date: new Date().toISOString().split('T')[0], location: 'New Delhi', phone: '+91 98765 43210', urgency: 'Medium', units: 1 },
  { donorName: 'Vikram Sharma', bloodType: 'O+', type: 'Donation', status: 'Completed', date: '2026-07-09', location: 'New Delhi', phone: '+91 98111 22334', urgency: 'Medium', units: 2 },
  { donorName: 'Priya Patel', bloodType: 'B+', type: 'Donation', status: 'Pending', date: new Date().toISOString().split('T')[0], location: 'Mumbai', phone: '+91 98222 33445', urgency: 'Medium', units: 1 },
  { donorName: 'Rohit Verma', bloodType: 'AB-', type: 'Donation', status: 'Completed', date: '2026-07-08', location: 'Bangalore', phone: '+91 98333 44556', urgency: 'Low', units: 1 },
  { donorName: 'Amit Kumar', bloodType: 'O-', type: 'Donation', status: 'Pending', date: new Date().toISOString().split('T')[0], location: 'Hyderabad', phone: '+91 98555 66778', urgency: 'Medium', units: 1 },
  { donorName: 'Sneha Gupta', bloodType: 'A-', type: 'Request', status: 'Pending', date: new Date().toISOString().split('T')[0], hospital: 'AIIMS Super Speciality Hospital', location: 'New Delhi', phone: '+91 98444 55667', urgency: 'Critical', units: 2 },
  { donorName: 'Anuj User', bloodType: 'B-', type: 'Request', status: 'Approved', date: '2026-07-09', hospital: 'Apollo Super Speciality Care', location: 'Mumbai', phone: '+91 99999 88888', urgency: 'Medium', units: 1 }
]);

// Seed Default Feedback
db.feedback.seed([
  { userId: 'donor_default', userRole: 'DONOR', message: 'I would like to organize a community blood donation drive in Delhi.', date: '2026-07-09' },
  { userId: 'user_default', userRole: 'USER', message: 'Thank you for the quick emergency key assistance!', date: '2026-07-08', reply: 'You are very welcome! Stay safe.' }
]);

// Seed Default Security Logs
db.logs.seed([
  { event: 'System initialized and DB synchronized', user: 'System Admin', ip: '127.0.0.1', severity: 'info', timestamp: new Date().toISOString() },
  { event: 'Default administrator account login verified', user: 'rajput', ip: '192.168.1.100', severity: 'info', timestamp: new Date().toISOString() },
  { event: 'Automatic inventory check completed', user: 'System Admin', ip: '127.0.0.1', severity: 'info', timestamp: new Date().toISOString() }
]);
