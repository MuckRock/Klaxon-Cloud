<script module>
  interface Toast {
    id: number;
    type: "success" | "error";
    message: string;
  }

  interface Toaster {
    readonly toasts: Toast[];
    success(message: string): void;
    error(message: string): void;
    dismiss(id: number): void;
  }

  export function getToaster() {
    return getContext<Toaster>("toaster");
  }
</script>

<script lang="ts">
  import { type Snippet, getContext, setContext, onDestroy } from "svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  let nextId = 0;
  let toasts = $state<Toast[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function success(message: string) {
    const id = nextId++;
    toasts.push({ id, type: "success", message });
    const timer = setTimeout(() => dismiss(id), 5000);
    timers.set(id, timer);
  }

  function error(message: string) {
    const id = nextId++;
    toasts.push({ id, type: "error", message });
  }

  function dismiss(id: number) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    toasts = toasts.filter((t) => t.id !== id);
  }

  const toaster: Toaster = {
    get toasts() {
      return toasts;
    },
    success,
    error,
    dismiss,
  };

  setContext<Toaster>("toaster", toaster);

  onDestroy(() => {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
  });
</script>

{@render children()}
