<script module>
  // To add a new view to the router,
  // register it within the View type.
  type View = (
    "home" |
    "createAlert" |
    "saveAlert"
  );

  interface Router {
    view: View;
    navigate(v: View): void;
  }

  export function getRouter() {
    return getContext<Router>("router");
  }
</script>

<script lang="ts">
  import { type Snippet, getContext, setContext, untrack } from "svelte";

  interface Props {
    initialView: View;
    onchange?: (view: View) => void;
    children: Snippet<[Router]>;
  }

  let {
    initialView,
    onchange,
    children
  }: Props = $props();

  let currentView = $state<View>(
    untrack(() => initialView)
  );

  const router: Router = {
    get view() {
      return currentView;
    },
    navigate(v: View) {
      currentView = v;
      onchange?.(v);
    },
  };

  setContext<Router>("router", router);
</script>

{@render children(router)}
