import type { Event, Page } from "../../lib/types";

export const event: Event = {
  id: 6,
  addon: {
    id: 436,
    user: 100000,
    organization: 10001,
    access: "public",
    name: "Klaxon Site Monitor",
    repository: "MuckRock/Klaxon",
    parameters: {
      type: "object",
      title: "Klaxon Site Monitor",
      required: ["site", "selector"],
      categories: ["monitor"],
      properties: {
        site: {
          type: "string",
          title: "Site",
          format: "uri",
        },
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
      },
      description:
        "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes. \nGet email notifications when something changes. Provide an optional CSS selector to only monitor \nportions of a page you are interested in. To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks, \nvisit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
      eventOptions: {
        name: "site",
        events: ["hourly", "daily", "weekly"],
      },
    },
    created_at: "2023-07-19T19:59:18.068046Z",
    updated_at: "2023-07-20T13:23:04.664272Z",
    active: false,
    default: false,
    featured: false,
  },
  user: 100000,
  parameters: {
    site: "https://github.com/muckrock/klaxon",
    selector: "readme-toc",
  },
  event: 3,
  scratch: {},
  created_at: "2023-07-19T19:59:18.096986Z",
  updated_at: "2023-07-19T19:59:18.097140Z",
};

export const eventsList: Page<Event> = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 7,
      addon: {
        id: 436,
        user: 100000,
        organization: 10001,
        access: "public",
        name: "Klaxon Site Monitor",
        repository: "MuckRock/Klaxon",
        parameters: {
          type: "object",
          title: "Klaxon Site Monitor",
          required: ["site", "selector"],
          categories: ["monitor"],
          properties: {
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            selector: {
              type: "string",
              title: "Selector",
              description:
                "CSS Selector on the page you would like to monitor.",
            },
            slack_webhook: {
              type: "string",
              title: "Slack Webhook",
              format: "uri",
              description:
                "Enter a slack webhook to enable Slack notifications",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes. \nGet email notifications when something changes. Provide an optional CSS selector to only monitor \nportions of a page you are interested in. To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks, \nvisit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
        },
        created_at: "2023-07-19T19:59:18.068046Z",
        updated_at: "2023-07-27T14:06:29.899202Z",
        active: true,
        default: false,
        featured: true,
      },
      user: 100000,
      parameters: {
        site: "https://bjjfanatics.com/products/unstoppable-standups-by-chris-paines-and-charles-harriott",
        selector: "#ProductPrice-product",
      },
      event: 2,
      scratch: {},
      created_at: "2023-07-19T19:59:18.098265Z",
      updated_at: "2023-07-26T16:52:28.302407Z",
    },
    {
      id: 6,
      addon: {
        id: 436,
        user: 100000,
        organization: 10001,
        access: "public",
        name: "Klaxon Site Monitor",
        repository: "MuckRock/Klaxon",
        parameters: {
          type: "object",
          title: "Klaxon Site Monitor",
          required: ["site", "selector"],
          categories: ["monitor"],
          properties: {
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            selector: {
              type: "string",
              title: "Selector",
              description:
                "CSS Selector on the page you would like to monitor.",
            },
            slack_webhook: {
              type: "string",
              title: "Slack Webhook",
              format: "uri",
              description:
                "Enter a slack webhook to enable Slack notifications",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes. \nGet email notifications when something changes. Provide an optional CSS selector to only monitor \nportions of a page you are interested in. To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks, \nvisit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
        },
        created_at: "2023-07-19T19:59:18.068046Z",
        updated_at: "2023-07-27T14:06:29.899202Z",
        active: true,
        default: false,
        featured: true,
      },
      user: 100000,
      parameters: {
        site: "https://github.com/muckrock/klaxon",
        selector: "readme-toc",
      },
      event: 3,
      scratch: {},
      created_at: "2023-07-19T19:59:18.096986Z",
      updated_at: "2023-07-19T19:59:18.097140Z",
    },
  ],
};

export const scheduled: Page<Event> = {
  next: null,
  previous: null,
  results: [
    {
      id: 533,
      addon: {
        id: 436,
        user: 102112,
        organization: 125,
        access: "public",
        name: "Klaxon Site Monitor",
        repository: "MuckRock/Klaxon",
        parameters: {
          type: "object",
          title: "Klaxon Site Monitor",
          required: ["site", "selector"],
          categories: ["monitor"],
          properties: {
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            selector: {
              type: "string",
              title: "Selector",
              description:
                "CSS Selector on the page you would like to monitor.",
            },
            slack_webhook: {
              type: "string",
              title: "Slack Webhook",
              format: "uri",
              description:
                "Enter a slack webhook to enable Slack notifications",
            },
          },
          description:
            "Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide an optional CSS selector to only monitor  portions of a page you are interested in. To get started, copy the bookmarklet [Add to Klaxon](javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();) to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. ",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2023-07-16T19:54:29.948116Z",
        active: true,
        default: false,
        featured: false,
      },
      user: 1020,
      parameters: {
        site: "https://github.com/muckrock/klaxon",
        selector: "readme-toc",
      },
      event: 3,
      scratch: {
        timestamp: "20230725202608",
      },
      created_at: "2023-04-19T18:20:39.025963Z",
      updated_at: "2023-07-25T20:56:14.837295Z",
    },
    {
      id: 718,
      addon: {
        id: 436,
        user: 102112,
        organization: 125,
        access: "public",
        name: "Klaxon Site Monitor",
        repository: "MuckRock/Klaxon",
        parameters: {
          type: "object",
          title: "Klaxon Site Monitor",
          required: ["site", "selector"],
          categories: ["monitor"],
          properties: {
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            selector: {
              type: "string",
              title: "Selector",
              description:
                "CSS Selector on the page you would like to monitor.",
            },
            slack_webhook: {
              type: "string",
              title: "Slack Webhook",
              format: "uri",
              description:
                "Enter a slack webhook to enable Slack notifications",
            },
          },
          description:
            "Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide an optional CSS selector to only monitor  portions of a page you are interested in. To get started, copy the bookmarklet [Add to Klaxon](javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();) to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. ",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2023-07-16T19:54:29.948116Z",
        active: true,
        default: false,
        featured: false,
      },
      user: 1020,
      parameters: {
        site: "https://www.supremecourt.gov/opinions/slipopinion/22",
        selector: "#list",
      },
      event: 3,
      scratch: {},
      created_at: "2023-07-31T20:04:28.303078Z",
      updated_at: "2023-07-31T20:04:28.303507Z",
    },
  ],
};
