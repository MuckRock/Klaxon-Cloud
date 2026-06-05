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
 * Stored responses from the Squarelet OIDC endpoints
 */

export interface StoredAuth {
  oidc: OidcTokenResponse; // the response from `/openid/token`
  userinfo: UserInfoResponse; // the response from `/openid/userinfo`
  jwt: JwtTokenResponse; // from /api/jwt
}

export interface OidcTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  id_token: string;
  expires_in: number; // Number of seconds until the token expires
  issued_at: number; // Timestamp for when the token was issued
}

// JWT for DocumentCloud access
export interface JwtTokenResponse {
  access_token: string;
  refresh_token: string;
  issued_at: number; // Timestamp for when the token was issued
}

export interface AuthConfig {
  host: string;
  clientId: string;
  scopes: string;
}

export interface AuthMessage {
  type: string;
  config: AuthConfig;
}

export interface FetchMessage {
  type: "api/fetch";
  url: string;
  options: RequestInit;
}

// Side panel → service worker: inject the picker content script into a tab.
export interface PickerEnsureMessage {
  type: "picker/ensure";
  tabId: number;
}

export interface UserInfoResponse {
  sub: string; // This is the internal system identifier for the user, or “the subject”. You should use the UUID as the user’s identifier in your application.
  uuid: string; // A unique identifier for the user.
  name: string; // The user’s full name
  nickname: string; // The user’s full name
  preferred_username: string; // The user’s preferred username
  updated_at: string; // Timestamp for when the user’s information was last updated
  picture: string; // A URL to the user's avatar
  bio: string; // A short description provided by the user
  email: string; // The user’s primary email address
  email_verified: boolean; // A boolean indicating if email has been verified
  use_autologin: boolean; //  A boolean indicating if the user has opted in to receiving links in emails to them with a token to automatically log them in
  organizations: UserInfoOrganization[]; // A list of organizations the user belongs to.
}

interface UserInfoOrganization {
  uuid: string; // A unique identifier for the organization
  name: string; // The name of the organization
  slug: string; // The slug for the organization
  entitlements: Entitlement[]; // Entitlements are used if your client supports premium memberships purchased through Squarelet. Services can have different entitlements, which can be bundled into different plans available on Squarelet. If the organization is subscribed to a plan which has an entitlement for your client, it will be sent here.
  card: string; // Last 4 digits of credit card on file
  max_users: number; // This is how many “resource blocks” the organization has subscribed to. For legacy reasons, it is called max_users, for when users were tied to resources. It allows you to scale up your premium plans. For example, a MuckRock plan may offer 20 base requests per month, than an additional 5 requests per month per extra resource block being paid for.
  individual: boolean; // Is this an individual organization? Each user has an individual organization created upon signup. Individual organizations may be subscribed to individual, “professional” plans.
  private: boolean; // Is this a private organization? Private organizations should not be included in public search results or be publicly associated with users.
  verified_journalist: boolean; // Is this a verified journalistic organization? MuckRock manually verifies organizations which apply for verification.
  updated_at: string; // ISO 8601 formatted timestamp of when the organization was last updated.
  payment_failed: boolean; // Boolean indicating if the organization’s last payment failed.
  avatar_url: string; // A URL pointing to the organization’s avatar
  merged: string | null; // If this organization has been merged into another organization, this will be the UUID of the organization it was merged in to.  Otherwise this will be null.
  update_on: string; // ⚠️ Deprecated
  admins: Admin[]; // A list of admins for the organization, with their name and email address
  subtypes: string[]; // A list of subtypes that categorize a verified organization. Subtypes are a string concatenation of the pattern <Primary Type> - <Secondary Type>.
}

interface Entitlement {
  name: string; // The name of the entitlement
  slug: string; // The slug for the entitlement
  description: string; // A description of the entitlement
  resources: Record<string, any>; // This is a JSON object which the service provides for this entitlement. It can be used to specify how many resources this entitlement grants the organization. For example, for MuckRock it specifies how many requests they make per month.
  update_on: string; // ISO 8601 formatted date when the plan should be updated.  For example, if the entitlement grants 20 requests per month, it should reset the requests to 20 on this date.
}

interface Admin {
  name: string; // The name of the admin user
  email: string; // The email address for the admin user
  id: string; // The user ID for the admin, for further lookups
}

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

export type AddOnSchedule = "disabled" | "hourly" | "daily" | "weekly";

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
  data?: {
    compare?: string;
    snapshot?: string;
    timestamp?: string;
  };
}

// https://api.www.documentcloud.org/api/addon_events/?expand=addon
export interface Event {
  id: number;
  addon: AddOn | number;
  user: number;
  parameters: KlaxonParams;
  event: number;
  scratch: {
    timestamp?: string;
  };
  created_at: string;
  updated_at: string;
}

// specific parameters required for Klaxon
// https://github.com/MuckRock/Klaxon/blob/main/config.yaml
export interface KlaxonParams {
  site: string;
  selector: string;
  filter_selector?: string;
  title?: string;
  slack_webhook?: string;
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
