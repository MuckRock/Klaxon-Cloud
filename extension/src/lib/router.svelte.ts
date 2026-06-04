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

export interface HistoryEntry {
  view: View;
  props: Record<string, any>;
}

export class Router {
  views: Partial<Record<View, Component<any>>> = $state({}); // set this up in App.svelte
  props: any = $state({}); // navigation params spread into views; `any` so required view props are satisfied
  current: View = $state("listChanges");
  #history: HistoryEntry[] = $state([]);

  constructor() {
    this.navigate = this.navigate.bind(this);
  }

  // Views load their own data via an internal $effect, so navigation only
  // selects the component and carries any navigation params through props.
  navigate(view: View, props?: Record<string, any>) {
    // record history first
    this.#history.push({ view: this.current, props: { ...this.props } });

    this.current = view;
    this.props = props ?? {};
    this.onchange(view);
  }

  onchange(view: View) {}

  get view() {
    return this.views[this.current];
  }

  get length() {
    return this.#history.length;
  }

  get canGoBack() {
    return this.#history.length > 0;
  }

  back(fallback?: View, props?: Record<string, any>) {
    const previous = this.#history.pop();

    if (previous) {
      this.current = previous.view;
      this.props = previous.props;
      this.onchange(previous.view);
    } else if (fallback) {
      this.navigate(fallback, props);
    }
  }
}

export const router = new Router(); // singleton
export const [getRouter, setRouter] = createContext<Router>();
