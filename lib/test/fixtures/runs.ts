import type { Page, Run } from "../../src/types";

export const emptyRuns: Page<Run> = {
  next: null,
  previous: null,
  results: [],
};

export const runs: Page<Run> = {
  next: "https://api.www.documentcloud.org/api/addon_runs/?addon=436&cursor=cD0yMDI2LTA1LTE4KzA3JTNBMDAlM0EwMC4zOTA5ODUlMkIwMCUzQTAw&dismissed=&event=&expand=~all&format=json",
  previous: null,
  results: [
    {
      uuid: "8a961a35-054e-4959-a428-9476ddde046b",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 807,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.nifc.gov/fire-information/statistics/wildfires",
          selector: "div#page",
        },
        event: 2,
        scratch: {
          timestamp: "20260520191726",
        },
        created_at: "2023-10-05T21:04:45.949827Z",
        updated_at: "2026-05-20T19:23:17.434894Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "Change detected",
      file_url:
        "https://api.www.documentcloud.org/files/addon-runs/8a961a35-054e-4959-a428-9476ddde046b/",
      file_expires_at: "2026-05-26T00:00:00Z",
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-20T19:15:00.252802Z",
      updated_at: "2026-05-20T19:23:18.067039Z",
      data: {
        compare:
          "https://web.archive.org/web/diff/20260519191625/20260520191726/https://www.nifc.gov/fire-information/statistics/wildfires",
        snapshot:
          "https://web.archive.org/web/20260520191726/https://www.nifc.gov/fire-information/statistics/wildfires",
        timestamp: "20260520191726",
      },
    },
    {
      uuid: "751a66f0-edd6-4dd3-9dda-41eab7255785",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2763,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.justice.gov/pardon/clemency-grants-president-donald-j-trump-2025-present",
          selector: "div.grid-row.grid-gap.a11y-natural-flow",
        },
        event: 2,
        scratch: {
          timestamp: "20260302180027",
        },
        created_at: "2025-05-27T17:34:21.446106Z",
        updated_at: "2026-03-03T14:19:31.485415Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-20T14:15:03.973140Z",
      updated_at: "2026-05-20T14:15:36.885534Z",
      data: {},
    },
    {
      uuid: "52c38834-0c9f-4505-a905-37c09699e87c",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2762,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.justice.gov/pardon/search-clemency-case-status",
          selector: "div.layout__region",
        },
        event: 2,
        scratch: {
          timestamp: "20260503141144",
        },
        created_at: "2025-05-27T17:30:37.008962Z",
        updated_at: "2026-05-03T14:11:59.351916Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-20T14:10:00.414801Z",
      updated_at: "2026-05-20T14:10:33.931459Z",
      data: {},
    },
    {
      uuid: "9be72e89-b3f3-421b-9608-db14ec83ba81",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 718,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.supremecourt.gov/opinions/slipopinion/22",
          selector: "#list",
        },
        event: 3,
        scratch: {
          timestamp: "20260422115029",
        },
        created_at: "2023-07-31T20:04:28.303078Z",
        updated_at: "2026-04-22T11:50:45.074257Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-20T11:50:01.128242Z",
      updated_at: "2026-05-20T11:50:26.105873Z",
      data: {},
    },
    {
      uuid: "185fb6fa-90ac-45a2-aaee-f0b379298fcf",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2676,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.nesdis.noaa.gov/about/documents-reports/notice-of-changes",
          selector:
            "div.paragraph.paragraph--type--text-block.add-space-0.paragraph--view-mode--default",
        },
        event: 2,
        scratch: {
          timestamp: "20260129070147",
        },
        created_at: "2025-04-23T02:28:52.366427Z",
        updated_at: "2026-01-29T07:02:07.936670Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-20T07:00:00.828739Z",
      updated_at: "2026-05-20T07:00:28.689522Z",
      data: {},
    },
    {
      uuid: "363480f8-07fd-47c3-be0a-6f0e5adb845a",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 860,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://openai.com/our-structure",
          selector: "*",
        },
        event: 2,
        scratch: {
          timestamp: "20260519234803",
        },
        created_at: "2023-11-22T15:04:07.814865Z",
        updated_at: "2026-05-19T23:48:20.360207Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "Change detected",
      file_url:
        "https://api.www.documentcloud.org/files/addon-runs/363480f8-07fd-47c3-be0a-6f0e5adb845a/",
      file_expires_at: "2026-05-26T00:00:00Z",
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T23:40:00.247949Z",
      updated_at: "2026-05-19T23:48:21.184306Z",
      data: {
        compare:
          "https://web.archive.org/web/diff/20260518234537/20260519234803/https://openai.com/our-structure",
        snapshot:
          "https://web.archive.org/web/20260519234803/https://openai.com/our-structure/",
        timestamp: "20260519234803",
      },
    },
    {
      uuid: "c55f9fe1-f048-4a9b-bb7d-4fca1d90efc6",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 533,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://github.com/muckrock/klaxon",
          selector: "readme-toc",
        },
        event: 3,
        scratch: {
          timestamp: "20260310202715",
        },
        created_at: "2023-04-19T18:20:39.025963Z",
        updated_at: "2026-03-10T20:27:29.794288Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T20:25:00.123315Z",
      updated_at: "2026-05-19T20:25:18.966380Z",
      data: {},
    },
    {
      uuid: "80a9af19-cc91-4bd5-89f9-47a95c5185fa",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 807,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.nifc.gov/fire-information/statistics/wildfires",
          selector: "div#page",
        },
        event: 2,
        scratch: {
          timestamp: "20260520191726",
        },
        created_at: "2023-10-05T21:04:45.949827Z",
        updated_at: "2026-05-20T19:23:17.434894Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "Change detected",
      file_url:
        "https://api.www.documentcloud.org/files/addon-runs/80a9af19-cc91-4bd5-89f9-47a95c5185fa/",
      file_expires_at: "2026-05-26T00:00:00Z",
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T19:15:00.202902Z",
      updated_at: "2026-05-19T19:16:44.750631Z",
      data: {
        compare:
          "https://web.archive.org/web/diff/20260518191705/20260519191625/https://www.nifc.gov/fire-information/statistics/wildfires",
        snapshot:
          "https://web.archive.org/web/20260519191625/https://www.nifc.gov/fire-information/statistics/wildfires",
        timestamp: "20260519191625",
      },
    },
    {
      uuid: "6d619b68-4b95-4712-aba9-aa8efdc6c9f1",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2533,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://origin-www.gsa.gov/real-estate/real-estate-services/real-property-disposition/noncore-property-list",
          selector: "#gsa-body",
        },
        event: 3,
        scratch: {
          timestamp: "20260519190547",
        },
        created_at: "2025-03-05T02:01:27.941380Z",
        updated_at: "2026-05-19T19:06:26.688784Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "Change detected",
      file_url:
        "https://api.www.documentcloud.org/files/addon-runs/6d619b68-4b95-4712-aba9-aa8efdc6c9f1/",
      file_expires_at: "2026-05-26T00:00:00Z",
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T19:05:00.461224Z",
      updated_at: "2026-05-19T19:06:27.887540Z",
      data: {
        compare:
          "https://web.archive.org/web/diff/20260505190657/20260519190547/https://origin-www.gsa.gov/real-estate/real-estate-services/real-property-disposition/noncore-property-list",
        snapshot:
          "https://web.archive.org/web/20260519190547/https://origin-www.gsa.gov/real-estate/real-property-disposition/assets-identified-for-accelerated-disposition",
        timestamp: "20260519190547",
      },
    },
    {
      uuid: "c092ef47-77ab-48fe-bc06-af533849eacc",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2763,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.justice.gov/pardon/clemency-grants-president-donald-j-trump-2025-present",
          selector: "div.grid-row.grid-gap.a11y-natural-flow",
        },
        event: 2,
        scratch: {
          timestamp: "20260302180027",
        },
        created_at: "2025-05-27T17:34:21.446106Z",
        updated_at: "2026-03-03T14:19:31.485415Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T14:15:00.322409Z",
      updated_at: "2026-05-19T14:15:26.504116Z",
      data: {},
    },
    {
      uuid: "0e1760d9-3067-42f4-9fb0-abe059ae26c2",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2762,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.justice.gov/pardon/search-clemency-case-status",
          selector: "div.layout__region",
        },
        event: 2,
        scratch: {
          timestamp: "20260503141144",
        },
        created_at: "2025-05-27T17:30:37.008962Z",
        updated_at: "2026-05-03T14:11:59.351916Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T14:10:00.261693Z",
      updated_at: "2026-05-19T14:10:21.342053Z",
      data: {},
    },
    {
      uuid: "e4279ef0-5b8c-4d98-899f-c0943e253f94",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2676,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.nesdis.noaa.gov/about/documents-reports/notice-of-changes",
          selector:
            "div.paragraph.paragraph--type--text-block.add-space-0.paragraph--view-mode--default",
        },
        event: 2,
        scratch: {
          timestamp: "20260129070147",
        },
        created_at: "2025-04-23T02:28:52.366427Z",
        updated_at: "2026-01-29T07:02:07.936670Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T07:00:00.312911Z",
      updated_at: "2026-05-19T07:00:23.061561Z",
      data: {},
    },
    {
      uuid: "19e9d99a-4c11-4055-8fff-9cbcf574bf6a",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2337,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://search.cdc.gov/search/?query=transgender&dpage=1",
          selector: "*",
        },
        event: 3,
        scratch: {
          timestamp: "20260210024743",
        },
        created_at: "2025-02-01T02:03:58.473687Z",
        updated_at: "2026-02-10T02:47:59.969548Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-19T02:45:00.472076Z",
      updated_at: "2026-05-19T02:45:19.215003Z",
      data: {},
    },
    {
      uuid: "779fe85d-42f0-4a7e-8281-e072b959d98f",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 860,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://openai.com/our-structure",
          selector: "*",
        },
        event: 2,
        scratch: {
          timestamp: "20260519234803",
        },
        created_at: "2023-11-22T15:04:07.814865Z",
        updated_at: "2026-05-19T23:48:20.360207Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "Detection complete",
      file_url:
        "https://api.www.documentcloud.org/files/addon-runs/779fe85d-42f0-4a7e-8281-e072b959d98f/",
      file_expires_at: "2026-05-26T00:00:00Z",
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-18T23:40:00.169069Z",
      updated_at: "2026-05-18T23:45:51.620173Z",
      data: {},
    },
    {
      uuid: "7156dc0e-0834-4b8b-949e-92dbd77088ef",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 807,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.nifc.gov/fire-information/statistics/wildfires",
          selector: "div#page",
        },
        event: 2,
        scratch: {
          timestamp: "20260520191726",
        },
        created_at: "2023-10-05T21:04:45.949827Z",
        updated_at: "2026-05-20T19:23:17.434894Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "Detection complete",
      file_url:
        "https://api.www.documentcloud.org/files/addon-runs/7156dc0e-0834-4b8b-949e-92dbd77088ef/",
      file_expires_at: "2026-05-26T00:00:00Z",
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-18T19:15:00.199004Z",
      updated_at: "2026-05-18T19:17:38.654581Z",
      data: {},
    },
    {
      uuid: "18af2e3f-69d0-4035-bd68-7f17098d15c6",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2763,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.justice.gov/pardon/clemency-grants-president-donald-j-trump-2025-present",
          selector: "div.grid-row.grid-gap.a11y-natural-flow",
        },
        event: 2,
        scratch: {
          timestamp: "20260302180027",
        },
        created_at: "2025-05-27T17:34:21.446106Z",
        updated_at: "2026-03-03T14:19:31.485415Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-18T14:15:00.188206Z",
      updated_at: "2026-05-18T14:15:22.537028Z",
      data: {},
    },
    {
      uuid: "f3b45b7b-1083-49d2-bab4-2b2cd026b1f4",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2762,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.justice.gov/pardon/search-clemency-case-status",
          selector: "div.layout__region",
        },
        event: 2,
        scratch: {
          timestamp: "20260503141144",
        },
        created_at: "2025-05-27T17:30:37.008962Z",
        updated_at: "2026-05-03T14:11:59.351916Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-18T14:10:01.065139Z",
      updated_at: "2026-05-18T14:10:23.303049Z",
      data: {},
    },
    {
      uuid: "8a747641-0f85-4191-b18a-50e5987bae0f",
      addon: {
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
            site: {
              type: "string",
              title: "Site",
              format: "uri",
            },
            title: {
              type: "string",
              title: "Title",
              description: "Optional descriptive name for this URL",
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
            filter_selector: {
              type: "string",
              title: "Filter",
              description:
                "Optional HTML tag that you want to filter out from being compared. Ex: Type <code>a</code> for <code>&lt;a&gt;</code> tags",
            },
          },
          description:
            "<p>Klaxon enables reporters and editors to monitor scores of sites and files on the web for newsworthy changes.  Get email notifications when something changes. Provide a CSS selector to only monitor  portions of a page you are interested in. You may supply * to monitor the entire page, but you may receive alerts for trivial changes. Email alerts are sent to the primary email address on your DocumentCloud account.  To get started, copy the bookmarklet <a href=\"javascript:(function(){document.body.appendChild(document.createElement('script')).src='https://documentcloud-klaxon.s3.amazonaws.com/inject.js';})();\">Add to Klaxon</a> to your bookmarks,  visit a page you are looking to monitor, and then click on the bookmark to activate Klaxon. </p>",
          eventOptions: {
            name: "site",
            events: ["hourly", "daily", "weekly"],
          },
          instructions: "",
        },
        created_at: "2023-04-17T16:35:17.845041Z",
        updated_at: "2026-05-13T17:10:10.443828Z",
        active: true,
        default: true,
        featured: true,
      },
      event: {
        id: 2676,
        addon: 436,
        user: 1020,
        parameters: {
          site: "https://www.nesdis.noaa.gov/about/documents-reports/notice-of-changes",
          selector:
            "div.paragraph.paragraph--type--text-block.add-space-0.paragraph--view-mode--default",
        },
        event: 2,
        scratch: {
          timestamp: "20260129070147",
        },
        created_at: "2025-04-23T02:28:52.366427Z",
        updated_at: "2026-01-29T07:02:07.936670Z",
      },
      user: 1020,
      status: "success",
      progress: 0,
      message: "No changes detected on the site",
      file_url: null,
      file_expires_at: null,
      dismissed: true,
      rating: 0,
      comment: "",
      credits_spent: 0,
      created_at: "2026-05-18T07:00:00.390985Z",
      updated_at: "2026-05-18T07:00:20.722795Z",
      data: {},
    },
  ],
};
