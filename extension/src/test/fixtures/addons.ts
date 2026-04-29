import type { AddOn } from "../../lib/types";

export const klaxon: AddOn = {
  id: 436,
  user: 102112,
  organization: 125,
  access: "public",
  name: "Klaxon Cloud: Site Monitor and Alerts",
  repository: "MuckRock/Klaxon",
  parameters: {
    type: "object",
    title: "Klaxon Cloud: Site Monitor and Alerts",
    required: ["site", "selector"],
    categories: ["monitor"],
    properties: {
      site: { type: "string", title: "Site", format: "uri" },
      selector: {
        type: "string",
        title: "Selector",
        description: "CSS Selector on the page you would like to monitor.",
      },
      slack_webhook: {
        type: "string",
        title: "Slack Webhook",
        format: "uri",
        description: "Enter a slack webhook to enable Slack notifications",
      },
      filter_selector: {
        type: "string",
        title: "Filter",
        description:
          "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
      },
    },
    description:
      "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
    eventOptions: { name: "site", events: ["hourly", "daily", "weekly"] },
    instructions: "",
  },
  created_at: "2023-04-17T16:35:17.845041Z",
  updated_at: "2026-04-02T11:59:10.436146Z",
  active: false,
  default: true,
  featured: true,
};
