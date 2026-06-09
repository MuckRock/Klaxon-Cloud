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

type Props = Record<string, any>;

class Router {
  views: Partial<Record<View, Component<any>>> = $state({}); // set this up in App.svelte
  props: any = $state({}); // navigation params spread into views; `any` so required view props are satisfied
  current: View = $state("listChanges");
  #history: [View, Props | undefined][] = $state([]);

  constructor() {
    this.navigate = this.navigate.bind(this);
  }

  // Views load their own data via an internal $effect, so navigation only
  // selects the component and carries any navigation params through props.
  navigate(view: View, props?: Props) {
    this.#history.push([this.current, this.props]);
    this.current = view;
    this.props = props ?? {};
    this.onchange(view);
  }

  // Navigate without growing the back stack: drops the breadcrumb that led to
  // the current view, then goes to `view`. Used by transient editor views
  // (e.g. editSelection) so that saving returns to the origin without leaving
  // the editor — or a duplicate of the origin — on the history stack.
  replace(view: View, props?: Props) {
    this.#history.pop();
    this.current = view;
    this.props = props ?? {};
    this.onchange(view);
  }

  onchange(view: View) {}

  get view() {
    return this.views[this.current];
  }

  get history(): readonly [View, Props | undefined][] {
    return this.#history;
  }

  back() {
    const previous = this.#history.pop();
    if (previous) {
      const [previousView, previousProps] = previous;
      this.current = previousView;
      this.props = previousProps ?? {};
      this.onchange(previousView);
    }
  }
}

export const router = new Router(); // singleton
export const [getRouter, setRouter] = createContext<Router>();
