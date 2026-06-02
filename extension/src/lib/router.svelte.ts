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

class Router {
  views: Partial<Record<View, Component<any>>> = $state({}); // set this up in App.svelte
  props: any = $state({}); // spread into views; `any` so required view props are satisfied
  current: View = $state("listChanges");

  constructor() {
    this.navigate = this.navigate.bind(this);
  }

  navigate(view: View, props?: Record<string, any>) {
    this.current = view;
    this.props = props ?? {};
    this.onchange(view);
  }

  onchange(view: View) {}

  get view() {
    return this.views[this.current];
  }
}

export const router = new Router(); // singleton
export const [getRouter, setRouter] = createContext<Router>();
