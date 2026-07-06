
type Callback = (data: any) => void;

class RealTimeService {
  private listeners: { [event: string]: Callback[] } = {};

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === 'lifeflow_realtime_event' && event.newValue) {
        try {
          const { type, data } = JSON.parse(event.newValue);
          this.triggerLocal(type, data);
        } catch (e) {
          console.error("Realtime sync error", e);
        }
      }
    });
  }

  on(event: string, callback: Callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data: any) {
    this.triggerLocal(event, data);
    localStorage.setItem('lifeflow_realtime_event', JSON.stringify({
      type: event,
      data,
      timestamp: Date.now()
    }));
  }

  private triggerLocal(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

export const realtime = new RealTimeService();
