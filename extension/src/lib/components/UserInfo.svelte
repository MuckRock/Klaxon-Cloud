<script lang="ts">
  import { CircleUserRound } from "@lucide/svelte";
  import { authState } from "../auth.svelte";

  const ACCOUNTS_HOST = import.meta.env.MUCKROCK_ACCOUNTS_HOST;

  const user = $derived(authState.user);
  const name = $derived(
    user
      ? (user?.preferred_username ?? user?.name ?? user?.email ?? "Squarelet user")
      : "Anonymous",
  );
  const profileUrl = $derived(`${ACCOUNTS_HOST}users/${user?.nickname}`);
</script>

<a class="user" href={profileUrl} target="_blank" rel="noopener noreferrer">
  {#if user?.picture}
    <img height="24" width="24" class="userAvatar" src={user.picture} alt={user.name} />
  {:else}
    <CircleUserRound size="24" />
  {/if}
  <span class="userName">{name}</span>
</a>

<style>
  .user {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0 0.325em;
    color: inherit;
    text-decoration: none;
  }
  .user:hover .userName {
    text-decoration: underline;
  }
  .userAvatar {
    border-radius: 1em;
  }
  .userName {
    font-weight: 600;
  }
</style>
