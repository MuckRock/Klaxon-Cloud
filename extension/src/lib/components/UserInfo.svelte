<script lang="ts">
  import { CircleUserRound } from '@lucide/svelte';
  import { authState } from '../auth.svelte'

  const user = $derived(authState.user);
  const name = $derived(user ? 
    user?.preferred_username ??
    user?.name ??
    user?.email ??
    "Squarelet user"
    : "Anonymous"
  )
</script>

<div class="user">
  {#if user?.picture}
    <img height="24" width="24" class="userAvatar" src={user.picture} alt={user.name} />
  {:else}
    <CircleUserRound size="24" />
  {/if}
  <span class="userName">{name}</span>
</div>

<style>
  .user {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0 0.325em;
  }
  .userAvatar {
    border-radius: 1em;
  }
  .userName {
    font-weight: 600;
  }
</style>