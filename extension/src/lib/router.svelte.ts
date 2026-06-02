import { type Component, createContext } from "svelte";

// To add a new view to the router,
// register it within the View type.
export type View =
  | "createAlert"
  | "editAlert"
  | "listChanges"
  | "listAlerts"
  | "saveAlert"
  | "viewAlert"; // unused for now

// A view's async data loader, resolving props before the view renders.
export type LoadFn = (
  props?: Record<string, any>,
) => Promise<Record<string, any>>;

// A registered view: its component plus an optional load().
// `load` is wired explicitly (not read off the component) because Svelte
// `<script module>` exports are named module exports, not statics on the
// component value — `Component.load` would be undefined at runtime.
export interface ViewEntry {
  component: Component<any>;
  load?: LoadFn;
}

class Router {
  views: Partial<Record<View, ViewEntry>> = $state({}); // set this up in App.svelte
  props: any = $state({}); // spread into views; `any` so required view props are satisfied
  current: View = $state("listChanges");
  loading: boolean = $state(false);
  #history: View[] = $state([]);

  constructor() {
    this.navigate = this.navigate.bind(this);
    this.reload = this.reload.bind(this);
  }

  navigate(view: View, props?: Record<string, any>) {
    this.current = view;
    this.props = props ?? {};
    this.#history.push(view);
    this.onchange(view);
    return this.reload();
  }

  // Run the current view's load() and merge its result into props.
  // The view first renders with whatever props it already has, then
  // re-renders once load() resolves (props is $state).
  async reload() {
    const load = this.views[this.current]?.load;
    if (!load) return;

    this.loading = true;
    try {
      const loaded = await load(this.props);
      this.props = { ...this.props, ...loaded };
    } catch (error) {
      this.onerror(error);
    } finally {
      this.loading = false;
    }
  }

  onchange(view: View) {}

  onerror(error: unknown) {}

  get view() {
    return this.views[this.current]?.component;
  }

  back() {
    const previous = this.#history.pop();
    if (previous) {
      this.current = previous;
      this.onchange(previous);
      this.reload();
    }
  }
}

export const router = new Router(); // singleton
export const [getRouter, setRouter] = createContext<Router>();
