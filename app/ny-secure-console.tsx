"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type View =
  | "overview"
  | "operations"
  | "people"
  | "organizations"
  | "policies"
  | "facility"
  | "visits"
  | "locator"
  | "command"
  | "alarms"
  | "activity";

type Organization = {
  id: string;
  oid: string;
  name: string;
  type: string;
  status: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type Zone = {
  id: string;
  name: string;
  type: string;
  securityLevel: number;
  status: string;
  tenantOrganizationId?: string | null;
  tenantName?: string | null;
};

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  ibxAccessPin: string;
  creditHold: boolean;
  organizationId: string;
  organizationName?: string;
  relationshipType: string;
  jobFunction: string;
  badgeId: string;
  badgeStatus: string;
  status: string;
};

type Profile = {
  id: string;
  name: string;
  description: string;
  schedule: string;
  status: string;
  zoneCount?: number;
  zones?: string[];
};

type Assignment = {
  id: string;
  personId: string;
  profileId: string;
  validFrom: string;
  validUntil?: string | null;
  status: string;
  reason?: string | null;
};

type AccessEvent = {
  id: string | number;
  occurredAt: string;
  personId: string;
  personName?: string;
  organizationName?: string;
  zoneId: string;
  zoneName?: string;
  decision: "GRANTED" | "DENIED";
  reasonCode: string;
  explanation?: string;
  eventKind?: "ACCESS" | "CONTROL";
  actionLabel?: string;
  operatorName?: string;
  affectedPersonName?: string | null;
  sourceLabel?: string;
};

type Alarm = {
  id: string;
  occurredAt: string;
  alarmType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  personId?: string | null;
  personName: string;
  zoneId: string;
  zoneName: string;
  source: string;
  detail: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";
};

type ScheduledVisit = {
  ticketNumber: string;
  siteCode: string;
  organizationId: string;
  organizationName: string;
  requesterName: string;
  visitorName: string;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  cageZoneId: string;
  cageName: string;
  cabinetAccess: string[];
  validFrom: string;
  validUntil: string;
  comments: string;
  allowedHours: Record<string, number[]>;
  hasDelivery: boolean;
  packageCount: number;
  packageDetails: string;
  signedInAt?: string | null;
  signedOutAt?: string | null;
  status: "SCHEDULED" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "OVERDUE";
};

const SITE_TIME_ZONE = "America/New_York";
const HOURS_24 = Array.from({ length: 24 }, (_, hour) => hour);

function siteDateKey(value: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function visitDateKeys(validFrom: string, durationHours: number) {
  const start = new Date(validFrom);
  if (Number.isNaN(start.getTime()) || !Number.isFinite(durationHours)) return [];
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  const dates = new Set<string>();
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 60 * 60 * 1000) dates.add(siteDateKey(new Date(cursor)));
  dates.add(siteDateKey(end));
  return [...dates];
}

function formatVisitHours(hours: number[]) {
  return [...hours].sort((a, b) => a - b).map((hour) => String(hour).padStart(2, "0")).join(", ");
}

type SiteCheckIn = {
  id: string;
  personId: string;
  personName: string;
  organizationId: string;
  organizationName: string;
  relationshipType: string;
  badgeNumber: string;
  source: "PORTAL" | "KIOSK";
  status: "PENDING" | "ON_SITE" | "SIGNED_OUT";
  requestedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  signedOutAt?: string | null;
  notes: string;
  lastScanAt?: string | null;
  lastScanZone?: string | null;
};

type StatePayload = {
  organizations: Organization[];
  zones: Zone[];
  people: Person[];
  profiles: Profile[];
  assignments: Assignment[];
  events: AccessEvent[];
  commandEvents: AccessEvent[];
  alarms: Alarm[];
  scheduledVisits: ScheduledVisit[];
  checkIns: SiteCheckIn[];
  stats?: {
    activePeople?: number;
    activeCredentials?: number;
    grantsToday?: number;
    denialsToday?: number;
  };
};

type Flash = { tone: "success" | "danger" | "info"; message: string } | null;
type StatTab = "people" | "credentials" | "grants" | "denials";
type DashboardWidget = "stats" | "facility" | "activity" | "attention" | "roster";
type FontSizePreference = "small" | "comfortable" | "large";
type DensityPreference = "compact" | "comfortable";
type ProfileTab = "access" | "history" | "contact";

const DASHBOARD_WIDGETS: { id: DashboardWidget; label: string; description: string }[] = [
  { id: "stats", label: "Security summary", description: "People, credentials, grants, and denials" },
  { id: "facility", label: "Facility map", description: "Interactive floor plan and selected zone" },
  { id: "activity", label: "Recent activity", description: "Latest simplified access decisions" },
  { id: "attention", label: "Needs attention", description: "Expirations and open security tasks" },
  { id: "roster", label: "On-site roster", description: "Currently active people and access" },
];

const NAV_GROUPS: { label: string; symbol: string; description: string; items: { id: View; label: string; symbol: string }[] }[] = [
  {
    label: "Workspace",
    symbol: "WS",
    description: "Facility and policy tools",
    items: [
      { id: "overview", label: "Overview", symbol: "OV" },
      { id: "operations", label: "Live operations", symbol: "OP" },
      { id: "facility", label: "Facility", symbol: "FC" },
      { id: "policies", label: "Access policies", symbol: "AP" },
    ],
  },
  {
    label: "Customer data",
    symbol: "CD",
    description: "People, companies, and visits",
    items: [
      { id: "people", label: "People", symbol: "PE" },
      { id: "organizations", label: "Organizations", symbol: "OR" },
      { id: "visits", label: "Scheduled visits", symbol: "SV" },
    ],
  },
  {
    label: "Alarm and controls",
    symbol: "AC",
    description: "Door control, alarms, and logs",
    items: [
      { id: "command", label: "Command center", symbol: "CC" },
      { id: "locator", label: "Locator", symbol: "LO" },
      { id: "alarms", label: "Alarms", symbol: "AR" },
      { id: "activity", label: "Activity log", symbol: "AL" },
    ],
  },
];

const FLOOR_ROOMS = [
  { id: "zone-main-entrance", short: "ENTRY", area: "entry", kind: "common" },
  { id: "zone-security-lobby", short: "SECURITY LOBBY", area: "lobby", kind: "common" },
  { id: "zone-entrance-mantrap", short: "ENTRY MANTRAP", area: "mantrap", kind: "threshold" },
  { id: "zone-secure-spine", short: "SECURE SPINE", area: "spine", kind: "corridor" },
  { id: "zone-cage-11000", short: "HALL A · 11000–11300", area: "c111", kind: "tenant" },
  { id: "zone-cage-11010", short: "CAGE 11010", area: "c112", kind: "tenant" },
  { id: "zone-cage-22000", short: "HALL B · 22000–22300", area: "c113", kind: "tenant" },
  { id: "zone-cage-22010", short: "CAGE 22010", area: "c114", kind: "tenant" },
  { id: "zone-ups-a", short: "UPS ROOM A", area: "ups", kind: "critical" },
  { id: "zone-generator-west", short: "GEN WEST", area: "gen1", kind: "critical" },
  { id: "zone-generator-east", short: "GEN EAST", area: "gen2", kind: "critical" },
  { id: "zone-noc", short: "NOC", area: "noc", kind: "operations" },
  { id: "zone-loading-dock", short: "LOADING DOCK", area: "dock", kind: "logistics" },
  { id: "zone-loading-mantrap", short: "DOCK MANTRAP", area: "docktrap", kind: "threshold" },
  { id: "zone-receiving", short: "RECEIVING / STAGING", area: "staging", kind: "logistics" },
];

const VIEW_COPY: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  overview: {
    eyebrow: "Wednesday · August 5",
    title: "Good morning, Maya.",
    subtitle: "NY-Secure DC-01 is secure. Here’s what needs your attention.",
  },
  operations: {
    eyebrow: "Decision workspace",
    title: "Live operations",
    subtitle: "Present a credential, test the policy path, and inspect the result.",
  },
  people: {
    eyebrow: "Identity directory",
    title: "People",
    subtitle: "Search the identity database by name, OID, or company.",
  },
  organizations: {
    eyebrow: "Colocation directory",
    title: "Organizations",
    subtitle: "Operators, customers, contractors, vendors, and service partners.",
  },
  policies: {
    eyebrow: "Default deny",
    title: "Access policies",
    subtitle: "Reusable, scheduled permission sets assigned to people—not job titles.",
  },
  facility: {
    eyebrow: "NY-Secure · DC-01",
    title: "Facility model",
    subtitle: "A navigable hierarchy of perimeter, common, tenant, and critical spaces.",
  },
  visits: {
    eyebrow: "Temporary access",
    title: "Scheduled visits",
    subtitle: "Create time-bound work-visit tickets for customer and NOC-sponsored visitors.",
  },
  locator: {
    eyebrow: "Last-known access point",
    title: "Locator",
    subtitle: "Find a person’s latest scan or build a 48-hour last-seen roster from the activity log.",
  },
  command: {
    eyebrow: "Remote door operations",
    title: "Command center",
    subtitle: "Unlock, lock down, or grant person-specific access across every DC-01 door.",
  },
  alarms: {
    eyebrow: "Security exceptions",
    title: "Alarms",
    subtitle: "Door, credential, schedule, and monitoring-point alarms in a dedicated report.",
  },
  activity: {
    eyebrow: "Immutable history",
    title: "Activity log",
    subtitle: "Every grant, denial, and policy decision in one searchable trail.",
  },
};

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function wildcardMatch(value: unknown, pattern: string) {
  const normalizedPattern = pattern.trim().toLowerCase();
  if (!normalizedPattern) return true;
  const normalizedValue = String(value ?? "").toLowerCase();
  if (!normalizedPattern.includes("*")) return normalizedValue.includes(normalizedPattern);
  const expression = normalizedPattern
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${expression}$`, "i").test(normalizedValue);
}

function wildcardMatchAny(values: unknown[], pattern: string) {
  return values.some((value) => wildcardMatch(value, pattern));
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "No expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function relativeEventTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta)) return value;
  const mins = Math.max(0, Math.round(delta / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

function formatOnSiteDuration(signedInAt?: string | null, signedOutAt?: string | null) {
  if (!signedInAt || !signedOutAt) return "Unavailable";
  const minutes = Math.max(0, Math.round((new Date(signedOutAt).getTime() - new Date(signedInAt).getTime()) / 60000));
  if (!Number.isFinite(minutes)) return "Unavailable";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ""}`;
}

