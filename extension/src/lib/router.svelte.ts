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
  | "signIn"
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
  //
  // Options:
  // - `restore` overrides the props recorded for the *current* (outgoing) view
  //   in the history stack, so a view can stash the state it wants re-populated
  //   when the user navigates back to it (e.g. SaveAlert carrying its form
  //   values into the sign-in interstitial). Defaults to the current props.
  // - `reset` clears the history stack instead of pushing onto it. Use it when
  //   the navigation completes an action (e.g. an alert was saved), so Back
  //   can't return to the now-finished flow and re-run it.
  navigate(
    view: View,
    props?: Props,
    options?: { restore?: Props; reset?: boolean },
  ) {
    if (options?.reset) {
      this.#history = [];
    } else {
      this.#history.push([this.current, options?.restore ?? this.props]);
    }
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
