import { createContext } from "svelte";

export interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

class Toaster {
  toasts: Toast[] = $state([]);
  #nextId = 0;
  #timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string) {
    const id = this.#nextId++;
    this.toasts.push({ id, type: "success", message });
    const timer = setTimeout(() => this.dismiss(id), 5000);
    this.#timers.set(id, timer);
  }

  // Errors are sticky — no auto-dismiss timer.
  error(message: string) {
    const id = this.#nextId++;
    this.toasts.push({ id, type: "error", message });
  }

  dismiss(id: number) {
    const timer = this.#timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.#timers.delete(id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  destroy() {
    for (const timer of this.#timers.values()) {
      clearTimeout(timer);
    }
    this.#timers.clear();
    this.toasts = [];
  }
}

export const toaster = new Toaster(); // singleton
export const [getToaster, setToaster] = createContext<Toaster>();
