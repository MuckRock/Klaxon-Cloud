<script lang="ts">
  // Copied from RelativeTime.svelte in `muckrock/documentcloud-frontend`
  // https://github.com/MuckRock/documentcloud-frontend/blob/main/src/lib/components/common/RelativeTime.svelte

  interface Props {
    date: Date;
  }

  let { date }: Props = $props();

  // TODO: #22 i18n
  const relativeFormatter = new Intl.RelativeTimeFormat("en", {
    style: "long",
  });

  type Division = {
    amount: number;
    name: Intl.RelativeTimeFormatUnit;
  };

  const DIVISIONS: Division[] = [
    { amount: 60, name: "seconds" },
    { amount: 60, name: "minutes" },
    { amount: 24, name: "hours" },
    { amount: 7, name: "days" },
    { amount: 4.34524, name: "weeks" },
    { amount: 12, name: "months" },
    { amount: Number.POSITIVE_INFINITY, name: "years" },
  ];

  function formatTimeAgo(date: Date): string {
    let duration = (date.getTime() - new Date().getTime()) / 1000;
    let formatted: string = "";

    for (let i = 0; i < DIVISIONS.length; i++) {
      const division = DIVISIONS[i]!;
      if (Math.abs(duration) < division.amount) {
        formatted = relativeFormatter.format(Math.round(duration), division.name);
        break;
      }
      duration /= division.amount;
    }

    return formatted;
  }
</script>

<time datetime={date.toISOString()} title={date.toISOString()} data-chromatic="ignore">
  {formatTimeAgo(date)}
</time>

<style>
  time {
    cursor: default;
  }
</style>