function normalizeState(source: {
  organizations?: Array<Record<string, unknown>>;
  zones?: Array<Record<string, unknown>>;
  people?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  assignments?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  commandEvents?: Array<Record<string, unknown>>;
  alarms?: Array<Record<string, unknown>>;
  scheduledVisits?: Array<Record<string, unknown>>;
  checkIns?: Array<Record<string, unknown>>;
  stats?: Record<string, unknown>;
}): StatePayload {
  const organizations: Organization[] = (source.organizations ?? []).map((item) => ({
    id: String(item.id),
    oid: `OID-${String(item.slug ?? item.id).replace(/^org-/, "").replaceAll("_", "-").toUpperCase()}`,
    name: String(item.name),
    type: String(item.type ?? item.organizationType ?? "ORGANIZATION"),
    status: item.active === false ? "INACTIVE" : "ACTIVE",
    contactName: String(item.contactName ?? "Not provided"),
    contactPhone: String(item.contactPhone ?? ""),
    contactEmail: String(item.contactEmail ?? ""),
  }));
  const organizationNames = new Map(organizations.map((organization) => [organization.id, organization.name]));
  const tenantIds = ["org-northstar", "org-lumina", "org-redwood", "org-apex", "org-meridian", "org-brightway", "org-boldyn"];
  const zoneType = (id: string, category: string) => {
    if (category === "CUSTOMER_CAGE") return "CAGE";
    if (category === "CUSTOMER_HALL") return "COLO_HALL";
    if (category === "CRITICAL_INFRASTRUCTURE") {
      if (id.includes("ups")) return "UPS_ROOM";
      if (id.includes("generator")) return "GENERATOR_ROOM";
      if (id.includes("noc")) return "NOC";
    }
    if (id.includes("entrance") || id.includes("gate")) return "EXTERIOR";
    if (id.includes("lobby")) return "LOBBY";
    if (id.includes("mantrap")) return "MANTRAP";
    if (id.includes("spine")) return "SECURE_CORRIDOR";
    if (id.includes("dock")) return "LOADING_DOCK";
    if (id.includes("receiving")) return "STAGING";
    if (id.includes("noc")) return "NOC";
    return category;
  };
  const zones: Zone[] = (source.zones ?? []).map((item) => {
    const id = String(item.id);
    const cageNumber = id.match(/^zone-cage-(\d+)$/)?.[1];
    const tenantOrganizationId = cageNumber
      ? tenantIds[Math.floor(Number(cageNumber) / 10) % tenantIds.length]
      : null;
    return {
      id,
      name: String(item.name),
      type: zoneType(id, String(item.category ?? item.type ?? "ZONE")),
      securityLevel: Number(item.securityTier ?? item.securityLevel ?? 1),
      status: item.active === false ? "INACTIVE" : "ONLINE",
      tenantOrganizationId,
      tenantName: tenantOrganizationId ? organizationNames.get(tenantOrganizationId) ?? "Tenant" : null,
    };
  }).filter((zone) => !/^zone-cage-11[1-4]$/.test(zone.id) && zone.id !== "zone-mantrap");
  const people: Person[] = (source.people ?? []).map((item) => ({
    id: String(item.id),
    firstName: String(item.firstName),
    lastName: String(item.lastName),
    email: String(item.email),
    phoneNumber: String(item.phoneNumber ?? ""),
    ibxAccessPin: String(item.ibxAccessPin ?? "000000"),
    creditHold: item.creditHold === true,
    organizationId: String(item.organizationId),
    organizationName: String(item.organizationName ?? organizationNames.get(String(item.organizationId)) ?? ""),
    relationshipType: String(item.relationshipType ?? "OTHER"),
    jobFunction: String(item.jobFunction ?? "Other"),
    badgeId: String(item.badgeNumber ?? item.badgeId ?? "UNISSUED"),
    badgeStatus: item.active === false ? "SUSPENDED" : "ACTIVE",
    status: item.active === false ? "SUSPENDED" : "ACTIVE",
  }));
  const scheduleFor = (relationshipType: string) => ({
    ENGINEER: "24×7",
    CUSTOMER: "24×7",
    CONTRACTOR: "Approved window",
    VENDOR: "Delivery hours",
    VISITOR: "Visit window",
    JANITOR: "Night cleaning",
  })[relationshipType] ?? "Custom schedule";
  const profiles: Profile[] = (source.profiles ?? []).map((item) => {
    const rawZones = Array.isArray(item.zoneIds)
      ? item.zoneIds
      : Array.isArray(item.zones)
        ? item.zones.map((zone) => typeof zone === "string" ? zone : String((zone as Record<string, unknown>).id))
        : [];
    return {
      id: String(item.id),
      name: String(item.name),
      description: String(item.description ?? ""),
      schedule: scheduleFor(String(item.relationshipType ?? "")),
      status: item.active === false ? "INACTIVE" : "ACTIVE",
      zoneCount: Number(item.zoneCount ?? rawZones.length),
      zones: rawZones.map(String),
    };
  });
  const assignments: Assignment[] = (source.assignments ?? []).map((item) => ({
    id: String(item.id),
    personId: String(item.personId),
    profileId: String(item.profileId),
    validFrom: String(item.validFrom),
    validUntil: item.validUntil ? String(item.validUntil) : null,
    status: item.isCurrentlyValid === true ? "ACTIVE" : item.active === false ? "REVOKED" : "EXPIRED",
    reason: item.reason ? String(item.reason) : null,
  }));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const events: AccessEvent[] = (source.events ?? []).map((item) => {
    const person = peopleById.get(String(item.personId));
    return {
      id: String(item.id),
      occurredAt: String(item.attemptedAt ?? item.occurredAt),
      personId: String(item.personId),
      personName: String(item.personName ?? `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim()),
      organizationName: person?.organizationName,
      zoneId: String(item.zoneId),
      zoneName: String(item.zoneName ?? "Unknown zone"),
      decision: String(item.decision) === "GRANTED" ? "GRANTED" : "DENIED",
      reasonCode: String(item.reasonCode ?? "UNKNOWN"),
      explanation: item.explanation ? String(item.explanation) : undefined,
      eventKind: "ACCESS",
    };
  });
  const commandEvents: AccessEvent[] = (source.commandEvents ?? []).map((item) => {
    const action = String(item.action ?? "NORMAL");
    const actionLabel = action === "UNLOCK"
      ? "Remote unlock"
      : action === "LOCK"
        ? "Door lockdown"
        : action === "GRANT_PERSON"
          ? "Person access granted"
          : "Badge control restored";
    return {
      id: String(item.id),
      occurredAt: String(item.occurredAt),
      personId: item.personId ? String(item.personId) : "",
      personName: String(item.operatorName ?? "Security operator"),
      zoneId: String(item.zoneId),
      zoneName: String(item.zoneName ?? "Unknown door"),
      decision: action === "LOCK" ? "DENIED" : "GRANTED",
      reasonCode: `COMMAND_${action}`,
      explanation: String(item.detail ?? "Door control command recorded."),
      eventKind: "CONTROL",
      actionLabel,
      operatorName: String(item.operatorName ?? "Security operator"),
      affectedPersonName: item.affectedPersonName ? String(item.affectedPersonName) : null,
      sourceLabel: "Command center",
    };
  });
  const alarms: Alarm[] = (source.alarms ?? []).map((item) => ({
    id: String(item.id),
    occurredAt: String(item.occurredAt),
    alarmType: String(item.alarmType ?? "UNKNOWN_ALARM"),
    severity: (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(item.severity)) ? String(item.severity) : "MEDIUM") as Alarm["severity"],
    personId: item.personId ? String(item.personId) : null,
    personName: String(item.personName ?? item.actorLabel ?? "System"),
    zoneId: String(item.zoneId),
    zoneName: String(item.zoneName ?? "Unknown location"),
    source: String(item.source ?? "Access control"),
    detail: String(item.detail ?? "Alarm condition detected."),
    status: (["ACTIVE", "ACKNOWLEDGED", "CLEARED"].includes(String(item.status)) ? String(item.status) : "ACTIVE") as Alarm["status"],
  }));
  const scheduledVisits: ScheduledVisit[] = (source.scheduledVisits ?? []).map((item) => ({
    ticketNumber: String(item.ticketNumber),
    siteCode: String(item.siteCode ?? "DC-01"),
    organizationId: String(item.organizationId),
    organizationName: String(item.organizationName ?? "Unknown organization"),
    requesterName: String(item.requesterName ?? "NOC"),
    visitorName: String(item.visitorName),
    visitorEmail: item.visitorEmail ? String(item.visitorEmail) : null,
    visitorPhone: item.visitorPhone ? String(item.visitorPhone) : null,
    cageZoneId: String(item.cageZoneId),
    cageName: String(item.cageName ?? "Customer cage"),
    cabinetAccess: Array.isArray(item.cabinetAccess) ? item.cabinetAccess.map(String) : [],
    validFrom: String(item.validFrom),
    validUntil: String(item.validUntil),
    comments: String(item.comments ?? ""),
    allowedHours: item.allowedHours && typeof item.allowedHours === "object" && !Array.isArray(item.allowedHours)
      ? Object.fromEntries(Object.entries(item.allowedHours).map(([date, hours]) => [date, Array.isArray(hours) ? hours.map(Number).filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23) : []]))
      : {},
    hasDelivery: item.hasDelivery === true,
    packageCount: Number(item.packageCount ?? 0),
    packageDetails: String(item.packageDetails ?? ""),
    signedInAt: item.signedInAt ? String(item.signedInAt) : null,
    signedOutAt: item.signedOutAt ? String(item.signedOutAt) : null,
    status: (["SCHEDULED", "ACTIVE", "EXPIRED", "CANCELLED", "OVERDUE"].includes(String(item.status)) ? String(item.status) : "SCHEDULED") as ScheduledVisit["status"],
  }));
  const checkIns: SiteCheckIn[] = (source.checkIns ?? []).map((item) => ({
    id: String(item.id),
    personId: String(item.personId),
    personName: String(item.personName ?? "Unknown person"),
    organizationId: String(item.organizationId),
    organizationName: String(item.organizationName ?? "Unknown organization"),
    relationshipType: String(item.relationshipType ?? "VISITOR"),
    badgeNumber: String(item.badgeNumber ?? "UNISSUED"),
    source: String(item.source) === "PORTAL" ? "PORTAL" : "KIOSK",
    status: String(item.status) === "ON_SITE" ? "ON_SITE" : String(item.status) === "SIGNED_OUT" ? "SIGNED_OUT" : "PENDING",
    requestedAt: String(item.requestedAt),
    verifiedAt: item.verifiedAt ? String(item.verifiedAt) : null,
    verifiedBy: item.verifiedBy ? String(item.verifiedBy) : null,
    signedOutAt: item.signedOutAt ? String(item.signedOutAt) : null,
    notes: String(item.notes ?? ""),
    lastScanAt: item.lastScanAt ? String(item.lastScanAt) : null,
    lastScanZone: item.lastScanZone ? String(item.lastScanZone) : null,
  }));
  return {
    organizations,
    zones,
    people,
    profiles,
    assignments,
    events,
    commandEvents,
    alarms,
    scheduledVisits,
    checkIns,
    stats: {
      activePeople: Number(source.stats?.activePeople ?? people.filter((person) => person.status === "ACTIVE").length),
      activeCredentials: people.filter((person) => person.badgeStatus === "ACTIVE").length,
      grantsToday: Number(source.stats?.grantedToday ?? 0),
      denialsToday: Number(source.stats?.deniedToday ?? 0),
    },
  };
}

export default function NySecureConsole() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [data, setData] = useState<StatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState("zone-cage-11000");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [simulationZoneId, setSimulationZoneId] = useState("zone-cage-11000");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontSize, setFontSize] = useState<FontSizePreference>("comfortable");
  const [density, setDensity] = useState<DensityPreference>("comfortable");
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showOperatorProfile, setShowOperatorProfile] = useState(false);
  const [activeStatTab, setActiveStatTab] = useState<StatTab | null>(null);
  const [simulationResult, setSimulationResult] = useState<{
    decision: "GRANTED" | "DENIED";
    reasonCode: string;
    explanation: string;
    matchedProfileName?: string;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showCreateVisit, setShowCreateVisit] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const payload = (await response.json()) as Parameters<typeof normalizeState>[0] & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The simulator database could not be loaded.");
      const normalized = normalizeState(payload);
      setData(normalized);
      setSelectedPersonId((current) => current || normalized.people[0]?.id || "");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "The simulator database could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadState(), 0);
    const initialClock = window.setTimeout(() => setClock(new Date()), 0);
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearTimeout(initialClock);
      window.clearInterval(timer);
    };
  }, [loadState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("ny-secure-theme");
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const savedFontSize = window.localStorage.getItem("ny-secure-font-size");
      if (savedFontSize === "small" || savedFontSize === "comfortable" || savedFontSize === "large") setFontSize(savedFontSize);
      const savedDensity = window.localStorage.getItem("ny-secure-density");
      if (savedDensity === "compact" || savedDensity === "comfortable") setDensity(savedDensity);
      const savedWidgets = window.localStorage.getItem("ny-secure-dashboard-widgets");
      if (savedWidgets) {
        try {
          const parsed = JSON.parse(savedWidgets) as DashboardWidget[];
          setDashboardWidgets(parsed.filter((item) => DASHBOARD_WIDGETS.some((widget) => widget.id === item)));
        } catch {
          setDashboardWidgets([]);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      window.localStorage.setItem("ny-secure-theme", next);
      return next;
    });
  }

  function updateFontSize(value: FontSizePreference) {
    setFontSize(value);
    window.localStorage.setItem("ny-secure-font-size", value);
  }

  function updateDensity(value: DensityPreference) {
    setDensity(value);
    window.localStorage.setItem("ny-secure-density", value);
  }

  function updateDashboardWidgets(value: DashboardWidget[]) {
    setDashboardWidgets(value);
    window.localStorage.setItem("ny-secure-dashboard-widgets", JSON.stringify(value));
  }

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 3600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!showOperatorMenu && !showOperatorProfile) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowOperatorMenu(false);
      setShowOperatorProfile(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showOperatorMenu, showOperatorProfile]);

  const orgMap = useMemo(
    () => new Map(data?.organizations.map((org) => [org.id, org]) ?? []),
    [data],
  );
  const zoneMap = useMemo(
    () => new Map(data?.zones.map((zone) => [zone.id, zone]) ?? []),
    [data],
  );
  const profileMap = useMemo(
    () => new Map(data?.profiles.map((profile) => [profile.id, profile]) ?? []),
    [data],
  );

  const selectedZone = zoneMap.get(selectedZoneId) ?? data?.zones[0];
  const selectedSimulatorPerson = data?.people.find((person) => person.id === selectedPersonId);

  const activeAssignmentsFor = useCallback(
    (personId: string) =>
      data?.assignments.filter(
        (assignment) => assignment.personId === personId && assignment.status === "ACTIVE",
      ) ?? [],
    [data],
  );

  const stats = useMemo(() => {
    const events = data?.events ?? [];
    return {
      activePeople: data?.checkIns.filter((checkIn) => checkIn.status === "ON_SITE").length ?? 0,
      credentials:
        data?.stats?.activeCredentials ??
        data?.people.filter((person) => person.badgeStatus === "ACTIVE").length ??
        0,
      grants:
        data?.stats?.grantsToday ?? events.filter((event) => event.decision === "GRANTED").length,
      denials:
        data?.stats?.denialsToday ?? events.filter((event) => event.decision === "DENIED").length,
    };
  }, [data]);

  async function runSimulation() {
    if (!selectedPersonId || !simulationZoneId) return;
    setSimulating(true);
    setSimulationResult(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId: selectedPersonId, zoneId: simulationZoneId }),
      });
      const result = (await response.json()) as {
        decision?: "GRANTED" | "DENIED";
        reasonCode?: string;
        explanation?: string;
        matchedProfileName?: string;
        event?: AccessEvent;
        error?: string;
      };
      if (!response.ok || !result.decision) throw new Error(result.error || "Decision engine unavailable.");
      setSimulationResult({
        decision: result.decision,
        reasonCode: result.reasonCode ?? "UNKNOWN",
        explanation: result.explanation ?? "The access decision was recorded.",
        matchedProfileName: result.matchedProfileName,
      });
      await loadState();
    } catch (error) {
      setFlash({
        tone: "danger",
        message: error instanceof Error ? error.message : "Decision engine unavailable.",
      });
    } finally {
      setSimulating(false);
    }
  }

  const viewCopy = VIEW_COPY[activeView];
  const activeNavGroup = NAV_GROUPS.find((group) => group.items.some((item) => item.id === activeView)) ?? NAV_GROUPS[0];

  return (
    <main className="app-shell" data-theme={theme} data-font-size={fontSize} data-density={density}>
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>NY-SECURE</strong>
            <small>PHYSICAL SECURITY</small>
          </div>
        </div>

        <div className="simulation-badge">
          <span className="pulse-dot" />
          Simulation environment
        </div>

        <div className="sidebar-navigation">
          <nav className="primary-nav" aria-label={`${activeNavGroup.label} navigation`}>
            <p className="nav-section-label">{activeNavGroup.label}</p>
            {activeNavGroup.items.map((item) => (
              <button
                aria-current={activeView === item.id ? "page" : undefined}
                className={activeView === item.id ? "nav-item active" : "nav-item"}
                key={item.id}
                onClick={() => setActiveView(item.id)}
                type="button"
              >
                <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>
                <span>{item.label}</span>
                {item.id === "operations" && <i>LIVE</i>}
              </button>
            ))}
          </nav>
        </div>
        <div className="system-health">
          <div className="health-heading">
            <span>System health</span>
            <strong>All systems normal</strong>
          </div>
          <div className="health-row">
            <span><i className="online-dot" />Readers</span>
            <b>18 / 18</b>
          </div>
          <div className="health-row">
            <span><i className="online-dot" />Controllers</span>
            <b>4 / 4</b>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="site-switcher" type="button">
            <span className="site-icon">01</span>
            <span>
              <small>Active site</small>
              <strong>NY-Secure · DC-01</strong>
            </span>
            <b>⌄</b>
          </button>
          <label className="global-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search people, badges, companies, or OIDs"
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setActiveView("people")}
              placeholder="Search people, badges… Try *name*"
              title="Use * to match any characters"
              value={query}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-time">
            <small>America / New York</small>
            <strong>{clock?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/New_York" }) ?? "--:--:--"}</strong>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <button className="icon-button settings-button" onClick={() => setShowSettings(true)} type="button" aria-label="Open display and dashboard settings">
            <span aria-hidden="true">⚙</span>
          </button>
          <button className="icon-button" type="button" aria-label="Notifications">
            <span>○</span><i />
          </button>
        </header>

        <div className="page-scroll">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{viewCopy.eyebrow}</p>
              <h1>{viewCopy.title}</h1>
              <p>{viewCopy.subtitle}</p>
            </div>
            <div className="page-actions">
              {activeView === "overview" && (
                <button className="secondary-button" onClick={() => setShowSettings(true)} type="button">
                  <span>＋</span> Customize overview
                </button>
              )}
              {activeView === "people" && (
                <button className="primary-button" onClick={() => setShowAddPerson(true)} type="button">
                  <span>＋</span> Add person
                </button>
              )}
              {activeView === "visits" && (
                <button className="primary-button" onClick={() => setShowCreateVisit(true)} type="button">
                  <span>＋</span> Create visit ticket
                </button>
              )}
              {activeView !== "people" && activeView !== "operations" && activeView !== "visits" && activeView !== "locator" && activeView !== "command" && (
                <button className="primary-button" onClick={() => setActiveView("operations")} type="button">
                  <span className="button-reader-icon" /> Simulate access
                </button>
              )}
            </div>
          </div>

          {loading && <LoadingState />}
          {!loading && loadError && <ErrorState message={loadError} onRetry={loadState} />}
          {!loading && data && (
            <>
              {activeView === "overview" && (
                <Overview
                  data={data}
                  stats={stats}
                  selectedZone={selectedZone}
                  selectedZoneId={selectedZoneId}
                  setSelectedZoneId={setSelectedZoneId}
                  profileMap={profileMap}
                  activeAssignmentsFor={activeAssignmentsFor}
                  onViewAll={() => setActiveView("activity")}
                  onOpenStat={setActiveStatTab}
                  enabledWidgets={dashboardWidgets}
                  onCustomize={() => setShowSettings(true)}
                />
              )}
              {activeView === "operations" && (
                <Operations
                  data={data}
                  selectedPersonId={selectedPersonId}
                  setSelectedPersonId={setSelectedPersonId}
                  selectedZoneId={simulationZoneId}
                  setSelectedZoneId={setSimulationZoneId}
                  selectedPerson={selectedSimulatorPerson}
                  result={simulationResult}
                  simulating={simulating}
                  onSimulate={runSimulation}
                  profileMap={profileMap}
                  assignments={activeAssignmentsFor(selectedPersonId)}
                />
              )}
              {activeView === "people" && (
                <PeopleView
                  people={data.people}
                  orgMap={orgMap}
                  assignments={data.assignments}
                  profiles={profileMap}
                  events={data.events}
                  zones={zoneMap}
                  checkIns={data.checkIns}
                  onCheckInsChanged={loadState}
                  globalQuery={query}
                />
              )}
              {activeView === "organizations" && (
                <OrganizationsView organizations={data.organizations} people={data.people} zones={data.zones} />
              )}
              {activeView === "policies" && (
                <PoliciesView profiles={data.profiles} assignments={data.assignments} zones={data.zones} />
              )}
              {activeView === "facility" && (
                <FacilityView
                  zones={data.zones}
                  selectedZone={selectedZone}
                  selectedZoneId={selectedZoneId}
                  setSelectedZoneId={setSelectedZoneId}
                />
              )}
              {activeView === "visits" && <ScheduledVisitsView visits={data.scheduledVisits} onVisitsChanged={loadState} />}
              {activeView === "locator" && <LocatorView events={data.events} people={data.people} orgMap={orgMap} />}
              {activeView === "command" && <CommandCenterView zones={data.zones} people={data.people} onCommandsChanged={loadState} />}
              {activeView === "alarms" && (
                <AlarmsView
                  alarms={data.alarms}
                  people={data.people}
                  orgMap={orgMap}
                  assignments={data.assignments}
                  profiles={profileMap}
                  events={data.events}
                  zones={zoneMap}
                />
              )}
              {activeView === "activity" && <ActivityView events={[...data.events, ...data.commandEvents].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))} />}
            </>
          )}
        </div>
      </section>

      <nav className="section-taskbar" aria-label="Main sections">
        <div className="taskbar-sections">
          {NAV_GROUPS.map((group) => {
            const active = group.label === activeNavGroup.label;
            return <button aria-current={active ? "page" : undefined} className={active ? "active" : ""} key={group.label} onClick={() => setActiveView(group.items[0].id)} type="button">
              <span className="taskbar-symbol" aria-hidden="true">{group.symbol}</span>
              <span><strong>{group.label}</strong><small>{group.description}</small></span>
              <i aria-hidden="true">{active ? "●" : "○"}</i>
            </button>;
          })}
        </div>
        <button
          aria-controls="operator-profile-menu"
          aria-expanded={showOperatorMenu}
          aria-haspopup="menu"
          className={showOperatorMenu ? "taskbar-profile menu-open" : "taskbar-profile"}
          onClick={() => setShowOperatorMenu((current) => !current)}
          type="button"
          aria-label="Open Maya Brooks operator menu"
        >
          <span className="avatar avatar-maya">MB</span>
          <span>
            <strong>Maya Brooks</strong>
            <small>Security administrator</small>
          </span>
          <b aria-hidden="true">•••</b>
        </button>
      </nav>

      {showOperatorMenu && (
        <div className="operator-menu-layer" onMouseDown={() => setShowOperatorMenu(false)}>
          <section aria-label="Maya Brooks operator options" className="operator-menu" id="operator-profile-menu" onMouseDown={(event) => event.stopPropagation()} role="menu">
            <header>
              <span className="avatar avatar-maya">MB</span>
              <span><strong>Maya Brooks</strong><small>Security administrator</small></span>
              <i><b /> Active</i>
            </header>
            <div className="operator-menu-options">
              <button onClick={() => { setShowOperatorMenu(false); setShowOperatorProfile(true); }} role="menuitem" type="button"><span aria-hidden="true">MB</span><span><strong>Operator profile</strong><small>Identity, role, and permissions</small></span><b aria-hidden="true">›</b></button>
              <button onClick={() => { setShowOperatorMenu(false); setShowSettings(true); }} role="menuitem" type="button"><span aria-hidden="true">Aa</span><span><strong>Display settings</strong><small>Theme, text size, and dashboard</small></span><b aria-hidden="true">›</b></button>
              <button onClick={() => { setShowOperatorMenu(false); setActiveView("activity"); }} role="menuitem" type="button"><span aria-hidden="true">LG</span><span><strong>Activity log</strong><small>Review every recorded action</small></span><b aria-hidden="true">›</b></button>
              <button onClick={() => { setShowOperatorMenu(false); setActiveView("command"); }} role="menuitem" type="button"><span aria-hidden="true">CC</span><span><strong>Command center</strong><small>Door modes and person grants</small></span><b aria-hidden="true">›</b></button>
            </div>
            <footer><span>DC-01</span><small>Simulation environment</small></footer>
          </section>
        </div>
      )}

      {showAddPerson && data && (
        <AddPersonDialog
          organizations={data.organizations}
          onClose={() => setShowAddPerson(false)}
          onSaved={async (message) => {
            setShowAddPerson(false);
            setFlash({ tone: "success", message });
            await loadState();
          }}
        />
      )}
      {showCreateVisit && data && (
        <CreateVisitDialog
          organizations={data.organizations}
          zones={data.zones}
          onClose={() => setShowCreateVisit(false)}
          onSaved={async (ticketNumber) => {
            setShowCreateVisit(false);
            setFlash({ tone: "success", message: `${ticketNumber} was created for DC-01.` });
            await loadState();
          }}
        />
      )}

      {flash && <div className={`toast ${flash.tone}`}><span />{flash.message}</div>}
      {activeStatTab && data && (
        <StatLogDrawer tab={activeStatTab} data={data} onClose={() => setActiveStatTab(null)} />
      )}
      {showSettings && (
        <SettingsDrawer
          theme={theme}
          fontSize={fontSize}
          density={density}
          widgets={dashboardWidgets}
          onThemeChange={(value) => { setTheme(value); window.localStorage.setItem("ny-secure-theme", value); }}
          onFontSizeChange={updateFontSize}
          onDensityChange={updateDensity}
          onWidgetsChange={updateDashboardWidgets}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showOperatorProfile && <OperatorProfileDrawer onClose={() => setShowOperatorProfile(false)} />}
    </main>
  );
}

function LoadingState() {
  return (
    <div className="loading-grid" aria-label="Loading simulator">
      <div /><div /><div /><div />
      <section /><section />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state">
      <span>!</span>
      <h2>We couldn’t open the facility database.</h2>
      <p>{message}</p>
      <button className="primary-button" onClick={onRetry} type="button">Try again</button>
    </div>
  );
}

function StatCard({
  labelText,
  value,
  detail,
  trend,
  tone,
  onClick,
}: {
  labelText: string;
  value: number;
  detail: string;
  trend: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button className={`stat-card ${tone}`} onClick={onClick} type="button" aria-label={`Open ${labelText} log`}>
      <div className="stat-card-top"><span>{labelText}</span><i className="stat-glyph" /></div>
      <strong>{value.toLocaleString()}</strong>
      <div className="stat-footer"><span>{detail}</span><b>{trend} · View log →</b></div>
    </button>
  );
}

function Overview({
  data,
  stats,
  selectedZone,
  selectedZoneId,
  setSelectedZoneId,
  profileMap,
  activeAssignmentsFor,
  onViewAll,
  onOpenStat,
  enabledWidgets,
  onCustomize,
}: {
  data: StatePayload;
  stats: { activePeople: number; credentials: number; grants: number; denials: number };
  selectedZone?: Zone;
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  profileMap: Map<string, Profile>;
  activeAssignmentsFor: (personId: string) => Assignment[];
  onViewAll: () => void;
  onOpenStat: (tab: StatTab) => void;
  enabledWidgets: DashboardWidget[];
  onCustomize: () => void;
}) {
  const has = (widget: DashboardWidget) => enabledWidgets.includes(widget);
  const onSiteCheckIns = data.checkIns.filter((checkIn) => checkIn.status === "ON_SITE");
  const onSiteOrganizations = new Set(onSiteCheckIns.map((checkIn) => checkIn.organizationId)).size;
  if (enabledWidgets.length === 0) {
    return (
      <section className="dashboard-empty panel">
        <span className="dashboard-empty-icon" aria-hidden="true">＋</span>
        <p className="eyebrow">Your overview</p>
        <h2>Start with a clean canvas.</h2>
        <p>Choose only the security information you want to see when you open NY-Secure. You can change it at any time.</p>
        <button className="primary-button" onClick={onCustomize} type="button">Choose dashboard widgets</button>
      </section>
    );
  }
  return (
    <>
      {has("stats") && <div className="stats-grid">
        <StatCard labelText="People on site" value={stats.activePeople} detail={`Across ${onSiteOrganizations} organizations`} trend={`${data.checkIns.filter((checkIn) => checkIn.status === "PENDING").length} pending`} tone="teal" onClick={() => onOpenStat("people")} />
        <StatCard labelText="Active credentials" value={stats.credentials} detail="2 expire this week" trend="98% healthy" tone="blue" onClick={() => onOpenStat("credentials")} />
        <StatCard labelText="Access granted" value={stats.grants} detail="Today’s decisions" trend="+8.2%" tone="green" onClick={() => onOpenStat("grants")} />
        <StatCard labelText="Access denied" value={stats.denials} detail="Review recommended" trend={`${Math.min(stats.denials, 9)} open`} tone="amber" onClick={() => onOpenStat("denials")} />
      </div>}

      {(has("facility") || has("activity")) && <div className={`overview-grid ${has("facility") !== has("activity") ? "single-widget" : ""}`}>
        {has("facility") && <section className="panel facility-panel">
          <PanelHeader eyebrow="Live facility" title="NY-Secure DC-01" meta="80 readers online" />
          <FacilityMap
            zones={data.zones}
            selectedZoneId={selectedZoneId}
            setSelectedZoneId={setSelectedZoneId}
          />
          <div className="map-legend">
            <span><i className="legend-common" />Common</span>
            <span><i className="legend-tenant" />Colocation</span>
            <span><i className="legend-critical" />Critical</span>
            <span><i className="legend-logistics" />Logistics</span>
          </div>
          {selectedZone && (
            <div className="zone-strip">
              <div className={`zone-level level-${selectedZone.securityLevel}`}>L{selectedZone.securityLevel}</div>
              <div>
                <small>Selected zone</small>
                <strong>{selectedZone.name}</strong>
              </div>
              <div className="zone-strip-meta">
                <span>Status <b className="status-inline"><i />{label(selectedZone.status)}</b></span>
                <span>Owner <b>{selectedZone.tenantName || "NY-Secure Operations"}</b></span>
              </div>
              <button type="button">Inspect →</button>
            </div>
          )}
        </section>}

        {has("activity") && <section className="panel activity-panel">
          <PanelHeader eyebrow="Streaming now" title="Recent activity" action="View full log" onAction={onViewAll} />
          <div className="event-feed">
            {data.events.slice(0, 7).map((event) => (
              <EventFeedItem key={event.id} event={event} />
            ))}
          </div>
        </section>}
      </div>}

      {(has("attention") || has("roster")) && <div className={`secondary-grid ${has("attention") !== has("roster") ? "single-widget" : ""}`}>
        {has("attention") && <section className="panel attention-panel">
          <PanelHeader eyebrow="Action queue" title="Needs attention" meta="3 items" />
          <div className="attention-list">
            <div className="attention-item amber-attention">
              <span className="attention-icon">!</span>
              <div><strong>2 temporary assignments expire soon</strong><small>Priya Patel · Marcus Green</small></div>
              <button type="button">Review</button>
            </div>
            <div className="attention-item blue-attention">
              <span className="attention-icon">↗</span>
              <div><strong>Visitor awaiting check-in</strong><small>Jordan Lee · Host: Elena Ruiz</small></div>
              <button type="button">Open</button>
            </div>
          </div>
        </section>}
        {has("roster") && <section className="panel roster-panel">
          <PanelHeader eyebrow="Security verified" title="On-site roster" meta={`${onSiteCheckIns.length} people`} />
          <div className="mini-roster">
            {onSiteCheckIns.slice(0, 5).map((checkIn, index) => {
              const person = data.people.find((candidate) => candidate.id === checkIn.personId);
              return <div className="mini-person" key={checkIn.id}>
                <span className={`avatar hue-${index % 5}`}>{person ? initials(person.firstName, person.lastName) : checkIn.personName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <div><strong>{checkIn.personName}</strong><small>{checkIn.organizationName}</small></div>
                <div className="mini-person-access">
                  {activeAssignmentsFor(checkIn.personId).slice(0, 1).map((assignment) => (
                    <span key={assignment.id}>{profileMap.get(assignment.profileId)?.name}</span>
                  ))}
                </div>
                <b className="on-site-dot" title="On site" />
              </div>;
            })}
            {onSiteCheckIns.length === 0 && <p className="empty-copy">No security-verified visitors are on-site.</p>}
          </div>
        </section>}
      </div>}
    </>
  );
}

function PanelHeader({
  eyebrow,
  title,
  meta,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <header className="panel-header">
      <div><p>{eyebrow}</p><h2>{title}</h2></div>
      {action ? <button onClick={onAction} type="button">{action} →</button> : <span><i />{meta}</span>}
    </header>
  );
}

function FacilityMap({
  zones,
  selectedZoneId,
  setSelectedZoneId,
  large = false,
}: {
  zones: Zone[];
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  large?: boolean;
}) {
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  return (
    <div className={large ? "floor-plan floor-plan-large" : "floor-plan"}>
      {FLOOR_ROOMS.map((room) => {
        const zone = zoneMap.get(room.id);
        return (
          <button
            className={`map-room ${room.kind} ${selectedZoneId === room.id ? "selected" : ""}`}
            key={room.id}
            onClick={() => setSelectedZoneId(room.id)}
            style={{ gridArea: room.area }}
            title={zone ? `${zone.name} · Security level ${zone.securityLevel}` : room.short}
            type="button"
          >
            <span>{room.short}</span>
            {room.kind === "tenant" && <small>{zone?.tenantName || "Unassigned"}</small>}
            {room.kind === "critical" && <i className="critical-mark">⚡</i>}
            <b className="room-reader" />
          </button>
        );
      })}
      <span className="map-north">N ↑</span>
    </div>
  );
}

function EventFeedItem({ event }: { event: AccessEvent }) {
  return (
    <article className="event-item">
      <span className={`decision-mark ${event.decision.toLowerCase()}`}>{event.decision === "GRANTED" ? "✓" : "×"}</span>
      <div className="event-copy">
        <small>Who</small><strong>{event.personName || "Unknown credential"}</strong>
      </div>
      <div className="event-copy event-what"><small>What</small><strong>{event.decision === "GRANTED" ? "Access granted" : "Access denied"}</strong><span>{label(event.reasonCode)}</span></div>
      <div className="event-copy event-where"><small>Where</small><strong>{event.zoneName || label(event.zoneId)}</strong></div>
      <div className="event-time"><small>Time</small><strong>{formatTime(event.occurredAt)}</strong><span>{relativeEventTime(event.occurredAt)}</span></div>
    </article>
  );
}

function Operations({
  data,
  selectedPersonId,
  setSelectedPersonId,
  selectedZoneId,
  setSelectedZoneId,
  selectedPerson,
  result,
  simulating,
  onSimulate,
  profileMap,
  assignments,
}: {
  data: StatePayload;
  selectedPersonId: string;
  setSelectedPersonId: (id: string) => void;
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  selectedPerson?: Person;
  result: { decision: "GRANTED" | "DENIED"; reasonCode: string; explanation: string; matchedProfileName?: string } | null;
  simulating: boolean;
  onSimulate: () => void;
  profileMap: Map<string, Profile>;
  assignments: Assignment[];
}) {
  const zone = data.zones.find((candidate) => candidate.id === selectedZoneId);
  return (
    <div className="operations-grid">
      <section className="panel simulator-panel">
        <div className="simulator-heading">
          <div className="reader-visual"><span /><span /><span /><b /></div>
          <div><p>Policy decision engine</p><h2>Simulate a badge presentation</h2><span>No door hardware will be activated.</span></div>
        </div>
        <div className="simulation-form">
          <label>
            <span>1. Select a person</span>
            <select value={selectedPersonId} onChange={(event) => setSelectedPersonId(event.target.value)}>
              {data.people.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.badgeId}</option>)}
            </select>
          </label>
          <div className="selection-card">
            {selectedPerson && <>
              <span className="avatar hue-2">{initials(selectedPerson.firstName, selectedPerson.lastName)}</span>
              <div><strong>{selectedPerson.firstName} {selectedPerson.lastName}</strong><small>{selectedPerson.organizationName} · {label(selectedPerson.jobFunction)}</small></div>
              <span className={`credential-pill ${selectedPerson.badgeStatus.toLowerCase()}`}><i />{label(selectedPerson.badgeStatus)}</span>
            </>}
          </div>
          <label>
            <span>2. Present at a zone reader</span>
            <select value={selectedZoneId} onChange={(event) => setSelectedZoneId(event.target.value)}>
              {data.zones.map((item) => <option key={item.id} value={item.id}>{item.name} · Level {item.securityLevel}</option>)}
            </select>
          </label>
          <div className="selection-card zone-selection">
            <span className={`zone-level level-${zone?.securityLevel ?? 1}`}>L{zone?.securityLevel ?? 1}</span>
            <div><strong>{zone?.name}</strong><small>{label(zone?.type ?? "Zone")} · Reader online</small></div>
            <span className="reader-online"><i /> Online</span>
          </div>
          <button className="simulate-button" disabled={simulating} onClick={onSimulate} type="button">
            <span className="button-reader-icon" />{simulating ? "Evaluating policy…" : "Present credential"}
          </button>
        </div>
      </section>

      <section className={`panel decision-panel ${result ? result.decision.toLowerCase() : "empty"}`}>
        {!result ? (
          <div className="decision-empty">
            <div className="decision-rings"><span /><span /><span /></div>
            <h2>Ready for a credential</h2>
            <p>The authorization path will appear here in plain language.</p>
          </div>
        ) : (
          <div className="decision-result">
            <span className="decision-kicker">Access decision</span>
            <div className="decision-hero-mark">{result.decision === "GRANTED" ? "✓" : "×"}</div>
            <h2>{result.decision}</h2>
            <p>{result.explanation}</p>
            <div className="decision-path">
              <div><span>01</span><p><small>Identity</small><strong>{selectedPerson?.firstName} {selectedPerson?.lastName}</strong></p><b>✓</b></div>
              <div><span>02</span><p><small>Credential</small><strong>{selectedPerson?.badgeId} · {label(selectedPerson?.badgeStatus ?? "")}</strong></p><b>✓</b></div>
              <div><span>03</span><p><small>Policy match</small><strong>{result.matchedProfileName || label(result.reasonCode)}</strong></p><b>{result.decision === "GRANTED" ? "✓" : "×"}</b></div>
              <div><span>04</span><p><small>Schedule</small><strong>{result.decision === "GRANTED" ? "Within permitted window" : "No valid grant found"}</strong></p><b>{result.decision === "GRANTED" ? "✓" : "—"}</b></div>
            </div>
            <div className="reason-code"><span>Reason code</span><code>{result.reasonCode}</code></div>
          </div>
        )}
      </section>

      <section className="panel assignment-summary">
        <PanelHeader eyebrow="Effective now" title="Person’s access" meta={`${assignments.length} active`} />
        <div className="assignment-chip-list">
          {assignments.length === 0 && <p className="empty-copy">This person has no active access assignments.</p>}
          {assignments.map((assignment) => {
            const profile = profileMap.get(assignment.profileId);
            return <div className="assignment-chip" key={assignment.id}><span>◆</span><div><strong>{profile?.name}</strong><small>{profile?.schedule} · {formatDate(assignment.validUntil)}</small></div></div>;
          })}
        </div>
      </section>
      <section className="panel live-stream-panel">
        <PanelHeader eyebrow="Latest decisions" title="Event stream" meta="Live" />
        <div className="event-feed compact">{data.events.slice(0, 4).map((event) => <EventFeedItem key={event.id} event={event} />)}</div>
      </section>
    </div>
  );
}

function PeopleView({
  people,
  orgMap,
  assignments,
  profiles,
  events,
  zones,
  checkIns,
  onCheckInsChanged,
  globalQuery,
}: {
  people: Person[];
  orgMap: Map<string, Organization>;
  assignments: Assignment[];
  profiles: Map<string, Profile>;
  events: AccessEvent[];
  zones: Map<string, Zone>;
  checkIns: SiteCheckIn[];
  onCheckInsChanged: () => Promise<void>;
  globalQuery: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [oid, setOid] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState<{ firstName: string; lastName: string; company: string; oid: string } | null>(null);
  const [openPeople, setOpenPeople] = useState<Person[]>([]);
  const [storedPeopleTab, setActivePeopleTab] = useState("onsite");
  const activePeopleTab = globalQuery.trim() ? "global" : storedPeopleTab;
  const [checkInAction, setCheckInAction] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState("");
  const [onSiteQuery, setOnSiteQuery] = useState("");
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const onSite = checkIns.filter((checkIn) => checkIn.status === "ON_SITE");
  const filteredOnSite = useMemo(() => checkIns
    .filter((checkIn) => checkIn.status === "ON_SITE")
    .filter((checkIn) => {
      const person = peopleById.get(checkIn.personId);
      return wildcardMatchAny([
        checkIn.personName,
        checkIn.organizationName,
        checkIn.badgeNumber,
        checkIn.relationshipType,
        checkIn.lastScanZone,
        person?.firstName,
        person?.lastName,
        person?.email,
      ], onSiteQuery);
    })
    .sort((a, b) => a.personName.localeCompare(b.personName)), [checkIns, onSiteQuery, peopleById]);
  const pending = checkIns.filter((checkIn) => checkIn.status === "PENDING");
  const history = checkIns
    .filter((checkIn) => checkIn.status === "SIGNED_OUT" && checkIn.verifiedAt && checkIn.signedOutAt)
    .sort((a, b) => new Date(b.signedOutAt!).getTime() - new Date(a.signedOutAt!).getTime());
  const canSearch = [firstName, lastName, company, oid].some((value) => value.trim().length > 0);
  const filteredPeople = useMemo(() => {
    if (!submittedSearch) return [];
    return people.filter((person) => {
      const organization = orgMap.get(person.organizationId);
      return (
        wildcardMatch(person.firstName, submittedSearch.firstName) &&
        wildcardMatch(person.lastName, submittedSearch.lastName) &&
        wildcardMatch(person.organizationName || organization?.name || "", submittedSearch.company) &&
        wildcardMatch(organization?.oid || person.organizationId, submittedSearch.oid)
      );
    });
  }, [orgMap, people, submittedSearch]);
  const globalPeople = useMemo(() => people.filter((person) => {
    const organization = orgMap.get(person.organizationId);
    return wildcardMatchAny([
      person.firstName,
      person.lastName,
      `${person.firstName} ${person.lastName}`,
      person.badgeId,
      person.email,
      person.organizationName,
      organization?.name,
      organization?.oid,
    ], globalQuery);
  }), [globalQuery, orgMap, people]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSearch) return;
    setSubmittedSearch({ firstName: firstName.trim(), lastName: lastName.trim(), company: company.trim(), oid: oid.trim() });
    setActivePeopleTab("results");
  }

  function openProfile(person: Person) {
    setOpenPeople((current) => current.some((item) => item.id === person.id) ? current : [...current, person]);
    setActivePeopleTab(person.id);
  }

  function closeProfile(personId: string) {
    setOpenPeople((current) => current.filter((person) => person.id !== personId));
    if (activePeopleTab === personId) setActivePeopleTab("onsite");
  }

  async function updateCheckIn(id: string, action: "VERIFY" | "SIGN_OUT" | "REJECT") {
    setCheckInAction(`${id}-${action}`);
    setCheckInError("");
    try {
      const response = await fetch("/api/check-ins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The check-in could not be updated.");
      await onCheckInsChanged();
      if (action === "VERIFY") setActivePeopleTab("onsite");
    } catch (error) {
      setCheckInError(error instanceof Error ? error.message : "The check-in could not be updated.");
    } finally {
      setCheckInAction(null);
    }
  }

  const activePerson = openPeople.find((person) => person.id === activePeopleTab);

  return (
    <div className="people-workspace">
      <nav className="people-workspace-tabs" aria-label="Open People tabs">
        <button className={activePeopleTab === "onsite" ? "active" : ""} onClick={() => setActivePeopleTab("onsite")} type="button"><span aria-hidden="true">●</span> On-site <b>{onSite.length}</b></button>
        <button className={activePeopleTab === "pending" ? "active" : ""} onClick={() => setActivePeopleTab("pending")} type="button"><span aria-hidden="true">◷</span> Pending <b>{pending.length}</b></button>
        <button className={activePeopleTab === "history" ? "active" : ""} onClick={() => setActivePeopleTab("history")} type="button"><span aria-hidden="true">↶</span> History <b>{history.length}</b></button>
        <button className={activePeopleTab === "search" ? "active" : ""} onClick={() => setActivePeopleTab("search")} type="button"><span aria-hidden="true">⌕</span> Directory</button>
        {globalQuery.trim() && <button className={activePeopleTab === "global" ? "active" : ""} type="button"><span aria-hidden="true">⌘</span> Global results <b>{globalPeople.length}</b></button>}
        {submittedSearch && <div className={activePeopleTab === "results" ? "people-tab-shell active" : "people-tab-shell"}><button className="person-tab results-tab" onClick={() => setActivePeopleTab("results")} type="button"><span aria-hidden="true">⌗</span> Search results</button><button className="close-people-tab" aria-label="Close search results" onClick={() => { setSubmittedSearch(null); if (activePeopleTab === "results") setActivePeopleTab("search"); }} type="button">×</button></div>}
        {openPeople.map((person) => <div className={activePeopleTab === person.id ? "people-tab-shell active" : "people-tab-shell"} key={person.id}><button className="person-tab" onClick={() => setActivePeopleTab(person.id)} type="button"><span className="mini-contact-photo" aria-hidden="true"><i /></span>{person.firstName} {person.lastName}</button><button className="close-people-tab" aria-label={`Close ${person.firstName} ${person.lastName} profile`} onClick={() => closeProfile(person.id)} type="button">×</button></div>)}
      </nav>
    {checkInError && <div className="people-checkin-error" role="alert">{checkInError}</div>}
    {activePeopleTab === "onsite" && <section className="panel people-presence-panel">
      <header className="presence-header"><div><p className="eyebrow">Security-verified arrivals</p><h2>People currently on-site</h2><p>A searchable contact-card roster for everyone security has verified on site.</p></div><span className="presence-total"><strong>{onSite.length}</strong><small>On-site now</small></span></header>
      {onSite.length > 0 && <div className="onsite-directory-toolbar"><label className="table-search"><span aria-hidden="true">⌕</span><input aria-label="Search people currently on-site" onChange={(event) => setOnSiteQuery(event.target.value)} placeholder="Search name, company, card, or last scan… Try *Patel*" title="Use * to match any characters" value={onSiteQuery} /></label><span className="result-count">Showing {filteredOnSite.length} of {onSite.length}</span></div>}
      {filteredOnSite.length > 0 ? <div className="contact-card-grid onsite-contact-grid">{filteredOnSite.map((checkIn) => {
        const person = peopleById.get(checkIn.personId);
        return <article className="person-contact-card onsite-contact-card" key={checkIn.id}>
          <span className="contact-card-type onsite"><i />On-site · {label(checkIn.relationshipType)}</span>
          <div className="contact-card-body onsite-contact-main">
            <button aria-label={`Open profile for ${checkIn.personName}`} className="onsite-profile-trigger" disabled={!person} onClick={() => person && openProfile(person)} type="button"><span className="contact-card-photo" aria-label="No profile photo"><i /><b /></span><span className="contact-card-name"><strong>{checkIn.personName}</strong><small>{checkIn.organizationName}</small></span></button>
            <div className="onsite-card-actions"><span className="contact-card-menu" aria-hidden="true">⠿</span><button className="onsite-signout-button" disabled={checkInAction === `${checkIn.id}-SIGN_OUT`} onClick={() => updateCheckIn(checkIn.id, "SIGN_OUT")} type="button">{checkInAction === `${checkIn.id}-SIGN_OUT` ? "Signing out…" : "Sign out"}</button></div>
          </div>
        </article>;
      })}</div> : onSite.length > 0 ? <div className="presence-empty onsite-search-empty"><span>⌕</span><h3>No matching people on site</h3><p>Try another name, company, card number, or wildcard pattern.</p></div> : <div className="presence-empty"><span>◎</span><h3>No verified visitors are on-site</h3><p>People appear here after security approves their portal or kiosk sign-in.</p></div>}
    </section>}
    {activePeopleTab === "pending" && <section className="panel people-presence-panel pending-presence-panel">
      <header className="presence-header"><div><p className="eyebrow">Awaiting identity check</p><h2>Pending security verification</h2><p>Review portal and kiosk arrivals before allowing them onto the active on-site roster.</p></div><span className="presence-total pending"><strong>{pending.length}</strong><small>Waiting</small></span></header>
      {pending.length > 0 ? <div className="pending-checkin-list">{pending.map((checkIn) => <article key={checkIn.id}>
        <div className="pending-person"><span className="avatar hue-4">{checkIn.personName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{checkIn.personName}</strong><small>{checkIn.organizationName} · {label(checkIn.relationshipType)}</small></div></div>
        <div className="pending-origin"><span>{label(checkIn.source)} sign-in</span><strong>{formatTime(checkIn.requestedAt)}</strong><small>{relativeEventTime(checkIn.requestedAt)}</small></div>
        <div className="pending-credential"><span>Badge</span><code>{checkIn.badgeNumber}</code></div>
        <div className="pending-actions"><button className="secondary-button reject-checkin" disabled={checkInAction !== null} onClick={() => updateCheckIn(checkIn.id, "REJECT")} type="button">Reject</button><button className="primary-button" disabled={checkInAction !== null} onClick={() => updateCheckIn(checkIn.id, "VERIFY")} type="button">{checkInAction === `${checkIn.id}-VERIFY` ? "Verifying…" : "Verify & sign in"}</button></div>
      </article>)}</div> : <div className="presence-empty"><span>✓</span><h3>No pending sign-ins</h3><p>New portal and kiosk arrivals will wait here for security.</p></div>}
    </section>}
    {activePeopleTab === "history" && <section className="panel people-presence-panel checkin-history-panel">
      <header className="presence-header"><div><p className="eyebrow">Completed on-site visits</p><h2>Sign-in history</h2><p>A durable record of when security admitted each person, when they left, and their total time on-site.</p></div><span className="presence-total history"><strong>{history.length}</strong><small>Completed</small></span></header>
      <div className="table-wrap"><table className="data-table checkin-history-table"><thead><tr><th>Person</th><th>Customer</th><th>Signed in</th><th>Signed out</th><th>Time on-site</th><th>Verification</th></tr></thead><tbody>{history.map((checkIn) => <tr key={checkIn.id}>
        <td><strong>{checkIn.personName}</strong><small>{label(checkIn.relationshipType)} · <code>{checkIn.badgeNumber}</code></small></td>
        <td><strong>{checkIn.organizationName}</strong><small>{label(checkIn.source)} arrival</small></td>
        <td><strong>{formatDate(checkIn.verifiedAt)} · {formatTime(checkIn.verifiedAt!)}</strong><small>Requested {formatTime(checkIn.requestedAt)}</small></td>
        <td><strong>{formatDate(checkIn.signedOutAt)} · {formatTime(checkIn.signedOutAt!)}</strong><small>{relativeEventTime(checkIn.signedOutAt!)}</small></td>
        <td><span className="time-on-site">{formatOnSiteDuration(checkIn.verifiedAt, checkIn.signedOutAt)}</span></td>
        <td><strong>{checkIn.verifiedBy || "Security"}</strong><small>Identity verified</small></td>
      </tr>)}</tbody></table>{history.length === 0 && <div className="presence-empty"><span>↶</span><h3>No completed sign-ins yet</h3><p>Signed-out visits will appear here with their total time on-site.</p></div>}</div>
    </section>}
    {activePeopleTab === "global" && globalQuery.trim() && <section className="panel contact-results-panel"><header><div><p className="eyebrow">Wildcard global search</p><h2>Results for “{globalQuery}”</h2><p>{globalPeople.length} {globalPeople.length === 1 ? "person matches" : "people match"} across names, badges, emails, companies, and OIDs.</p></div><span className="wildcard-example"><code>*some*</code> contains · <code>*ome</code> ends with · <code>som*</code> starts with</span></header>{globalPeople.length > 0 ? <div className="contact-card-grid">{globalPeople.map((person) => { const organization = orgMap.get(person.organizationId); const isInternal = person.relationshipType === "ENGINEER" || organization?.type === "DATA_CENTER_OPERATOR"; return <button className="person-contact-card" key={person.id} onClick={() => openProfile(person)} type="button"><span className={`contact-card-type ${isInternal ? "internal" : "customer"}`}>{isInternal ? "Internal" : "Customer"}</span><span className="contact-card-body"><span className="contact-card-photo" aria-label="No profile photo"><i /><b /></span><span className="contact-card-name"><strong>{person.firstName} {person.lastName}</strong><small>{person.badgeId} · {organization?.name ?? person.organizationName}</small></span><span className="contact-card-menu" aria-hidden="true">⠿</span></span></button>; })}</div> : <div className="table-empty contact-results-empty"><span>⌕</span><h3>No matching people</h3><p>Try another wildcard pattern.</p></div>}</section>}
    {activePeopleTab === "search" && <section className="panel directory-panel people-directory">
      <div className="people-search-header">
        <div>
          <p className="eyebrow">Directory search</p>
          <h2>Find a person</h2>
          <p>Search by first name, last name, OID, or company. Use * as a wildcard.</p>
        </div>
      </div>
      <form className="people-search-box" onSubmit={search}>
        <div className="people-search-grid">
          <label className="people-query"><span>First name</span><input aria-label="Search by first name" placeholder="e.g. Ama*" title="Use * to match any characters" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus /></label>
          <label className="people-query"><span>Last name</span><input aria-label="Search by last name" placeholder="e.g. *kafor" title="Use * to match any characters" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label className="people-query"><span>Company name</span><input aria-label="Search by company name" placeholder="e.g. *Securities*" title="Use * to match any characters" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
          <label className="people-query"><span>OID</span><input aria-label="Search by OID" placeholder="e.g. OID-CITADEL-*" title="Use * to match any characters" value={oid} onChange={(event) => setOid(event.target.value)} /></label>
          <button className="primary-button people-search-button" disabled={!canSearch} type="submit"><span aria-hidden="true">⌕</span> Search</button>
        </div>
      </form>
      <div className="people-search-empty"><span>⌕</span><h3>Enter one or more fields, then select Search</h3></div>
    </section>}
    {activePeopleTab === "results" && submittedSearch && <section className="panel contact-results-panel"><header><div><p className="eyebrow">Directory matches</p><h2>Search results</h2><p>{filteredPeople.length} {filteredPeople.length === 1 ? "person" : "people"} matched all entered parameters.</p></div><button className="secondary-button" onClick={() => setActivePeopleTab("search")} type="button">Modify search</button></header>{filteredPeople.length > 0 ? <div className="contact-card-grid">{filteredPeople.map((person) => { const organization = orgMap.get(person.organizationId); const isInternal = person.relationshipType === "ENGINEER" || organization?.type === "DATA_CENTER_OPERATOR"; return <button className="person-contact-card" key={person.id} onClick={() => openProfile(person)} type="button"><span className={`contact-card-type ${isInternal ? "internal" : "customer"}`}>{isInternal ? "Internal" : "Customer"}</span><span className="contact-card-body"><span className="contact-card-photo" aria-label="No profile photo"><i /><b /></span><span className="contact-card-name"><strong>{person.firstName} {person.lastName}</strong><small>{organization?.name ?? person.organizationName}</small></span><span className="contact-card-menu" aria-hidden="true">⠿</span></span></button>; })}</div> : <div className="table-empty contact-results-empty"><span>⌕</span><h3>No matching people</h3><p>Return to Directory search and check the entered parameters.</p></div>}</section>}
    {activePerson && <PersonProfileCard person={activePerson} organization={orgMap.get(activePerson.organizationId)} assignments={assignments.filter((assignment) => assignment.personId === activePerson.id && assignment.status === "ACTIVE")} profiles={profiles} events={events.filter((event) => event.personId === activePerson.id)} zones={zones} />}
    </div>
  );
}

function PersonProfileCard({
  person,
  organization,
  assignments,
  profiles,
  events,
  zones,
  initialTab = "access",
}: {
  person: Person;
  organization?: Organization;
  assignments: Assignment[];
  profiles: Map<string, Profile>;
  events: AccessEvent[];
  zones: Map<string, Zone>;
  initialTab?: ProfileTab;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [profileOpenedAt] = useState(() => Date.now());
  const cageIds = Array.from(new Set(assignments.flatMap((assignment) => profiles.get(assignment.profileId)?.zones ?? []).filter((zoneId) => zones.get(zoneId)?.type === "CAGE" || zoneId.startsWith("zone-cage-"))));
  const recentEvents = events.filter((event) => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= profileOpenedAt - 24 * 60 * 60 * 1000 && occurredAt <= profileOpenedAt;
  });
  const recentLocations = new Set(recentEvents.map((event) => event.zoneName ?? event.zoneId)).size;
  return (
      <article className="panel person-profile-card person-profile-page" aria-label={`${person.firstName} ${person.lastName} profile`}>
        <aside className="profile-identity">
          <span className="blank-contact-photo" aria-label="No profile photo"><i /><b /></span>
          <h2>{person.firstName} {person.lastName}</h2>
          <span className="profile-record-type">{person.relationshipType === "ENGINEER" ? "Internal employee" : label(person.relationshipType)}</span>
          <dl>
            <div><dt>IBX access PIN</dt><dd><code>{person.ibxAccessPin}</code></dd></div>
            <div><dt>OID</dt><dd><code>{organization?.oid ?? person.organizationId}</code></dd></div>
            <div><dt>Company</dt><dd>{organization?.name ?? person.organizationName}</dd></div>
            <div><dt>Credit hold</dt><dd><span className={`credit-hold ${person.creditHold ? "on-hold" : "clear"}`}><i />{person.creditHold ? "On hold" : "No hold"}</span></dd></div>
          </dl>
        </aside>
        <section className="profile-details">
          <nav className="profile-tabs" aria-label="Profile sections">
            <button className={activeTab === "access" ? "active" : ""} onClick={() => setActiveTab("access")} type="button">Access</button>
            <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")} type="button">24-hour scans</button>
            <button className={activeTab === "contact" ? "active" : ""} onClick={() => setActiveTab("contact")} type="button">Contact</button>
          </nav>
          <div className="profile-tab-content">
            {activeTab === "access" && <div className="profile-access"><div className="profile-tab-heading"><p className="eyebrow">Current authorization</p><h3>Cages and cabinets</h3></div>{cageIds.length > 0 ? <div className="cage-access-list">{cageIds.map((zoneId) => { const cage = zones.get(zoneId); const number = cage?.name.match(/\d+/)?.[0] ?? zoneId.replace("zone-cage-", ""); return <article key={zoneId}><span className="cage-access-icon">▦</span><div><strong>{cage?.name ?? `Cage ${number}`}</strong><small>Cabinets</small><p><code>CAB-{number}-01</code><code>CAB-{number}-02</code></p></div></article>; })}</div> : <div className="profile-empty"><span>⊘</span><strong>No cage or cabinet assignments</strong><p>This person has no active customer-space authorization.</p></div>}</div>}
            {activeTab === "history" && <div className="profile-history"><div className="profile-tab-heading"><p className="eyebrow">Last 24 hours</p><h3>Scan locations</h3><div className="profile-history-summary"><span>{recentEvents.length} scan{recentEvents.length === 1 ? "" : "s"}</span><span>{recentLocations} location{recentLocations === 1 ? "" : "s"}</span></div></div>{recentEvents.length > 0 ? <div className="profile-history-list">{recentEvents.map((event) => <article key={event.id}><span className={`history-mark ${event.decision.toLowerCase()}`}>{event.decision === "GRANTED" ? "✓" : "×"}</span><div><strong>{event.zoneName ?? event.zoneId}</strong><small>{event.decision === "GRANTED" ? "Access granted" : "Access denied"}</small></div><time><b>{formatDate(event.occurredAt)}</b><small>{formatTime(event.occurredAt)}</small></time></article>)}</div> : <div className="profile-empty"><span>⌁</span><strong>No scans in the last 24 hours</strong><p>Recent scan locations will appear here after a recorded event.</p></div>}</div>}
            {activeTab === "contact" && <div className="profile-contact"><div className="profile-tab-heading"><p className="eyebrow">Directory details</p><h3>Contact</h3></div><dl><div><dt>Company</dt><dd>{organization?.name ?? person.organizationName}</dd></div><div><dt>Point of contact</dt><dd>{organization?.contactName || "Not provided"}</dd></div><div><dt>Point-of-contact phone</dt><dd>{organization?.contactPhone ? <a href={`tel:${organization.contactPhone}`}>{organization.contactPhone}</a> : "Not provided"}</dd></div><div><dt>Person’s phone</dt><dd>{person.phoneNumber ? <a href={`tel:${person.phoneNumber}`}>{person.phoneNumber}</a> : "Not provided"}</dd></div><div><dt>Work email</dt><dd><a href={`mailto:${person.email}`}>{person.email}</a></dd></div></dl></div>}
          </div>
        </section>
      </article>
  );
}

function OrganizationsView({ organizations, people, zones }: { organizations: Organization[]; people: Person[]; zones: Zone[] }) {
  return (
    <div className="organization-grid">
      {organizations.map((org, index) => {
        const orgPeople = people.filter((person) => person.organizationId === org.id);
        const ownedZones = zones.filter((zone) => zone.tenantOrganizationId === org.id);
        return (
          <article className="panel organization-card" key={org.id}>
            <div className="org-card-top"><span className={`org-logo org-hue-${index % 6}`}>{org.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className={`type-pill ${org.type.toLowerCase()}`}>{label(org.type)}</span><button type="button">•••</button></div>
            <h2>{org.name}</h2>
            <p>{org.type === "DATA_CENTER_OPERATOR" ? "Site owner and facility operator" : org.type === "COLOCATION_CUSTOMER" ? "Colocation tenant organization" : org.type === "NETWORK_PROVIDER" ? "Approved network service provider" : "Approved service partner"}</p>
            <div className="org-metrics"><div><strong>{orgPeople.length}</strong><small>People</small></div><div><strong>{ownedZones.length}</strong><small>Owned zones</small></div><div><strong>{orgPeople.filter((person) => person.badgeStatus === "ACTIVE").length}</strong><small>Active badges</small></div></div>
            <div className="org-people-stack">{orgPeople.slice(0, 4).map((person, personIndex) => <span className={`avatar hue-${personIndex % 5}`} key={person.id}>{initials(person.firstName, person.lastName)}</span>)}{orgPeople.length === 0 && <small>No people added yet</small>}</div>
            {ownedZones.length > 0 && <div className="org-zone"><span>Dedicated space</span><strong>{ownedZones.map((zone) => zone.name).join(", ")}</strong></div>}
          </article>
        );
      })}
    </div>
  );
}

function PoliciesView({ profiles, assignments, zones }: { profiles: Profile[]; assignments: Assignment[]; zones: Zone[] }) {
  const [search, setSearch] = useState("");
  const filteredProfiles = profiles.filter((profile) => wildcardMatchAny([
    profile.name,
    profile.description,
    profile.schedule,
    ...(profile.zones ?? []).map((zoneId) => zones.find((zone) => zone.id === zoneId)?.name || zoneId),
  ], search));
  return (
    <div className="policies-layout">
      <section className="panel policy-table-panel">
        <div className="directory-toolbar"><label className="table-search"><span>⌕</span><input aria-label="Search policies" onChange={(event) => setSearch(event.target.value)} placeholder="Search policies… Try *critical*" title="Use * to match any characters" value={search} /></label><div className="toolbar-filters"><button type="button">All schedules <span>⌄</span></button><button type="button">All scopes <span>⌄</span></button></div><span className="result-count">{filteredProfiles.length} profiles</span></div>
        <div className="policy-list">
          {filteredProfiles.map((profile, index) => {
            const assignees = assignments.filter((assignment) => assignment.profileId === profile.id && assignment.status === "ACTIVE");
            return (
              <article className="policy-row" key={profile.id}>
                <span className={`policy-icon policy-hue-${index % 5}`}>◆</span>
                <div className="policy-main"><div><h3>{profile.name}</h3><span className="status-pill active"><i />Active</span></div><p>{profile.description}</p><div className="policy-tags"><span>◷ {profile.schedule}</span><span>⌑ {profile.zoneCount ?? profile.zones?.length ?? 0} zones</span><span>♙ {assignees.length} assignees</span></div></div>
                <div className="policy-scope"><small>Sample coverage</small><div>{(profile.zones ?? []).slice(0, 3).map((zoneId) => <span key={zoneId}>{zones.find((zone) => zone.id === zoneId)?.name || zoneId}</span>)}</div></div>
                <button className="row-action" type="button">View policy</button>
              </article>
            );
          })}
          {filteredProfiles.length === 0 && <div className="activity-empty"><strong>No matching policies</strong><span>Try another wildcard pattern.</span></div>}
        </div>
      </section>
      <aside className="panel policy-principles">
        <p className="eyebrow">Policy model</p><h2>Least privilege, by design.</h2><p>Roles describe people. Profiles grant doors for a schedule and an expiration window.</p>
        <div className="principle-flow"><div><span>1</span><strong>Identity</strong><small>Who are they?</small></div><i>→</i><div><span>2</span><strong>Profile</strong><small>What is allowed?</small></div><i>→</i><div><span>3</span><strong>Schedule</strong><small>When is it valid?</small></div></div>
        <div className="default-deny"><span>⊘</span><div><strong>Default deny</strong><p>If no active rule matches the reader and time, access is denied and explained.</p></div></div>
      </aside>
    </div>
  );
}

function FacilityView({ zones, selectedZone, selectedZoneId, setSelectedZoneId }: { zones: Zone[]; selectedZone?: Zone; selectedZoneId: string; setSelectedZoneId: (id: string) => void }) {
  return (
    <div className="facility-layout">
      <aside className="panel facility-tree">
        <PanelHeader eyebrow="Zone hierarchy" title="DC-01" meta={`${zones.length} zones`} />
        <div className="tree-list"><div className="tree-root"><span>▾</span><strong>NY-Secure</strong></div><div className="tree-branch"><div><span>▾</span><strong>Perimeter & common</strong></div>{zones.filter((zone) => ["EXTERIOR", "LOBBY", "MANTRAP", "SECURE_CORRIDOR"].includes(zone.type)).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div><div className="tree-branch cage-tree"><div><span>▾</span><strong>Hall A cages · 11000–11300</strong></div>{zones.filter((zone) => zone.type === "CAGE" && zone.id.startsWith("zone-cage-11")).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div><div className="tree-branch cage-tree"><div><span>▾</span><strong>Hall B cages · 22000–22300</strong></div>{zones.filter((zone) => zone.type === "CAGE" && zone.id.startsWith("zone-cage-22")).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div><div className="tree-branch"><div><span>▾</span><strong>Critical facilities</strong></div>{zones.filter((zone) => ["UPS_ROOM", "GENERATOR_ROOM", "NOC"].includes(zone.type)).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div><div className="tree-branch"><div><span>▾</span><strong>Logistics</strong></div>{zones.filter((zone) => ["LOADING_DOCK", "STAGING"].includes(zone.type)).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div></div>
      </aside>
      <section className="panel facility-canvas">
        <PanelHeader eyebrow="Interactive floor plan" title="Ground level" meta="Live status" />
        <FacilityMap zones={zones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} large />
      </section>
      <aside className="panel zone-inspector">
        <div className="inspector-hero"><span className={`zone-level level-${selectedZone?.securityLevel ?? 1}`}>L{selectedZone?.securityLevel ?? 1}</span><p>Security level</p></div>
        <p className="eyebrow">Zone detail</p><h2>{selectedZone?.name}</h2><span className="status-pill active"><i />{label(selectedZone?.status ?? "Active")}</span>
        <dl><div><dt>Zone type</dt><dd>{label(selectedZone?.type ?? "")}</dd></div><div><dt>Tenant</dt><dd>{selectedZone?.tenantName || "NY-Secure Operations"}</dd></div><div><dt>Readers</dt><dd>1 online</dd></div><div><dt>Occupancy</dt><dd>{selectedZone?.type === "CAGE" ? "2 people" : "Clear"}</dd></div></dl>
        <button className="secondary-button" type="button">View access rules</button>
      </aside>
    </div>
  );
}

function ScheduledVisitsView({ visits, onVisitsChanged }: { visits: ScheduledVisit[]; onVisitsChanged: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [columnFilters, setColumnFilters] = useState({ ticket: "", visitor: "", customer: "", access: "", window: "", delivery: "", status: "" });
  const [openTicketNumbers, setOpenTicketNumbers] = useState<string[]>([]);
  const [activeTicketNumber, setActiveTicketNumber] = useState<string | null>(null);
  const [photoVerified, setPhotoVerified] = useState<Record<string, boolean>>({});
  const [startingTicket, setStartingTicket] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState("");
  const [ticketPanels, setTicketPanels] = useState<Record<string, "details" | "comments">>({});
  const [timePopup, setTimePopup] = useState<string | null>(null);
  const [visitClock, setVisitClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setVisitClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const isSignedIn = (visit: ScheduledVisit) => Boolean(visit.signedInAt && !visit.signedOutAt);
  const isExpired = (visit: ScheduledVisit) => new Date(visit.validUntil).getTime() < visitClock;
  const effectiveVisitStatus = (visit: ScheduledVisit): ScheduledVisit["status"] => isExpired(visit) && isSignedIn(visit) ? "OVERDUE" : isExpired(visit) ? "EXPIRED" : visit.status;
  const visibleVisits = visits.filter((visit) => !isExpired(visit) || isSignedIn(visit));
  const filteredVisits = visibleVisits.filter((visit) => {
    const effectiveStatus = effectiveVisitStatus(visit);
    const matchesSearch = wildcardMatchAny([visit.ticketNumber, visit.visitorName, visit.organizationName, visit.requesterName, visit.cageName, visit.cabinetAccess.join(" "), visit.comments, visit.packageDetails], search);
    const deliveryLabel = visit.hasDelivery ? `${visit.packageCount} package${visit.packageCount === 1 ? "" : "s"} ${visit.packageDetails}` : "None";
    const validWindow = `${formatDate(visit.validFrom)} ${formatTime(visit.validFrom)} ${formatDate(visit.validUntil)} ${formatTime(visit.validUntil)}`;
    return matchesSearch &&
      (status === "ALL" || effectiveStatus === status) &&
      wildcardMatchAny([visit.ticketNumber, visit.siteCode, visit.comments], columnFilters.ticket) &&
      wildcardMatchAny([visit.visitorName, visit.visitorEmail, visit.visitorPhone], columnFilters.visitor) &&
      wildcardMatchAny([visit.organizationName, visit.requesterName], columnFilters.customer) &&
      wildcardMatchAny([visit.cageName, visit.cabinetAccess.join(" ")], columnFilters.access) &&
      wildcardMatch(validWindow, columnFilters.window) &&
      wildcardMatch(deliveryLabel, columnFilters.delivery) &&
      wildcardMatch(label(effectiveStatus), columnFilters.status);
  });
  const scheduledCount = visibleVisits.filter((visit) => effectiveVisitStatus(visit) === "SCHEDULED").length;
  const activeCount = visibleVisits.filter(isSignedIn).length;
  const deliveryCount = visibleVisits.filter((visit) => visit.hasDelivery && visit.status !== "CANCELLED").length;
  const setColumnFilter = (column: keyof typeof columnFilters, value: string) => setColumnFilters((current) => ({ ...current, [column]: value }));
  const activeTicket = activeTicketNumber ? visits.find((visit) => visit.ticketNumber === activeTicketNumber) : undefined;

  function openTicket(ticketNumber: string) {
    setOpenTicketNumbers((current) => current.includes(ticketNumber) ? current : [...current, ticketNumber]);
    setActiveTicketNumber(ticketNumber);
    setTicketError("");
  }

  function closeTicket(ticketNumber: string) {
    setOpenTicketNumbers((current) => current.filter((item) => item !== ticketNumber));
    if (activeTicketNumber === ticketNumber) setActiveTicketNumber(null);
    setTicketError("");
  }

  async function startTicket(visit: ScheduledVisit) {
    setStartingTicket(visit.ticketNumber);
    setTicketError("");
    try {
      const response = await fetch("/api/visits", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketNumber: visit.ticketNumber, action: "START", photoVerified: photoVerified[visit.ticketNumber] === true }),
      });
      const result = (await response.json()) as { error?: string; code?: string };
      if (!response.ok) {
        if (result.code === "VISIT_TIME_NOT_ALLOWED") setTimePopup(result.error || "Please check the time.");
        throw new Error(result.error || "The work visit could not be started.");
      }
      await onVisitsChanged();
      setPhotoVerified((current) => ({ ...current, [visit.ticketNumber]: false }));
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : "The work visit could not be started.");
    } finally {
      setStartingTicket(null);
    }
  }

  return (
    <div className="visits-workspace">
      <nav className="people-workspace-tabs visit-workspace-tabs" aria-label="Open scheduled visit tabs">
        <button className={activeTicketNumber === null ? "active" : ""} onClick={() => { setActiveTicketNumber(null); setTicketError(""); }} type="button"><span aria-hidden="true">▦</span> Scheduled visits <b>{visibleVisits.length}</b></button>
        {openTicketNumbers.map((ticketNumber) => <div className={activeTicketNumber === ticketNumber ? "people-tab-shell active" : "people-tab-shell"} key={ticketNumber}><button className="person-tab visit-ticket-tab" onClick={() => { setActiveTicketNumber(ticketNumber); setTicketError(""); }} type="button"><span aria-hidden="true">▣</span> {ticketNumber}</button><button aria-label={`Close work visit ${ticketNumber}`} className="close-people-tab" onClick={() => closeTicket(ticketNumber)} type="button">×</button></div>)}
      </nav>

      {activeTicketNumber === null && <><div className="visit-summary-grid">
        <article className="panel visit-summary-card"><span>Upcoming</span><strong>{scheduledCount}</strong><small>Scheduled visit tickets</small></article>
        <article className="panel visit-summary-card active"><span>On site now</span><strong>{activeCount}</strong><small>Security-signed-in visitors</small></article>
        <article className="panel visit-summary-card delivery"><span>Deliveries</span><strong>{deliveryCount}</strong><small>Upcoming package arrivals</small></article>
      </div>
      <section className="panel directory-panel visits-panel">
        <div className="directory-toolbar activity-toolbar visits-toolbar">
          <label className="table-search"><span>⌕</span><input aria-label="Search scheduled visits" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visits… Try 01-*" title="Use * to match any characters" /></label>
          <div className="toolbar-filters visit-filters">
            <select aria-label="Filter visits by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option><option value="SCHEDULED">Scheduled</option><option value="ACTIVE">Active</option><option value="OVERDUE">Signed in · overdue</option><option value="CANCELLED">Cancelled</option></select>
          </div>
          <span className="result-count">{filteredVisits.length} tickets</span>
        </div>
        <div className="table-wrap">
          <table className="data-table visits-table">
            <thead><tr>
              <th><span>Ticket</span><input aria-label="Filter Ticket column" onChange={(event) => setColumnFilter("ticket", event.target.value)} placeholder="01-*" title="Use * to match any characters" value={columnFilters.ticket} /></th>
              <th><span>Visitor</span><input aria-label="Filter Visitor column" onChange={(event) => setColumnFilter("visitor", event.target.value)} placeholder="Name or email" title="Use * to match any characters" value={columnFilters.visitor} /></th>
              <th><span>Customer / requester</span><input aria-label="Filter Customer or requester column" onChange={(event) => setColumnFilter("customer", event.target.value)} placeholder="Customer or NOC" title="Use * to match any characters" value={columnFilters.customer} /></th>
              <th><span>Cage & cabinets</span><input aria-label="Filter Cage and cabinets column" onChange={(event) => setColumnFilter("access", event.target.value)} placeholder="Cage or cabinet" title="Use * to match any characters" value={columnFilters.access} /></th>
              <th><span>Valid window</span><input aria-label="Filter Valid window column" onChange={(event) => setColumnFilter("window", event.target.value)} placeholder="Date or time" title="Use * to match any characters" value={columnFilters.window} /></th>
              <th><span>Delivery</span><input aria-label="Filter Delivery column" onChange={(event) => setColumnFilter("delivery", event.target.value)} placeholder="Package or None" title="Use * to match any characters" value={columnFilters.delivery} /></th>
              <th><span>Status</span><input aria-label="Filter Status column" onChange={(event) => setColumnFilter("status", event.target.value)} placeholder="Status" title="Use * to match any characters" value={columnFilters.status} /></th>
            </tr></thead>
            <tbody>{filteredVisits.map((visit) => {
              const effectiveStatus = effectiveVisitStatus(visit);
              return <tr className={effectiveStatus === "OVERDUE" ? "overdue-visit" : undefined} key={visit.ticketNumber} onDoubleClick={() => openTicket(visit.ticketNumber)} title="Double-click to open this work visit">
                <td><button aria-label={`Open work visit ${visit.ticketNumber}`} className="ticket-number ticket-number-link" onClick={() => openTicket(visit.ticketNumber)} type="button">{visit.ticketNumber}</button><small>{visit.siteCode}</small>{visit.comments && <small title={visit.comments}>Comment added</small>}</td>
                <td><strong>{visit.visitorName}</strong><small>{visit.visitorEmail || visit.visitorPhone || "Contact not provided"}</small></td>
                <td><strong>{visit.organizationName}</strong><small>{visit.requesterName}</small></td>
                <td><strong>{visit.cageName}</strong><div className="cabinet-tags">{visit.cabinetAccess.map((cabinet) => <span key={cabinet}>{cabinet}</span>)}</div></td>
                <td><strong>{formatDate(visit.validFrom)} · {formatTime(visit.validFrom)}</strong><small>Until {formatDate(visit.validUntil)} · {formatTime(visit.validUntil)}</small></td>
                <td>{visit.hasDelivery ? <><strong>{visit.packageCount} package{visit.packageCount === 1 ? "" : "s"}</strong><small>{visit.packageDetails || "Package delivery"}</small></> : <span className="no-delivery">None</span>}</td>
                <td><span className={`visit-status ${effectiveStatus.toLowerCase()}`}><i />{effectiveStatus === "OVERDUE" ? "Signed in · overdue" : label(effectiveStatus)}</span>{isSignedIn(visit) && <small>Signed in {formatTime(visit.signedInAt!)}</small>}</td>
              </tr>;
            })}</tbody>
          </table>
          {filteredVisits.length === 0 && <div className="activity-empty"><strong>No matching visit tickets</strong><span>Try another search or status filter.</span></div>}
        </div>
      </section>
      </>}

      {activeTicketNumber !== null && activeTicket && (() => {
        const effectiveStatus = effectiveVisitStatus(activeTicket);
        const signedIn = isSignedIn(activeTicket);
        const startsAt = new Date(activeTicket.validFrom).getTime();
        const endsAt = new Date(activeTicket.validUntil).getTime();
        const startsLater = visitClock < startsAt;
        const expired = visitClock > endsAt;
        const canStart = !signedIn && activeTicket.status !== "CANCELLED" && !startsLater && !expired;
        const activePanel = ticketPanels[activeTicket.ticketNumber] ?? "details";
        return <section className={`panel visit-ticket-detail ${effectiveStatus === "OVERDUE" ? "overdue" : ""}`}>
          <header className="visit-ticket-detail-header"><div><p className="eyebrow">DC-01 work visit</p><h2>{activeTicket.ticketNumber}</h2><p>Security ticket record and visitor admission workflow.</p></div><span className={`visit-status ${effectiveStatus.toLowerCase()}`}><i />{effectiveStatus === "OVERDUE" ? "Signed in · overdue" : label(effectiveStatus)}</span></header>
          {ticketError && <div className="visit-ticket-error" role="alert">{ticketError}</div>}
          <div className="visit-ticket-detail-layout">
            <section className="visit-ticket-information">
              <nav className="visit-detail-tabs" aria-label="Work visit ticket sections"><button className={activePanel === "details" ? "active" : ""} onClick={() => setTicketPanels((current) => ({ ...current, [activeTicket.ticketNumber]: "details" }))} type="button">Ticket details</button><button className={activePanel === "comments" ? "active" : ""} onClick={() => setTicketPanels((current) => ({ ...current, [activeTicket.ticketNumber]: "comments" }))} type="button">NOC / POC comments{activeTicket.comments ? <b>1</b> : null}</button></nav>
              {activePanel === "details" ? <><div className="visit-ticket-section-heading"><p className="eyebrow">Work authorization</p><h3>Ticket information</h3><p>The approved access scope and overall validity window for this visit.</p></div>
              <dl className="visit-ticket-facts">
                <div className="wide"><dt>Point of contact</dt><dd><strong>{activeTicket.requesterName}</strong><small>{activeTicket.organizationName}</small></dd></div>
                <div><dt>Work visit number</dt><dd><code>{activeTicket.ticketNumber}</code></dd></div>
                <div><dt>Site</dt><dd>{activeTicket.siteCode}</dd></div>
                <div><dt>Cage</dt><dd>{activeTicket.cageName}</dd></div>
                <div><dt>Cabinets</dt><dd><span className="cabinet-tags">{activeTicket.cabinetAccess.map((cabinet) => <span key={cabinet}>{cabinet}</span>)}</span></dd></div>
                <div><dt>Ticket starts</dt><dd><strong>{formatDate(activeTicket.validFrom)}</strong><small>{formatTime(activeTicket.validFrom)} · 24-hour time</small></dd></div>
                <div><dt>Ticket ends</dt><dd><strong>{formatDate(activeTicket.validUntil)}</strong><small>{formatTime(activeTicket.validUntil)} · {formatOnSiteDuration(activeTicket.validFrom, activeTicket.validUntil)} window</small></dd></div>
                <div className="wide"><dt>Delivery</dt><dd>{activeTicket.hasDelivery ? <><strong>{activeTicket.packageCount} package{activeTicket.packageCount === 1 ? "" : "s"}</strong><small>{activeTicket.packageDetails || "Package delivery attached to this visit."}</small></> : "No delivery is attached to this visit."}</dd></div>
              </dl></> : <div className="visit-comments-panel">
                <div className="visit-ticket-section-heading"><p className="eyebrow">Requester instructions</p><h3>NOC / point-of-contact comments</h3><p>Review comments and every explicitly approved working hour before starting the visit.</p></div>
                <article className="visit-comment-card"><header><strong>{activeTicket.requesterName}</strong><span>{activeTicket.organizationName}</span></header><p>{activeTicket.comments || "No comments were added by the NOC or point of contact."}</p></article>
                <section className="visit-authorized-hours"><header><div><p className="eyebrow">Mandatory schedule</p><h4>Authorized work hours</h4></div><span>DC-01 · 24-hour clock</span></header>
                  {Object.entries(activeTicket.allowedHours).sort(([a], [b]) => a.localeCompare(b)).map(([date, hours]) => <div className="visit-authorized-hour-row" key={date}><code>{date}:</code><span>{formatVisitHours(hours)}</span></div>)}
                  {Object.keys(activeTicket.allowedHours).length === 0 && <p className="visit-hours-missing">No authorized hours are recorded. This ticket cannot be started.</p>}
                </section>
              </div>}
            </section>
            <aside className="visit-ticket-identity">
              <div className="visit-photo-frame"><span className="blank-contact-photo" aria-label="Visitor photo placeholder"><i /><b /></span><em>Visitor photo</em></div>
              <p className="eyebrow">Person on ticket</p><h3>{activeTicket.visitorName}</h3><span className="profile-record-type">Scheduled visitor</span>
              <dl><div><dt>Email</dt><dd>{activeTicket.visitorEmail ? <a href={`mailto:${activeTicket.visitorEmail}`}>{activeTicket.visitorEmail}</a> : "Not provided"}</dd></div><div><dt>Phone</dt><dd>{activeTicket.visitorPhone ? <a href={`tel:${activeTicket.visitorPhone}`}>{activeTicket.visitorPhone}</a> : "Not provided"}</dd></div>{signedIn && <div><dt>Security started ticket</dt><dd>{formatDate(activeTicket.signedInAt)} · {formatTime(activeTicket.signedInAt!)}</dd></div>}</dl>
              {!signedIn && activeTicket.status !== "CANCELLED" && !expired && <label className="visit-photo-verification"><input checked={photoVerified[activeTicket.ticketNumber] === true} onChange={(event) => setPhotoVerified((current) => ({ ...current, [activeTicket.ticketNumber]: event.target.checked }))} type="checkbox" /><span><strong>Photo verified</strong><small>I compared the visitor and their ID with the ticket record.</small></span></label>}
              <button className="primary-button start-visit-button" disabled={!canStart || photoVerified[activeTicket.ticketNumber] !== true || startingTicket === activeTicket.ticketNumber} onClick={() => startTicket(activeTicket)} type="button"><span aria-hidden="true">✓</span>{signedIn ? "Ticket active" : startsLater ? `Starts at ${formatTime(activeTicket.validFrom)}` : expired ? "Ticket expired" : startingTicket === activeTicket.ticketNumber ? "Starting ticket…" : "Verify photo & start ticket"}</button>
              {signedIn && <p className="visit-ticket-active-note"><span>●</span> Visitor is signed in and the work visit is active.</p>}
              {!signedIn && startsLater && <p className="visit-ticket-timing-note">This ticket can be started when its approved window begins.</p>}
            </aside>
          </div>
        </section>;
      })()}
      {timePopup && <div className="visit-time-popup-backdrop" role="presentation" onMouseDown={() => setTimePopup(null)}><section className="visit-time-popup" role="alertdialog" aria-modal="true" aria-labelledby="visit-time-popup-title" onMouseDown={(event) => event.stopPropagation()}><span aria-hidden="true">◷</span><h2 id="visit-time-popup-title">Please check the time</h2><p>{timePopup}</p><small>Open the NOC / POC comments tab to review the authorized hours for each date.</small><button className="primary-button" onClick={() => setTimePopup(null)} type="button">Close</button></section></div>}
    </div>
  );
}

function LocatorView({ events, people, orgMap }: { events: AccessEvent[]; people: Person[]; orgMap: Map<string, Organization> }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [searchRequest, setSearchRequest] = useState<{ firstName: string; lastName: string; cardNumber: string; requestedAt: number } | null>(null);
  const peopleMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const hasDraftCriteria = [firstName, lastName, cardNumber].some((value) => value.trim().length > 0);
  const hasSearchCriteria = Boolean(searchRequest && [searchRequest.firstName, searchRequest.lastName, searchRequest.cardNumber].some(Boolean));
  const results = useMemo(() => {
    if (!searchRequest) return [];
    const cutoff = searchRequest.requestedAt - 48 * 60 * 60 * 1000;
    const latestByPerson = new Map<string, AccessEvent>();

    for (const event of events) {
      const occurredAt = new Date(event.occurredAt).getTime();
      if (!Number.isFinite(occurredAt) || occurredAt > searchRequest.requestedAt) continue;
      if (!hasSearchCriteria && occurredAt < cutoff) continue;

      const person = peopleMap.get(event.personId);
      if (hasSearchCriteria && !(
        wildcardMatch(person?.firstName ?? "", searchRequest.firstName) &&
        wildcardMatch(person?.lastName ?? "", searchRequest.lastName) &&
        wildcardMatch(person?.badgeId ?? "", searchRequest.cardNumber)
      )) continue;

      const key = event.personId || event.personName || String(event.id);
      const current = latestByPerson.get(key);
      if (!current || occurredAt > new Date(current.occurredAt).getTime()) latestByPerson.set(key, event);
    }

    return Array.from(latestByPerson.values())
      .map((event) => {
        const person = peopleMap.get(event.personId);
        return { event, person, organization: person ? orgMap.get(person.organizationId) : undefined };
      })
      .sort((a, b) => new Date(b.event.occurredAt).getTime() - new Date(a.event.occurredAt).getTime());
  }, [events, hasSearchCriteria, orgMap, peopleMap, searchRequest]);
  const grantedCount = results.filter(({ event }) => event.decision === "GRANTED").length;
  const locationCount = new Set(results.map(({ event }) => event.zoneName || event.zoneId)).size;
  const searchDescription = searchRequest ? [
    searchRequest.firstName && `First name “${searchRequest.firstName}”`,
    searchRequest.lastName && `Last name “${searchRequest.lastName}”`,
    searchRequest.cardNumber && `Card “${searchRequest.cardNumber}”`,
  ].filter(Boolean).join(" · ") : "";

  function locate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchRequest({ firstName: firstName.trim(), lastName: lastName.trim(), cardNumber: cardNumber.trim(), requestedAt: Date.now() });
  }

  return (
    <div className="locator-layout">
      <section className="panel directory-panel people-directory locator-directory locator-workspace-card">
        <div className="people-search-header">
          <div><p className="eyebrow">Activity-log lookup</p><h2>Find a last-known scan</h2><p>Search by first name, last name, and/or card number. Populated fields must all match. Use * as a wildcard.</p></div>
        </div>
        <form className="people-search-box locator-search-box" onSubmit={locate}>
          <div className="people-search-grid locator-search-grid">
            <label className="people-query"><span>First name</span><input aria-label="Locate by first name" autoFocus onChange={(event) => setFirstName(event.target.value)} placeholder="e.g. Ama*" title="Use * to match any characters" value={firstName} /></label>
            <label className="people-query"><span>Last name</span><input aria-label="Locate by last name" onChange={(event) => setLastName(event.target.value)} placeholder="e.g. *kafor" title="Use * to match any characters" value={lastName} /></label>
            <label className="people-query"><span>Card number</span><input aria-label="Locate by card number" onChange={(event) => setCardNumber(event.target.value)} placeholder="e.g. CUS-*" title="Use * to match any characters" value={cardNumber} /></label>
            <button className="primary-button people-search-button locator-search-button" type="submit"><span aria-hidden="true">⌖</span>{hasDraftCriteria ? "Locate person" : "Locate everyone"}</button>
          </div>
        </form>
        <div className="locator-mode-note"><span>48h</span><p><strong>Empty-search mode</strong> scans the activity log and returns each person’s single most recent location within the last 48 hours.</p></div>

        {!searchRequest && <div className="locator-waiting"><span aria-hidden="true">⌖</span><h2>Ready to locate</h2><p>Enter one or more identity fields, or submit all three empty fields for the 48-hour roster.</p></div>}

        {searchRequest && <div className="locator-inline-results">
          <section className="locator-results-panel">
          <header><div><p className="eyebrow">{hasSearchCriteria ? "Complete log search" : "Past 48 hours"}</p><h2>{hasSearchCriteria ? "Latest matching scans" : "Everyone’s latest scan"}</h2><p>{hasSearchCriteria ? searchDescription : "One most-recent activity-log result per person."}</p></div><span className="result-count">{results.length} {results.length === 1 ? "person" : "people"}</span></header>
          <div className="table-wrap"><table className="data-table locator-table"><thead><tr><th>Who</th><th>Customer</th><th>Last location</th><th>Decision</th><th>Last scan</th></tr></thead><tbody>{results.map(({ event, person, organization }) => <tr key={event.personId || event.id}>
            <td><strong>{person ? `${person.firstName} ${person.lastName}` : event.personName || "Unknown credential"}</strong><small>{person?.badgeId || "No linked badge"}</small></td>
            <td><strong>{organization?.name || person?.organizationName || event.organizationName || "Unassigned"}</strong><small>{organization?.oid || "No OID"}</small></td>
            <td><strong>{event.zoneName || event.zoneId}</strong><small>Entry reader</small></td>
            <td><span className={`decision-pill ${event.decision.toLowerCase()}`}>{event.decision === "GRANTED" ? "✓" : "×"} {event.decision === "GRANTED" ? "Access granted" : "Access denied"}</span><small>{label(event.reasonCode)}</small></td>
            <td><strong>{formatDate(event.occurredAt)} · {formatTime(event.occurredAt)}</strong><small>{relativeEventTime(event.occurredAt)}</small></td>
          </tr>)}</tbody></table>{results.length === 0 && <div className="activity-empty"><strong>No matching scans found</strong><span>{hasSearchCriteria ? "Try different first-name, last-name, or card-number values." : "No one has a recorded scan in the past 48 hours."}</span></div>}</div>
          </section>
          <footer className="locator-summary-footer" aria-label="Locator result summary">
            <span><b>{results.length}</b> people located</span>
            <span><b>{grantedCount}</b> last scans granted</span>
            <span><b>{locationCount}</b> locations represented</span>
          </footer>
        </div>}
      </section>
    </div>
  );
}

type DoorControl = {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  category: string;
  location: string;
  securityTier: number;
  mode: "NORMAL" | "UNLOCKED" | "LOCKED";
  grantedPersonId?: string | null;
  grantedPersonName?: string | null;
  grantExpiresAt?: string | null;
  updatedBy: string;
  updatedAt: string;
};

type DoorControlEvent = {
  id: string;
  zoneId: string;
  zoneName: string;
  personId?: string | null;
  personName?: string | null;
  action: "UNLOCK" | "LOCK" | "NORMAL" | "GRANT_PERSON";
  detail: string;
  operatorName: string;
  createdAt: string;
};

function CommandCenterView({ zones, people, onCommandsChanged }: { zones: Zone[]; people: Person[]; onCommandsChanged: () => void | Promise<void> }) {
  const [doors, setDoors] = useState<DoorControl[]>([]);
  const [events, setEvents] = useState<DoorControlEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [selectedPeople, setSelectedPeople] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [runningAction, setRunningAction] = useState("");
  const activePeople = people.filter((person) => person.status === "ACTIVE").sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  const loadControls = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/command-center", { cache: "no-store" });
      const result = (await response.json()) as { doors?: DoorControl[]; events?: DoorControlEvent[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Door controls could not be loaded.");
      setDoors(result.doors ?? []);
      setEvents(result.events ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Door controls could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadControls(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadControls]);

  async function runDoorAction(zoneId: string, action: "UNLOCK" | "LOCK" | "NORMAL" | "GRANT_PERSON") {
    const actionKey = `${zoneId}-${action}`;
    setRunningAction(actionKey);
    setError("");
    try {
      const response = await fetch("/api/command-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          zoneId,
          action,
          personId: selectedPeople[zoneId] || activePeople[0]?.id,
          durationMinutes: Number(durations[zoneId] || 60),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The door command could not be completed.");
      await loadControls();
      await onCommandsChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The door command could not be completed.");
    } finally {
      setRunningAction("");
    }
  }

  const filteredDoors = doors.filter((door) =>
    (modeFilter === "ALL" || door.mode === modeFilter) &&
    wildcardMatchAny([door.zoneName, door.zoneCode, door.category, door.location, door.grantedPersonName], query),
  );
  const unlockedCount = doors.filter((door) => door.mode === "UNLOCKED").length;
  const lockedCount = doors.filter((door) => door.mode === "LOCKED").length;
  const grantCount = doors.filter((door) => Boolean(door.grantedPersonId)).length;

  return <div className="command-center-layout">
    <section className="command-summary-grid">
      <article className="panel"><span>Available doors</span><strong>{zones.filter((zone) => zone.status === "ONLINE").length}</strong><small>DC-01 readers under control</small></article>
      <article className="panel unlocked"><span>Remotely unlocked</span><strong>{unlockedCount}</strong><small>Badge scanning bypassed</small></article>
      <article className="panel locked"><span>Locked down</span><strong>{lockedCount}</strong><small>All credential access denied</small></article>
      <article className="panel granted"><span>Person grants</span><strong>{grantCount}</strong><small>Active door-specific overrides</small></article>
    </section>

    <section className="panel command-door-panel">
      <header className="command-panel-header"><div><p className="eyebrow">All controlled entrances</p><h2>Door controls</h2><p>Remote commands override normal credential policy until badge control is restored.</p></div><span><i />Live controls</span></header>
      <div className="directory-toolbar command-toolbar"><label className="table-search"><span>⌕</span><input aria-label="Search command center doors" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search door, code, or location…" title="Use * to match any characters" /></label><select aria-label="Filter doors by control mode" value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}><option value="ALL">All control modes</option><option value="NORMAL">Badge control</option><option value="UNLOCKED">Remotely unlocked</option><option value="LOCKED">Locked down</option></select><span className="result-count">{filteredDoors.length} doors</span></div>
      {error && <div className="command-error" role="alert">{error}</div>}
      {loading ? <div className="command-loading">Loading door controls…</div> : <div className="command-door-grid">{filteredDoors.map((door) => {
        const selectedPersonId = selectedPeople[door.zoneId] || activePeople[0]?.id || "";
        return <article className={`command-door-card ${door.mode.toLowerCase()}`} key={door.zoneId}>
          <header><div className="door-control-icon" aria-hidden="true"><span /><i /></div><div><strong>{door.zoneName}</strong><small>{door.zoneCode} · {label(door.category)} · Level {door.securityTier}</small></div><span className={`door-mode ${door.mode.toLowerCase()}`}>{door.mode === "NORMAL" ? "Badge control" : door.mode === "UNLOCKED" ? "Remotely unlocked" : "Locked down"}</span></header>
          <div className="door-control-state"><span>Current behavior</span><p>{door.mode === "UNLOCKED" ? "Door is open and badge scans are bypassed." : door.mode === "LOCKED" ? "Door rejects every badge, including otherwise-valid credentials." : "Normal profile, schedule, and credential checks apply."}</p>{door.grantedPersonName && <div className="door-person-grant"><b>Person grant</b><strong>{door.grantedPersonName}</strong><small>Until {formatDate(door.grantExpiresAt)} · {formatTime(door.grantExpiresAt!)}</small></div>}</div>
          <div className="door-command-actions"><button className="unlock-command" disabled={door.mode === "UNLOCKED" || Boolean(runningAction)} onClick={() => runDoorAction(door.zoneId, "UNLOCK")} type="button">{runningAction === `${door.zoneId}-UNLOCK` ? "Unlocking…" : "Remote unlock"}</button><button className="lock-command" disabled={door.mode === "LOCKED" || Boolean(runningAction)} onClick={() => runDoorAction(door.zoneId, "LOCK")} type="button">{runningAction === `${door.zoneId}-LOCK` ? "Locking…" : "Lock door"}</button><button className="normal-command" disabled={door.mode === "NORMAL" && !door.grantedPersonId || Boolean(runningAction)} onClick={() => runDoorAction(door.zoneId, "NORMAL")} type="button">Badge control</button></div>
          <div className="door-person-access"><p><strong>Grant person access</strong><small>Door-specific access without changing their profile.</small></p><select aria-label={`Person for ${door.zoneName}`} value={selectedPersonId} onChange={(event) => setSelectedPeople((current) => ({ ...current, [door.zoneId]: event.target.value }))}>{activePeople.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.badgeId}</option>)}</select><select aria-label={`Grant duration for ${door.zoneName}`} value={durations[door.zoneId] || "60"} onChange={(event) => setDurations((current) => ({ ...current, [door.zoneId]: event.target.value }))}><option value="15">15 minutes</option><option value="60">1 hour</option><option value="480">8 hours</option></select><button disabled={door.mode === "LOCKED" || !selectedPersonId || Boolean(runningAction)} onClick={() => runDoorAction(door.zoneId, "GRANT_PERSON")} type="button">{runningAction === `${door.zoneId}-GRANT_PERSON` ? "Granting…" : "Grant access"}</button></div>
          <footer><span>Last changed by {door.updatedBy}</span><time>{relativeEventTime(door.updatedAt)}</time></footer>
        </article>;
      })}{filteredDoors.length === 0 && <div className="command-empty"><span>⌕</span><strong>No matching doors</strong><p>Try another door name, code, location, or control mode.</p></div>}</div>}
    </section>

    <section className="panel command-log-panel"><header className="command-panel-header"><div><p className="eyebrow">Operator audit trail</p><h2>Recent control commands</h2><p>Remote unlocks, lockdowns, badge-control resets, and person grants.</p></div><span>{events.length} events</span></header><div className="command-event-list">{events.map((event) => <article key={event.id}><span className={`command-event-mark ${event.action.toLowerCase()}`}>{event.action === "UNLOCK" ? "↗" : event.action === "LOCK" ? "×" : event.action === "NORMAL" ? "✓" : "+"}</span><div><strong>{event.zoneName}</strong><p>{event.detail}</p><small>{event.operatorName}{event.personName ? ` · ${event.personName}` : ""}</small></div><time><strong>{formatTime(event.createdAt)}</strong><small>{relativeEventTime(event.createdAt)}</small></time></article>)}{events.length === 0 && <div className="command-empty compact"><span>✓</span><strong>No control commands yet</strong><p>Door actions will appear here.</p></div>}</div></section>
  </div>;
}

function AlarmsView({
  alarms,
  people,
  orgMap,
  assignments,
  profiles,
  events,
  zones,
}: {
  alarms: Alarm[];
  people: Person[];
  orgMap: Map<string, Organization>;
  assignments: Assignment[];
  profiles: Map<string, Profile>;
  events: AccessEvent[];
  zones: Map<string, Zone>;
}) {
  const [search, setSearch] = useState("");
  const [alarmType, setAlarmType] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [contextMenu, setContextMenu] = useState<{ personId: string; x: number; y: number } | null>(null);
  const [profileRequest, setProfileRequest] = useState<{ personId: string; tab: ProfileTab } | null>(null);
  const alarmTypes = Array.from(new Set(alarms.map((alarm) => alarm.alarmType))).sort();
  const filteredAlarms = alarms.filter((alarm) => {
    const matchesSearch = wildcardMatchAny([alarm.personName, alarm.alarmType, label(alarm.alarmType), alarm.zoneName, alarm.source, alarm.detail], search);
    const matchesType = alarmType === "ALL" || alarm.alarmType === alarmType;
    const matchesSeverity = severity === "ALL" || alarm.severity === severity;
    return matchesSearch && matchesType && matchesSeverity;
  });
  const profilePerson = profileRequest ? people.find((person) => person.id === profileRequest.personId) : undefined;

  useEffect(() => {
    if (!contextMenu && !profileRequest) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (profileRequest) setProfileRequest(null);
      else setContextMenu(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [contextMenu, profileRequest]);

  function openAlarmMenu(personId: string, x: number, y: number) {
    setContextMenu({
      personId,
      x: Math.max(12, Math.min(x, window.innerWidth - 232)),
      y: Math.max(12, Math.min(y, window.innerHeight - 140)),
    });
  }

  function openPersonProfile(personId: string, tab: ProfileTab) {
    setContextMenu(null);
    setProfileRequest({ personId, tab });
  }

  function exportCsv() {
    const header = ["Time", "When", "Who", "What", "Where"];
    const rows = filteredAlarms.map((alarm) => [
      formatTime(alarm.occurredAt),
      formatDate(alarm.occurredAt),
      alarm.personName,
      label(alarm.alarmType),
      alarm.zoneName,
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "ny-secure-alarms.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="panel directory-panel alarms-panel">
      <div className="directory-toolbar activity-toolbar alarms-toolbar">
        <label className="table-search"><span>⌕</span><input aria-label="Search alarms" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alarms… Try *door*" title="Use * to match any characters" /></label>
        <div className="toolbar-filters">
          <select aria-label="Filter by alarm type" value={alarmType} onChange={(event) => setAlarmType(event.target.value)}><option value="ALL">All alarm types</option>{alarmTypes.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select>
          <select aria-label="Filter by severity" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="ALL">All severities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
        </div>
        <span className="result-count">{filteredAlarms.length} alarms</span>
        <button className="export-button" onClick={exportCsv} type="button">Export CSV</button>
      </div>
      <div className="alarm-guidance"><span aria-hidden="true">↗</span><p><strong>Person-linked alarm actions</strong> Right-click an alarm to open the customer contact card or review scan locations from the last 24 hours.</p></div>
      <div className="table-wrap">
        <table className="data-table activity-table alarm-table simplified">
          <thead><tr><th>Time</th><th>When</th><th>Who</th><th>What</th><th>Where</th></tr></thead>
          <tbody>{filteredAlarms.map((alarm) => <tr className={alarm.personId ? "alarm-row person-linked" : "alarm-row"} key={alarm.id} onContextMenu={(event) => {
            if (!alarm.personId) return;
            event.preventDefault();
            openAlarmMenu(alarm.personId, event.clientX, event.clientY);
          }} title={alarm.personId ? "Right-click for contact and scan history" : undefined}>
            <td><strong className="military-time">{formatTime(alarm.occurredAt)}</strong></td>
            <td><strong>{formatDate(alarm.occurredAt)}</strong><small>{relativeEventTime(alarm.occurredAt)}</small></td>
            <td><div className="alarm-person-heading"><strong>{alarm.personName}</strong>{alarm.personId && <button aria-label={`Open profile actions for ${alarm.personName}`} onClick={(event) => {
              event.stopPropagation();
              const bounds = event.currentTarget.getBoundingClientRect();
              openAlarmMenu(alarm.personId!, bounds.right, bounds.bottom + 4);
            }} type="button">•••</button>}</div><small>{alarm.personId ? "Known credential holder" : "System or unknown identity"}</small></td>
            <td><span className={`alarm-pill ${alarm.severity.toLowerCase()}`}><i />{label(alarm.alarmType)}</span><small>{alarm.detail}</small></td>
            <td><strong>{alarm.zoneName}</strong><small>{alarm.source} · {label(alarm.status)}</small></td>
          </tr>)}</tbody>
        </table>
        {filteredAlarms.length === 0 && <div className="activity-empty"><strong>No matching alarms</strong><span>Try a different search or filter.</span></div>}
      </div>
      {contextMenu && <div className="alarm-context-layer" onMouseDown={() => setContextMenu(null)}>
        <div aria-label="Alarm profile actions" className="alarm-context-menu" onMouseDown={(event) => event.stopPropagation()} role="menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <p>Customer record</p>
          <button onClick={() => openPersonProfile(contextMenu.personId, "contact")} role="menuitem" type="button"><span aria-hidden="true">◎</span><span><strong>Open contact card</strong><small>Phone, email, and company</small></span></button>
          <button onClick={() => openPersonProfile(contextMenu.personId, "history")} role="menuitem" type="button"><span aria-hidden="true">⌁</span><span><strong>View 24-hour scans</strong><small>Recent doors and locations</small></span></button>
        </div>
      </div>}
      {profilePerson && profileRequest && <div className="drawer-backdrop alarm-profile-backdrop" onMouseDown={() => setProfileRequest(null)}>
        <section aria-label={`${profilePerson.firstName} ${profilePerson.lastName} alarm profile`} className="alarm-profile-dialog" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><p className="eyebrow">Alarm-linked customer record</p><h2>{profileRequest.tab === "history" ? "Recent scan locations" : "Contact card"}</h2></div><button aria-label="Close alarm profile" className="close-button" onClick={() => setProfileRequest(null)} type="button">×</button></header>
          <PersonProfileCard
            key={`${profilePerson.id}-${profileRequest.tab}`}
            person={profilePerson}
            organization={orgMap.get(profilePerson.organizationId)}
            assignments={assignments.filter((assignment) => assignment.personId === profilePerson.id && assignment.status === "ACTIVE")}
            profiles={profiles}
            events={events.filter((event) => event.personId === profilePerson.id)}
            zones={zones}
            initialTab={profileRequest.tab}
          />
        </section>
      </div>}
    </section>
  );
}

function ActivityView({ events }: { events: AccessEvent[] }) {
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<"ALL" | "GRANTED" | "DENIED" | "CONTROL">("ALL");
  const [zone, setZone] = useState("ALL");
  const zones = Array.from(new Set(events.map((event) => event.zoneName || event.zoneId))).sort();
  const filteredEvents = events.filter((event) => {
    const matchesSearch = wildcardMatchAny([event.personName, event.operatorName, event.affectedPersonName, event.zoneName, event.decision, event.actionLabel, event.reasonCode, label(event.reasonCode), event.explanation], search);
    const matchesDecision = decision === "ALL" || (decision === "CONTROL" ? event.eventKind === "CONTROL" : event.eventKind !== "CONTROL" && event.decision === decision);
    const matchesZone = zone === "ALL" || (event.zoneName || event.zoneId) === zone;
    return matchesSearch && matchesDecision && matchesZone;
  });

  function exportCsv() {
    const header = ["Time", "Who", "What", "Where", "When"];
    const rows = filteredEvents.map((event) => [
      formatTime(event.occurredAt),
      event.operatorName || event.personName || "Unknown credential",
      event.eventKind === "CONTROL" ? event.actionLabel || "Door command" : event.decision === "GRANTED" ? "Access granted" : "Access denied",
      event.zoneName || event.zoneId,
      formatDate(event.occurredAt),
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "ny-secure-activity.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="panel directory-panel">
      <div className="directory-toolbar activity-toolbar">
        <label className="table-search"><span>⌕</span><input aria-label="Search activity" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activity… Try *granted*" title="Use * to match any characters" /></label>
        <div className="toolbar-filters">
          <select aria-label="Filter by decision" value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}><option value="ALL">All actions</option><option value="CONTROL">Door commands</option><option value="GRANTED">Access granted</option><option value="DENIED">Access denied</option></select>
          <select aria-label="Filter by zone" value={zone} onChange={(event) => setZone(event.target.value)}><option value="ALL">All locations</option>{zones.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <span className="result-count">{filteredEvents.length} events</span>
        <button className="export-button" onClick={exportCsv} type="button">Export CSV</button>
      </div>
      <div className="table-wrap"><table className="data-table activity-table simplified"><thead><tr><th>Time</th><th>Who</th><th>What</th><th>Where</th><th>When</th></tr></thead><tbody>{filteredEvents.map((event) => <tr key={event.id}><td><strong className="military-time">{formatTime(event.occurredAt)}</strong></td><td><strong>{event.operatorName || event.personName || "Unknown credential"}</strong>{event.affectedPersonName && <small>Affected: {event.affectedPersonName}</small>}</td><td>{event.eventKind === "CONTROL" ? <span className="decision-pill control">⇄ {event.actionLabel}</span> : <span className={`decision-pill ${event.decision.toLowerCase()}`}>{event.decision === "GRANTED" ? "✓" : "×"} {event.decision === "GRANTED" ? "Access granted" : "Access denied"}</span>}<small>{label(event.reasonCode)}</small></td><td><strong>{event.zoneName || event.zoneId}</strong><small>{event.sourceLabel || "Entry reader"}</small></td><td><strong>{formatDate(event.occurredAt)}</strong><small>{relativeEventTime(event.occurredAt)}</small></td></tr>)}</tbody></table>{filteredEvents.length === 0 && <div className="activity-empty"><strong>No matching activity</strong><span>Try a different search or filter.</span></div>}</div>
    </section>
  );
}

const PERSON_PHOTOS = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/65.jpg",
  "https://randomuser.me/api/portraits/men/52.jpg",
];

function photoFor(personId: string) {
  let hash = 0;
  for (const char of personId) hash = (hash + char.charCodeAt(0)) % PERSON_PHOTOS.length;
  return PERSON_PHOTOS[hash];
}

function SettingsDrawer({
  theme,
  fontSize,
  density,
  widgets,
  onThemeChange,
  onFontSizeChange,
  onDensityChange,
  onWidgetsChange,
  onClose,
}: {
  theme: "light" | "dark";
  fontSize: FontSizePreference;
  density: DensityPreference;
  widgets: DashboardWidget[];
  onThemeChange: (value: "light" | "dark") => void;
  onFontSizeChange: (value: FontSizePreference) => void;
  onDensityChange: (value: DensityPreference) => void;
  onWidgetsChange: (value: DashboardWidget[]) => void;
  onClose: () => void;
}) {
  function toggleWidget(widget: DashboardWidget) {
    onWidgetsChange(widgets.includes(widget) ? widgets.filter((item) => item !== widget) : [...widgets, widget]);
  }
  return (
    <div className="drawer-backdrop settings-backdrop" onMouseDown={onClose}>
      <aside className="settings-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label="Display and dashboard settings">
        <header className="settings-header"><div><p className="eyebrow">Personal workspace</p><h2>Settings</h2><p>Adjust readability and choose what appears on your overview.</p></div><button className="close-button" onClick={onClose} type="button" aria-label="Close settings">×</button></header>
        <section className="settings-section"><div className="settings-section-title"><h3>Appearance</h3><p>Saved for this device.</p></div><div className="segmented-setting" role="group" aria-label="Color theme"><button className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")} type="button">☀ Light</button><button className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")} type="button">☾ Dark</button></div></section>
        <section className="settings-section"><div className="settings-section-title"><h3>Text size</h3><p>Scales interface text without changing browser zoom.</p></div><div className="font-size-options"><button className={fontSize === "small" ? "active" : ""} onClick={() => onFontSizeChange("small")} type="button"><span>Aa</span><small>Small</small></button><button className={fontSize === "comfortable" ? "active" : ""} onClick={() => onFontSizeChange("comfortable")} type="button"><span>Aa</span><small>Comfortable</small></button><button className={fontSize === "large" ? "active" : ""} onClick={() => onFontSizeChange("large")} type="button"><span>Aa</span><small>Large</small></button></div></section>
        <section className="settings-section"><div className="settings-section-title"><h3>Layout density</h3><p>Controls spacing in lists and tables.</p></div><div className="segmented-setting" role="group" aria-label="Layout density"><button className={density === "compact" ? "active" : ""} onClick={() => onDensityChange("compact")} type="button">Compact</button><button className={density === "comfortable" ? "active" : ""} onClick={() => onDensityChange("comfortable")} type="button">Comfortable</button></div></section>
        <section className="settings-section dashboard-settings"><div className="settings-section-title"><h3>Overview widgets</h3><p>Leave every option off for a blank home page.</p></div><div className="widget-options">{DASHBOARD_WIDGETS.map((widget) => <label key={widget.id}><span><strong>{widget.label}</strong><small>{widget.description}</small></span><input type="checkbox" checked={widgets.includes(widget.id)} onChange={() => toggleWidget(widget.id)} /><i aria-hidden="true" /></label>)}</div><div className="settings-actions"><button onClick={() => onWidgetsChange(DASHBOARD_WIDGETS.map((widget) => widget.id))} type="button">Show all</button><button onClick={() => onWidgetsChange([])} type="button">Clear overview</button></div></section>
        <footer className="settings-footer"><span>{widgets.length} of {DASHBOARD_WIDGETS.length} widgets selected</span><button className="primary-button" onClick={onClose} type="button">Done</button></footer>
      </aside>
    </div>
  );
}

function OperatorProfileDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="drawer-backdrop operator-profile-backdrop" onMouseDown={onClose}>
      <aside aria-label="Maya Brooks operator profile" className="operator-profile-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header className="operator-profile-header">
          <div><p className="eyebrow">Signed-in operator</p><h2>Operator profile</h2><p>Identity and permissions for the current NY-Secure session.</p></div>
          <button aria-label="Close operator profile" className="close-button" onClick={onClose} type="button">×</button>
        </header>
        <section className="operator-profile-identity">
          <span className="avatar avatar-maya">MB</span>
          <div><h3>Maya Brooks</h3><p>Security administrator</p><span><i /> Active session</span></div>
        </section>
        <dl className="operator-profile-facts">
          <div><dt>Operator ID</dt><dd>NYS-MB-001</dd></div>
          <div><dt>Assigned site</dt><dd>NY-Secure · DC-01</dd></div>
          <div><dt>Local time zone</dt><dd>America / New York</dd></div>
          <div><dt>Environment</dt><dd>Simulation</dd></div>
        </dl>
        <section className="operator-permissions">
          <div><p className="eyebrow">Authorized capabilities</p><h3>Security administrator permissions</h3></div>
          <ul>
            <li><span>CC</span><div><strong>Command Center controls</strong><small>Unlock, lock, normalize, and grant person access.</small></div><b>Allowed</b></li>
            <li><span>VS</span><div><strong>Visitor verification</strong><small>Verify photos, start visits, and manage on-site status.</small></div><b>Allowed</b></li>
            <li><span>AR</span><div><strong>Alarm response</strong><small>Review alarms and linked customer records.</small></div><b>Allowed</b></li>
            <li><span>LG</span><div><strong>Audit review</strong><small>Read the unified access and command activity log.</small></div><b>Allowed</b></li>
          </ul>
        </section>
        <footer><span>All operator actions are recorded in Activity.</span><button className="primary-button" onClick={onClose} type="button">Done</button></footer>
      </aside>
    </div>
  );
}

function StatLogDrawer({ tab, data, onClose }: { tab: StatTab; data: StatePayload; onClose: () => void }) {
  const config = ({
    people: { eyebrow: "Live occupancy", title: "People on site", description: "Current badge-ins and last verified locations." },
    credentials: { eyebrow: "Credential health", title: "Active credentials", description: "Issued badges that can currently be evaluated at a reader." },
    grants: { eyebrow: "Decision log", title: "Access granted", description: "Successful access decisions recorded today." },
    denials: { eyebrow: "Review queue", title: "Access denied", description: "Denied attempts requiring security awareness or review." },
  } satisfies Record<StatTab, { eyebrow: string; title: string; description: string }>)[tab];
  const eventRows = data.events.filter((event) => tab === "grants" ? event.decision === "GRANTED" : event.decision === "DENIED");
  const personRows = tab === "credentials"
    ? data.people.filter((person) => person.badgeStatus === "ACTIVE")
    : data.checkIns
      .filter((checkIn) => checkIn.status === "ON_SITE")
      .map((checkIn) => data.people.find((person) => person.id === checkIn.personId))
      .filter((person): person is Person => Boolean(person));
  const count = tab === "grants" || tab === "denials" ? eventRows.length : personRows.length;

  return (
    <div className="drawer-backdrop stat-log-backdrop" onMouseDown={onClose}>
      <aside className="stat-log-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label={`${config.title} log`}>
        <header className="stat-log-header">
          <div><p className="eyebrow">{config.eyebrow}</p><h2>{config.title}</h2><p>{config.description}</p></div>
          <button className="close-button" onClick={onClose} type="button" aria-label="Close log">×</button>
        </header>
        <div className="log-summary"><strong>{count}</strong><span>records shown</span><i>Live</i></div>
        <div className="photo-log">
          {(tab === "grants" || tab === "denials") ? eventRows.map((event) => (
            <article className="photo-log-row" key={event.id}>
              <Image src={photoFor(event.personId)} alt="" width={46} height={46} unoptimized />
              <div><strong>{event.personName || "Unknown credential"}</strong><span>{event.decision === "GRANTED" ? "Access granted" : "Access denied"}</span><small>{event.zoneName} · {label(event.reasonCode)}</small></div>
              <time><b>{formatTime(event.occurredAt)}</b><small>{relativeEventTime(event.occurredAt)}</small></time>
            </article>
          )) : personRows.map((person) => (
            <article className="photo-log-row" key={person.id}>
              <Image src={photoFor(person.id)} alt="" width={46} height={46} unoptimized />
              <div><strong>{person.firstName} {person.lastName}</strong><span>{person.organizationName}</span><small>{tab === "credentials" ? `${person.badgeId} · Credential active` : `${data.checkIns.find((checkIn) => checkIn.personId === person.id && checkIn.status === "ON_SITE")?.lastScanZone || "No scan recorded"} · Security verified`}</small></div>
              <time><b>{tab === "credentials" ? "ACTIVE" : "ON SITE"}</b><small>{label(person.relationshipType)}</small></time>
            </article>
          ))}
          {count === 0 && <div className="empty-log"><span>✓</span><strong>No records in this log</strong><p>The live security feed is clear.</p></div>}
        </div>
      </aside>
    </div>
  );
}

function CreateVisitDialog({ organizations, zones, onClose, onSaved }: { organizations: Organization[]; zones: Zone[]; onClose: () => void; onSaved: (ticketNumber: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasDelivery, setHasDelivery] = useState(false);
  const [visitStart, setVisitStart] = useState(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  });
  const [durationHours, setDurationHours] = useState("4");
  const [allowedHours, setAllowedHours] = useState<Record<string, number[]>>({});
  const requiredVisitDates = useMemo(() => visitDateKeys(visitStart, Number(durationHours)), [visitStart, durationHours]);
  const hoursComplete = requiredVisitDates.length > 0 && requiredVisitDates.every((date) => (allowedHours[date]?.length ?? 0) > 0);
  const requesters = organizations.filter((organization) => organization.status === "ACTIVE" && ["DATA_CENTER_OPERATOR", "COLOCATION_CUSTOMER"].includes(organization.type));
  const cages = zones.filter((zone) => zone.type === "CAGE" && zone.status === "ONLINE");

  function toggleAllowedHour(date: string, hour: number) {
    setAllowedHours((current) => {
      const selected = current[date] ?? [];
      return { ...current, [date]: selected.includes(hour) ? selected.filter((item) => item !== hour) : [...selected, hour].sort((a, b) => a - b) };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const validFrom = new Date(String(values.validFrom)).toISOString();
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, validFrom, hasDelivery, allowedHours }),
      });
      const result = (await response.json()) as { ticketNumber?: string; error?: string };
      if (!response.ok || !result.ticketNumber) throw new Error(result.error || "Visit ticket could not be created.");
      onSaved(result.ticketNumber);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Visit ticket could not be created.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="modal visit-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><p className="eyebrow">DC-01 temporary access</p><h2>Create work-visit ticket</h2><p>Schedule limited cage and cabinet access without issuing permanent access.</p></div><button className="close-button" onClick={onClose} type="button" aria-label="Close visit ticket form">×</button></div>
        <div className="ticket-prefix-preview"><span>Ticket format</span><strong>01-XXXXXX</strong><small>Generated automatically for DC-01</small></div>
        <div className="form-grid visit-form-grid">
          <label className="full-field"><span>Customer / requesting organization</span><select name="organizationId" required defaultValue={requesters[0]?.id}>{requesters.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select></label>
          <label className="full-field"><span>Requested by</span><input name="requesterName" required maxLength={120} placeholder="Name and team, e.g. Jordan Lee · Customer NOC" /></label>
          <label><span>Visitor name</span><input name="visitorName" required maxLength={120} placeholder="Full legal name" /></label>
          <label><span>Visitor email</span><input type="email" name="visitorEmail" maxLength={254} placeholder="visitor@company.com" /></label>
          <label className="full-field"><span>Visitor phone (optional)</span><input type="tel" name="visitorPhone" maxLength={40} placeholder="+1 212 555 0100" /></label>
          <label className="full-field"><span>Customer cage</span><select name="cageZoneId" required defaultValue={cages[0]?.id}>{cages.map((cage) => <option value={cage.id} key={cage.id}>{cage.name}</option>)}</select></label>
          <label className="full-field"><span>Authorized cabinets</span><input name="cabinets" required maxLength={700} placeholder="CAB-11001, CAB-11002" /><small>Separate multiple cabinets with commas.</small></label>
          <label><span>Visit starts</span><input type="datetime-local" name="validFrom" required value={visitStart} onChange={(event) => setVisitStart(event.target.value)} /></label>
          <label><span>Valid for</span><select name="durationHours" value={durationHours} onChange={(event) => setDurationHours(event.target.value)}><option value="1">1 hour</option><option value="2">2 hours</option><option value="4">4 hours</option><option value="8">8 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option><option value="168">7 days</option><option value="336">14 days</option><option value="744">31 days</option></select></label>
          <fieldset className="full-field visit-hours-builder">
            <legend>Authorized work hours <b>Required</b></legend>
            <p>Select every hour the visitor may work on each date. Hours use the DC-01 24-hour clock.</p>
            <div className="visit-hours-days">{requiredVisitDates.map((date) => <section className="visit-hours-day" key={date}>
              <header><strong>{date}</strong><span>{allowedHours[date]?.length ?? 0} hours selected</span><button type="button" onClick={() => setAllowedHours((current) => ({ ...current, [date]: HOURS_24 }))}>Select all</button><button type="button" onClick={() => setAllowedHours((current) => ({ ...current, [date]: [] }))}>Clear</button></header>
              <div className="hour-checkbox-grid">{HOURS_24.map((hour) => <label key={hour}><input type="checkbox" checked={allowedHours[date]?.includes(hour) ?? false} onChange={() => toggleAllowedHour(date, hour)} /><span>{String(hour).padStart(2, "0")}</span></label>)}</div>
            </section>)}</div>
            {!hoursComplete && <small className="visit-hours-required">Choose at least one hour for every listed date before creating the ticket.</small>}
          </fieldset>
          <label className="full-field"><span>Comments (optional)</span><textarea name="comments" maxLength={1000} rows={3} placeholder="Escort instructions, work scope, contacts, or restrictions…" /></label>
          <label className="full-field visit-delivery-toggle"><input type="checkbox" checked={hasDelivery} onChange={(event) => setHasDelivery(event.target.checked)} /><span><strong>Package delivery included</strong><small>Capture package count and delivery notes for receiving.</small></span></label>
          {hasDelivery && <><label><span>Number of packages</span><input type="number" name="packageCount" required min="1" max="999" defaultValue="1" /></label><label><span>Package details</span><input name="packageDetails" maxLength={500} placeholder="e.g. Two sealed server cartons" /></label></>}
        </div>
        <div className="info-callout"><span>i</span><p>The ticket can start only on a listed date and during one of its explicitly selected hours. Access remains limited to the selected cage and cabinets.</p></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button className="secondary-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" disabled={saving || !hoursComplete || requesters.length === 0 || cages.length === 0} type="submit">{saving ? "Creating…" : "Create ticket"}</button></div>
      </form>
    </div>
  );
}

function AddPersonDialog({ organizations, onClose, onSaved }: { organizations: Organization[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recordType, setRecordType] = useState<"CUSTOMER" | "ENGINEER">("CUSTOMER");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/people", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const result = (await response.json()) as { person?: Person; error?: string };
      if (!response.ok) throw new Error(result.error || "Person could not be added.");
      onSaved(`${values.firstName} ${values.lastName} was added with no access.`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Person could not be added."); setSaving(false); }
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><p className="eyebrow">Identity directory</p><h2>Add a person</h2><p>Create a directory record. Badge access and activity are managed outside this board.</p></div><button className="close-button" onClick={onClose} type="button" aria-label="Close">×</button></div>
        <div className="form-grid">
          <label><span>First name</span><input name="firstName" required placeholder="e.g. Daniela" autoFocus /></label>
          <label><span>Last name</span><input name="lastName" required placeholder="e.g. Okafor" /></label>
          <label><span>Work email</span><input type="email" name="email" required placeholder="name@company.com" /></label>
          <label><span>Phone number</span><input type="tel" name="phoneNumber" required autoComplete="tel" placeholder="+1 212 555 0100" /></label>
          <label className="full-field"><span>Company / organization</span><select name="organizationId" required defaultValue={organizations[0]?.id}>{organizations.map((org) => <option value={org.id} key={org.id}>{org.name} · {org.oid}</option>)}</select></label>
          <label><span>Record type</span><select name="relationshipType" value={recordType} onChange={(event) => setRecordType(event.target.value as typeof recordType)}><option value="CUSTOMER">Customer</option><option value="ENGINEER">Internal employee</option></select></label>
          {recordType === "ENGINEER" ? <label><span>Job function</span><select name="jobFunction" defaultValue="ENGINEER"><option value="ENGINEER">Engineer</option><option value="TECHNICIAN">Technician</option><option value="FACILITIES">Facilities</option><option value="OPERATIONS">Operations</option><option value="OTHER">Other</option></select></label> : <input type="hidden" name="jobFunction" value="NOT_APPLICABLE" />}
        </div>
        <div className="info-callout"><span>i</span><p><strong>External intake stays separate.</strong> Visitors, contractors, and vendors will enter through the future ticket workflow, not this form.</p></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button className="secondary-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" disabled={saving} type="submit">{saving ? "Adding…" : "Add person"}</button></div>
      </form>
    </div>
  );
}
