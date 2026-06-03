import { type Component, createContext } from "svelte";

// To add a new view to the router,
// register it within the View type.
export type View =
  | "createAlert"
  | "editAlert"
  | "editSelection"
  | "listChanges"
  | "listAlerts"
  | "saveAlert"
  | "viewAlert";

class Router {
  views: Partial<Record<View, Component<any>>> = $state({}); // set this up in App.svelte
  props: any = $state({}); // navigation params spread into views; `any` so required view props are satisfied
  current: View = $state("listChanges");
  #history: View[] = $state([]);

  constructor() {
    this.navigate = this.navigate.bind(this);
  }

  // Views load their own data via an internal $effect, so navigation only
  // selects the component and carries any navigation params through props.
  navigate(view: View, props?: Record<string, any>) {
    this.current = view;
    this.props = props ?? {};
    this.#history.push(view);
    this.onchange(view);
  }

  onchange(view: View) {}

  get view() {
    return this.views[this.current];
  }

  back() {
    const previous = this.#history.pop();
    if (previous) {
      this.current = previous;
      this.onchange(previous);
    }
  }
}

export const router = new Router(); // singleton
export const [getRouter, setRouter] = createContext<Router>();
