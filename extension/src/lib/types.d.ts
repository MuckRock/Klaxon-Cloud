// shared types

export type Maybe<T> = T | undefined;

export type Nullable<T> = T | null;

export interface Page<T> {
  count?: number;
  next: Nullable<string>;
  previous: Nullable<string>;
  results: T[];
  escaped?: boolean;
}

export interface PageParams {
  cursor?: string;
  per_page?: number;
}

export interface APIError<E> {
  status: number;
  message: string;
  errors?: E;
}

// copied from SvelteKit
type NumericRange<TStart extends number, TEnd extends number> = Exclude<
  TEnd | LessThan<TEnd>,
  LessThan<TStart>
>;

// known errors
export interface ValidationError extends Record<string, string[]> {}

/**
 * Wrap an API response so we can pass errors along
 */
export interface APIResponse<T, E = unknown> {
  data?: T;
  error?: APIError<E>;
}

export interface User {
  uuid: string;
  id: number;
  email?: string;
  username: string;
  name: Maybe<string>;
  avatar_url: Maybe<string>;
  organization: number | Org;
  organizations: number[];
  admin_organizations: number[];
  feature_level?: number;
  verified_journalist?: boolean;
  is_staff?: boolean;
}

export interface Org {
  uuid: string;
  id: number;
  name: string;
  slug: string;
  avatar_url: string;
  individual?: boolean;
  plan?: "Free" | "Professional" | "Organization" | "Admin";
}

/** Addons */

type AddOnCategory = "premium" | string;

type AddOnSchedule = "disabled" | "hourly" | "daily" | "weekly" | "upload";

export interface AddOnParams extends PageParams {
  query?: string;
  active?: boolean;
  default?: boolean;
  featured?: boolean;
  premium?: boolean;
  category?: string;
  repository?: string;
}

interface AddOnProperty {
  type: string;
  title?: string;
  description?: string;
  default?: string | string[] | number;
  format?: string;
  enum?: (string | boolean)[];
  items?: AddOnProperty;
  maximum?: number;
  minimum?: number;
}

interface EventOptions {
  name?: string;
  events: string[];
}

interface AddOnParameters {
  type: string;
  version: number;
  title: string;
  description: string;
  instructions: string;
  categories: AddOnCategory[];
  documents: string[];
  required: string[];
  properties: Record<string, AddOnProperty>;
  cost: {
    amount: number;
    price?: number;
    unit: string;
  };
  eventOptions: EventOptions;
  custom_disabled_email_footer?: string;
}

// API endpoint https://api.www.documentcloud.org/api/addons/
export interface AddOn {
  id: number;
  user: null | number;
  organization: null | number;
  access: "public" | "private";
  name: string;
  repository: string;
  parameters: Partial<AddOnParameters>;
  created_at: string;
  updated_at: string;
  active: boolean;
  featured: boolean;
  default: boolean;
  usage?: number;
}

export type RunStatus =
  | "success"
  | "failure"
  | "queued"
  | "in_progress"
  | "cancelled";

// https://api.www.documentcloud.org/api/addon_runs/?expand=addon
export interface Run {
  uuid: string;
  addon: AddOn;
  user: number;
  event?: number | Event | null;
  status: RunStatus;
  progress: number;
  message: string;
  file_url?: string | null;
  file_expires_at?: string | null;
  dismissed: boolean;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  credits_spent?: number;
}

// https://api.www.documentcloud.org/api/addon_events/?expand=addon
export interface Event {
  id: number;
  addon: AddOn | number;
  user: number;
  parameters: any;
  event: number;
  scratch: any;
  created_at: string;
  updated_at: string;
}

// specific parameters required for Klaxon
// https://github.com/MuckRock/Klaxon/blob/main/config.yaml
export interface KlaxonParams {
  site: string;
  selector: string;
  filter_selector?: string;
}

// payload for creating or scheduling an add-on run
// including the `event` property will schedule runs (or cancel, if it's zero)
// the `documents` and `query` properties tell the add-on what documents to run against
export interface AddOnPayload {
  addon: number;
  parameters: any;
  event?: number;
  documents?: number[] | string[];
  query?: string;
  errors?: OutputUnit[];
  valid?: boolean;
}
