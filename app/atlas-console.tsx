"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type View =
  | "overview"
  | "operations"
  | "people"
  | "organizations"
  | "policies"
  | "facility"
  | "activity";

type Organization = {
  id: string;
  name: string;
  type: string;
  status: string;
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
};

type StatePayload = {
  organizations: Organization[];
  zones: Zone[];
  people: Person[];
  profiles: Profile[];
  assignments: Assignment[];
  events: AccessEvent[];
  stats?: {
    activePeople?: number;
    activeCredentials?: number;
    grantsToday?: number;
    denialsToday?: number;
  };
};

type Flash = { tone: "success" | "danger" | "info"; message: string } | null;

const NAV_ITEMS: { id: View; label: string; symbol: string }[] = [
  { id: "overview", label: "Overview", symbol: "OV" },
  { id: "operations", label: "Live operations", symbol: "OP" },
  { id: "people", label: "People", symbol: "PE" },
  { id: "organizations", label: "Organizations", symbol: "OR" },
  { id: "policies", label: "Access policies", symbol: "AP" },
  { id: "facility", label: "Facility", symbol: "FC" },
  { id: "activity", label: "Activity log", symbol: "AL" },
];

const FLOOR_ROOMS = [
  { id: "zone-main-entrance", short: "ENTRY", area: "entry", kind: "common" },
  { id: "zone-security-lobby", short: "SECURITY LOBBY", area: "lobby", kind: "common" },
  { id: "zone-mantrap", short: "MANTRAP", area: "mantrap", kind: "threshold" },
  { id: "zone-secure-spine", short: "SECURE SPINE", area: "spine", kind: "corridor" },
  { id: "zone-cage-111", short: "CAGE 111", area: "c111", kind: "tenant" },
  { id: "zone-cage-112", short: "CAGE 112", area: "c112", kind: "tenant" },
  { id: "zone-cage-113", short: "CAGE 113", area: "c113", kind: "tenant" },
  { id: "zone-cage-114", short: "CAGE 114", area: "c114", kind: "available" },
  { id: "zone-ups-a", short: "UPS ROOM A", area: "ups", kind: "critical" },
  { id: "zone-generator-west", short: "GEN WEST", area: "gen1", kind: "critical" },
  { id: "zone-generator-east", short: "GEN EAST", area: "gen2", kind: "critical" },
  { id: "zone-noc", short: "NOC", area: "noc", kind: "operations" },
  { id: "zone-loading-dock", short: "LOADING DOCK", area: "dock", kind: "logistics" },
  { id: "zone-receiving", short: "RECEIVING / STAGING", area: "staging", kind: "logistics" },
];

const VIEW_COPY: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  overview: {
    eyebrow: "Wednesday · August 5",
    title: "Good morning, Maya.",
    subtitle: "Atlas DC-01 is secure. Here’s what needs your attention.",
  },
  operations: {
    eyebrow: "Decision workspace",
    title: "Live operations",
    subtitle: "Present a credential, test the policy path, and inspect the result.",
  },
  people: {
    eyebrow: "Identity directory",
    title: "People & credentials",
    subtitle: "Manage everyone who can request or receive physical access.",
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
    eyebrow: "Atlas Colocation · DC-01",
    title: "Facility model",
    subtitle: "A navigable hierarchy of perimeter, common, tenant, and critical spaces.",
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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
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

function normalizeState(source: {
  organizations?: Array<Record<string, unknown>>;
  zones?: Array<Record<string, unknown>>;
  people?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  assignments?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  stats?: Record<string, unknown>;
}): StatePayload {
  const organizations: Organization[] = (source.organizations ?? []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
    type: String(item.type ?? item.organizationType ?? "ORGANIZATION"),
    status: item.active === false ? "INACTIVE" : "ACTIVE",
  }));
  const organizationNames = new Map(organizations.map((organization) => [organization.id, organization.name]));
  const tenantByZone: Record<string, string> = {
    "zone-cage-111": "org-northstar",
    "zone-cage-112": "org-lumina",
    "zone-cage-113": "org-redwood",
  };
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
    const tenantOrganizationId = tenantByZone[id] ?? null;
    return {
      id,
      name: String(item.name),
      type: zoneType(id, String(item.category ?? item.type ?? "ZONE")),
      securityLevel: Number(item.securityTier ?? item.securityLevel ?? 1),
      status: item.active === false ? "INACTIVE" : "ONLINE",
      tenantOrganizationId,
      tenantName: tenantOrganizationId ? organizationNames.get(tenantOrganizationId) ?? "Tenant" : null,
    };
  });
  const people: Person[] = (source.people ?? []).map((item) => ({
    id: String(item.id),
    firstName: String(item.firstName),
    lastName: String(item.lastName),
    email: String(item.email),
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
    };
  });
  return {
    organizations,
    zones,
    people,
    profiles,
    assignments,
    events,
    stats: {
      activePeople: Number(source.stats?.activePeople ?? people.filter((person) => person.status === "ACTIVE").length),
      activeCredentials: people.filter((person) => person.badgeStatus === "ACTIVE").length,
      grantsToday: Number(source.stats?.grantedToday ?? 0),
      denialsToday: Number(source.stats?.deniedToday ?? 0),
    },
  };
}

export default function AtlasConsole() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [data, setData] = useState<StatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [clock, setClock] = useState(new Date());
  const [selectedZoneId, setSelectedZoneId] = useState("zone-cage-111");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [simulationZoneId, setSimulationZoneId] = useState("zone-cage-111");
  const [simulationResult, setSimulationResult] = useState<{
    decision: "GRANTED" | "DENIED";
    reasonCode: string;
    explanation: string;
    matchedProfileName?: string;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

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
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadState]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 3600);
    return () => window.clearTimeout(timer);
  }, [flash]);

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
      activePeople:
        data?.stats?.activePeople ?? data?.people.filter((person) => person.status === "ACTIVE").length ?? 0,
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

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data?.people ?? [];
    return (data?.people ?? []).filter((person) =>
      [
        person.firstName,
        person.lastName,
        person.email,
        person.organizationName,
        orgMap.get(person.organizationId)?.name,
        person.relationshipType,
        person.jobFunction,
        person.badgeId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [data, orgMap, query]);

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

  function openPerson(person: Person, manageAccess = false) {
    setSelectedPerson(person);
    setShowAccess(manageAccess);
  }

  const viewCopy = VIEW_COPY[activeView];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>ATLAS</strong>
            <small>ACCESS CONTROL</small>
          </div>
        </div>

        <div className="simulation-badge">
          <span className="pulse-dot" />
          Simulation environment
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-section-label">Workspace</p>
          {NAV_ITEMS.map((item) => (
            <button
              className={activeView === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              <span className="nav-symbol" aria-hidden="true">
                {item.symbol}
              </span>
              <span>{item.label}</span>
              {item.id === "operations" && <i>LIVE</i>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
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
        <button className="operator-card" type="button" aria-label="Open operator profile">
          <span className="avatar avatar-maya">MB</span>
          <span>
            <strong>Maya Brooks</strong>
            <small>Security administrator</small>
          </span>
          <b>•••</b>
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="site-switcher" type="button">
            <span className="site-icon">01</span>
            <span>
              <small>Active site</small>
              <strong>Atlas Colocation · DC-01</strong>
            </span>
            <b>⌄</b>
          </button>
          <label className="global-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search people, badges, or zones"
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setActiveView("people")}
              placeholder="Search people, badges, zones…"
              value={query}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-time">
            <small>America / New York</small>
            <strong>{clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</strong>
          </div>
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
              {activeView === "people" && (
                <button className="primary-button" onClick={() => setShowAddPerson(true)} type="button">
                  <span>＋</span> Add person
                </button>
              )}
              {activeView !== "people" && activeView !== "operations" && (
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
                  orgMap={orgMap}
                  profileMap={profileMap}
                  activeAssignmentsFor={activeAssignmentsFor}
                  onViewAll={() => setActiveView("activity")}
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
                  people={filteredPeople}
                  assignments={data.assignments}
                  orgMap={orgMap}
                  profileMap={profileMap}
                  query={query}
                  setQuery={setQuery}
                  onOpen={openPerson}
                  onAdd={() => setShowAddPerson(true)}
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
              {activeView === "activity" && <ActivityView events={data.events} />}
            </>
          )}
        </div>
      </section>

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

      {selectedPerson && data && !showAccess && (
        <PersonDrawer
          person={selectedPerson}
          organization={orgMap.get(selectedPerson.organizationId)}
          assignments={activeAssignmentsFor(selectedPerson.id)}
          profiles={profileMap}
          events={data.events.filter((event) => event.personId === selectedPerson.id)}
          onClose={() => setSelectedPerson(null)}
          onManage={() => setShowAccess(true)}
        />
      )}

      {selectedPerson && data && showAccess && (
        <AccessDialog
          person={selectedPerson}
          profiles={data.profiles}
          assignments={activeAssignmentsFor(selectedPerson.id)}
          onClose={() => {
            setShowAccess(false);
            setSelectedPerson(null);
          }}
          onSaved={async (message) => {
            setFlash({ tone: "success", message });
            await loadState();
          }}
        />
      )}

      {flash && <div className={`toast ${flash.tone}`}><span />{flash.message}</div>}
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
}: {
  labelText: string;
  value: number;
  detail: string;
  trend: string;
  tone: string;
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-card-top"><span>{labelText}</span><i className="stat-glyph" /></div>
      <strong>{value.toLocaleString()}</strong>
      <div className="stat-footer"><span>{detail}</span><b>{trend}</b></div>
    </article>
  );
}

function Overview({
  data,
  stats,
  selectedZone,
  selectedZoneId,
  setSelectedZoneId,
  orgMap,
  profileMap,
  activeAssignmentsFor,
  onViewAll,
}: {
  data: StatePayload;
  stats: { activePeople: number; credentials: number; grants: number; denials: number };
  selectedZone?: Zone;
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  orgMap: Map<string, Organization>;
  profileMap: Map<string, Profile>;
  activeAssignmentsFor: (personId: string) => Assignment[];
  onViewAll: () => void;
}) {
  return (
    <>
      <div className="stats-grid">
        <StatCard labelText="People on site" value={stats.activePeople} detail={`Across ${data.organizations.length} organizations`} trend="+3 today" tone="teal" />
        <StatCard labelText="Active credentials" value={stats.credentials} detail="2 expire this week" trend="98% healthy" tone="blue" />
        <StatCard labelText="Access granted" value={stats.grants} detail="Today’s decisions" trend="+8.2%" tone="green" />
        <StatCard labelText="Access denied" value={stats.denials} detail="Review recommended" trend={`${Math.min(stats.denials, 9)} open`} tone="amber" />
      </div>

      <div className="overview-grid">
        <section className="panel facility-panel">
          <PanelHeader eyebrow="Live facility" title="Atlas DC-01" meta="18 readers online" />
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
                <span>Owner <b>{selectedZone.tenantName || "Atlas DC Operations"}</b></span>
              </div>
              <button type="button">Inspect →</button>
            </div>
          )}
        </section>

        <section className="panel activity-panel">
          <PanelHeader eyebrow="Streaming now" title="Recent activity" action="View full log" onAction={onViewAll} />
          <div className="event-feed">
            {data.events.slice(0, 7).map((event) => (
              <EventFeedItem key={event.id} event={event} />
            ))}
          </div>
        </section>
      </div>

      <div className="secondary-grid">
        <section className="panel attention-panel">
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
        </section>
        <section className="panel roster-panel">
          <PanelHeader eyebrow="Currently active" title="On-site roster" meta={`${data.people.length} people`} />
          <div className="mini-roster">
            {data.people.slice(0, 5).map((person, index) => (
              <div className="mini-person" key={person.id}>
                <span className={`avatar hue-${index % 5}`}>{initials(person.firstName, person.lastName)}</span>
                <div><strong>{person.firstName} {person.lastName}</strong><small>{person.organizationName || orgMap.get(person.organizationId)?.name}</small></div>
                <div className="mini-person-access">
                  {activeAssignmentsFor(person.id).slice(0, 1).map((assignment) => (
                    <span key={assignment.id}>{profileMap.get(assignment.profileId)?.name}</span>
                  ))}
                </div>
                <b className="on-site-dot" title="On site" />
              </div>
            ))}
          </div>
        </section>
      </div>
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
        <strong>{event.personName || "Unknown credential"}</strong>
        <span>{event.zoneName || label(event.zoneId)}</span>
        <small>{event.explanation || label(event.reasonCode)}</small>
      </div>
      <div className="event-time"><strong>{formatTime(event.occurredAt)}</strong><small>{relativeEventTime(event.occurredAt)}</small></div>
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
  assignments,
  orgMap,
  profileMap,
  query,
  setQuery,
  onOpen,
  onAdd,
}: {
  people: Person[];
  assignments: Assignment[];
  orgMap: Map<string, Organization>;
  profileMap: Map<string, Profile>;
  query: string;
  setQuery: (value: string) => void;
  onOpen: (person: Person, manageAccess?: boolean) => void;
  onAdd: () => void;
}) {
  return (
    <section className="panel directory-panel">
      <div className="directory-toolbar">
        <label className="table-search"><span>⌕</span><input placeholder="Search directory…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="toolbar-filters"><button type="button">All types <span>⌄</span></button><button type="button">All organizations <span>⌄</span></button><button type="button">Credential status <span>⌄</span></button></div>
        <span className="result-count">{people.length} people</span>
      </div>
      <div className="table-wrap">
        <table className="data-table people-table">
          <thead><tr><th>Person</th><th>Organization</th><th>Relationship</th><th>Credential</th><th>Effective access</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {people.map((person, index) => {
              const personAssignments = assignments.filter((assignment) => assignment.personId === person.id && assignment.status === "ACTIVE");
              return (
                <tr key={person.id} onClick={() => onOpen(person)}>
                  <td><div className="person-cell"><span className={`avatar hue-${index % 5}`}>{initials(person.firstName, person.lastName)}</span><span><strong>{person.firstName} {person.lastName}</strong><small>{person.email}</small></span></div></td>
                  <td><strong className="org-name">{person.organizationName || orgMap.get(person.organizationId)?.name}</strong></td>
                  <td><span className="type-pill">{label(person.relationshipType)}</span><small className="job-label">{label(person.jobFunction)}</small></td>
                  <td><code>{person.badgeId}</code><small className={`badge-line ${person.badgeStatus.toLowerCase()}`}><i />{label(person.badgeStatus)}</small></td>
                  <td><div className="access-stack">{personAssignments.slice(0, 2).map((assignment) => <span key={assignment.id}>{profileMap.get(assignment.profileId)?.name}</span>)}{personAssignments.length > 2 && <small>+{personAssignments.length - 2} more</small>}{personAssignments.length === 0 && <em>No access assigned</em>}</div></td>
                  <td><span className={`status-pill ${person.status.toLowerCase()}`}><i />{label(person.status)}</span></td>
                  <td><button className="row-action" onClick={(event) => { event.stopPropagation(); onOpen(person, true); }} type="button">Manage access</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {people.length === 0 && <div className="table-empty"><span>⌕</span><h3>No people found</h3><p>Try another search or add a new person.</p><button className="primary-button" onClick={onAdd} type="button">Add person</button></div>}
    </section>
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
            <p>{org.type === "OPERATOR" ? "Site owner and facility operator" : org.type === "CUSTOMER" ? "Colocation tenant organization" : "Approved service partner"}</p>
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
  return (
    <div className="policies-layout">
      <section className="panel policy-table-panel">
        <div className="directory-toolbar"><label className="table-search"><span>⌕</span><input placeholder="Search policies…" /></label><div className="toolbar-filters"><button type="button">All schedules <span>⌄</span></button><button type="button">All scopes <span>⌄</span></button></div><span className="result-count">{profiles.length} profiles</span></div>
        <div className="policy-list">
          {profiles.map((profile, index) => {
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
        <div className="tree-list"><div className="tree-root"><span>▾</span><strong>Atlas Colocation</strong></div><div className="tree-branch"><div><span>▾</span><strong>Perimeter & common</strong></div>{zones.filter((zone) => ["EXTERIOR", "LOBBY", "MANTRAP", "SECURE_CORRIDOR"].includes(zone.type)).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div><div className="tree-branch"><div><span>▾</span><strong>Colocation halls</strong></div>{zones.filter((zone) => ["COLO_HALL", "CAGE"].includes(zone.type)).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div><div className="tree-branch"><div><span>▾</span><strong>Critical facilities</strong></div>{zones.filter((zone) => ["UPS_ROOM", "GENERATOR_ROOM", "NOC"].includes(zone.type)).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div><div className="tree-branch"><div><span>▾</span><strong>Logistics</strong></div>{zones.filter((zone) => ["LOADING_DOCK", "STAGING"].includes(zone.type)).map((zone) => <button className={selectedZoneId === zone.id ? "active" : ""} onClick={() => setSelectedZoneId(zone.id)} key={zone.id} type="button"><i />{zone.name}</button>)}</div></div>
      </aside>
      <section className="panel facility-canvas">
        <PanelHeader eyebrow="Interactive floor plan" title="Ground level" meta="Live status" />
        <FacilityMap zones={zones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} large />
      </section>
      <aside className="panel zone-inspector">
        <div className="inspector-hero"><span className={`zone-level level-${selectedZone?.securityLevel ?? 1}`}>L{selectedZone?.securityLevel ?? 1}</span><p>Security level</p></div>
        <p className="eyebrow">Zone detail</p><h2>{selectedZone?.name}</h2><span className="status-pill active"><i />{label(selectedZone?.status ?? "Active")}</span>
        <dl><div><dt>Zone type</dt><dd>{label(selectedZone?.type ?? "")}</dd></div><div><dt>Tenant</dt><dd>{selectedZone?.tenantName || "Atlas DC Operations"}</dd></div><div><dt>Readers</dt><dd>1 online</dd></div><div><dt>Occupancy</dt><dd>{selectedZone?.type === "CAGE" ? "2 people" : "Clear"}</dd></div></dl>
        <button className="secondary-button" type="button">View access rules</button>
      </aside>
    </div>
  );
}

function ActivityView({ events }: { events: AccessEvent[] }) {
  return (
    <section className="panel directory-panel">
      <div className="directory-toolbar"><label className="table-search"><span>⌕</span><input placeholder="Search events…" /></label><div className="toolbar-filters"><button type="button">All decisions <span>⌄</span></button><button type="button">All zones <span>⌄</span></button><button type="button">Today <span>⌄</span></button></div><button className="export-button" type="button">Export CSV</button></div>
      <div className="table-wrap"><table className="data-table activity-table"><thead><tr><th>Time</th><th>Decision</th><th>Person</th><th>Organization</th><th>Zone / reader</th><th>Reason</th><th>Event ID</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><strong>{formatTime(event.occurredAt)}</strong><small>{new Date(event.occurredAt).toLocaleDateString()}</small></td><td><span className={`decision-pill ${event.decision.toLowerCase()}`}>{event.decision === "GRANTED" ? "✓" : "×"} {event.decision}</span></td><td><strong>{event.personName || "Unknown"}</strong></td><td>{event.organizationName || "—"}</td><td><strong>{event.zoneName || event.zoneId}</strong><small>Entry reader</small></td><td><code>{event.reasonCode}</code><small>{event.explanation}</small></td><td><code>EVT-{String(event.id).padStart(5, "0")}</code></td></tr>)}</tbody></table></div>
    </section>
  );
}

function PersonDrawer({ person, organization, assignments, profiles, events, onClose, onManage }: { person: Person; organization?: Organization; assignments: Assignment[]; profiles: Map<string, Profile>; events: AccessEvent[]; onClose: () => void; onManage: () => void }) {
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="person-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} type="button" aria-label="Close">×</button>
        <div className="drawer-profile"><span className="avatar drawer-avatar">{initials(person.firstName, person.lastName)}</span><div><span className={`status-pill ${person.status.toLowerCase()}`}><i />{label(person.status)}</span><h2>{person.firstName} {person.lastName}</h2><p>{label(person.jobFunction)} · {organization?.name}</p></div></div>
        <div className="drawer-tabs"><button className="active" type="button">Access</button><button type="button">Credential</button><button type="button">Activity</button></div>
        <div className="drawer-section"><div className="drawer-section-title"><div><p className="eyebrow">Effective access</p><h3>{assignments.length} active assignments</h3></div><button onClick={onManage} type="button">Manage</button></div><div className="drawer-assignments">{assignments.map((assignment) => { const profile = profiles.get(assignment.profileId); return <div key={assignment.id}><span className="policy-icon policy-hue-1">◆</span><div><strong>{profile?.name}</strong><small>{profile?.schedule} · {formatDate(assignment.validUntil)}</small></div></div>; })}{assignments.length === 0 && <p className="empty-copy">No active access. This credential will deny by default.</p>}</div></div>
        <div className="drawer-section"><p className="eyebrow">Credential</p><div className="credential-card"><div><small>Physical badge</small><code>{person.badgeId}</code></div><span className={`credential-pill ${person.badgeStatus.toLowerCase()}`}><i />{label(person.badgeStatus)}</span></div></div>
        <div className="drawer-section"><p className="eyebrow">Recent decisions</p><div className="event-feed compact">{events.slice(0, 3).map((event) => <EventFeedItem key={event.id} event={event} />)}{events.length === 0 && <p className="empty-copy">No recent activity for this person.</p>}</div></div>
        <button className="primary-button drawer-action" onClick={onManage} type="button">Manage access</button>
      </aside>
    </div>
  );
}

function AddPersonDialog({ organizations, onClose, onSaved }: { organizations: Organization[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Identity directory</p><h2>Add a person</h2><p>New people start with an active credential and no physical access.</p></div><button className="close-button" onClick={onClose} type="button">×</button></div><div className="form-grid"><label><span>First name</span><input name="firstName" required placeholder="e.g. Daniela" autoFocus /></label><label><span>Last name</span><input name="lastName" required placeholder="e.g. Okafor" /></label><label className="full-field"><span>Work email</span><input type="email" name="email" required placeholder="name@company.com" /></label><label className="full-field"><span>Organization</span><select name="organizationId" required defaultValue={organizations[0]?.id}>{organizations.map((org) => <option value={org.id} key={org.id}>{org.name} · {label(org.type)}</option>)}</select></label><label><span>Relationship</span><select name="relationshipType" defaultValue="CONTRACTOR"><option>CUSTOMER</option><option>CONTRACTOR</option><option>EMPLOYEE</option><option>VENDOR</option><option>VISITOR</option></select></label><label><span>Job function</span><select name="jobFunction" defaultValue="TECHNICIAN"><option>ENGINEER</option><option>TECHNICIAN</option><option>JANITOR</option><option>SECURITY</option><option>DELIVERY</option><option>OTHER</option></select></label></div><div className="info-callout"><span>i</span><p><strong>Default deny is on.</strong> After creating this person, use Manage access to assign a time-bounded policy.</p></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button className="secondary-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" disabled={saving} type="submit">{saving ? "Adding…" : "Add person"}</button></div></form></div>
  );
}

function AccessDialog({ person, profiles, assignments, onClose, onSaved }: { person: Person; profiles: Profile[]; assignments: Assignment[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [selectedProfileId, setSelectedProfileId] = useState(profiles.find((profile) => !assignments.some((assignment) => assignment.profileId === profile.id))?.id ?? profiles[0]?.id ?? "");
  const [validUntil, setValidUntil] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10); });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function assign() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId: person.id, profileId: selectedProfileId, validUntil: validUntil ? `${validUntil}T23:59:59.000Z` : null, reason: "Approved in Atlas Control" }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Access could not be assigned.");
      onSaved(`${profiles.find((profile) => profile.id === selectedProfileId)?.name} assigned to ${person.firstName}.`);
    } catch (assignError) { setError(assignError instanceof Error ? assignError.message : "Access could not be assigned."); } finally { setSaving(false); }
  }
  async function revoke(assignment: Assignment) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/access", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ assignmentId: assignment.id, reason: "Revoked by security administrator" }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Access could not be revoked.");
      onSaved(`${profiles.find((profile) => profile.id === assignment.profileId)?.name} revoked from ${person.firstName}.`);
    } catch (revokeError) { setError(revokeError instanceof Error ? revokeError.message : "Access could not be revoked."); } finally { setSaving(false); }
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}><div className="modal access-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Least-privilege assignment</p><h2>Manage {person.firstName}’s access</h2><p>Changes are effective immediately and recorded in the administrative history.</p></div><button className="close-button" onClick={onClose} type="button">×</button></div><div className="current-access"><p className="eyebrow">Active now · {assignments.length}</p>{assignments.length === 0 && <div className="no-access-state"><span>⊘</span><p><strong>No active access</strong><small>All controlled zones will deny by default.</small></p></div>}{assignments.map((assignment) => { const profile = profiles.find((item) => item.id === assignment.profileId); return <div className="current-assignment" key={assignment.id}><span className="policy-icon policy-hue-2">◆</span><div><strong>{profile?.name}</strong><small>{profile?.schedule} · {formatDate(assignment.validUntil)}</small></div><button disabled={saving} onClick={() => revoke(assignment)} type="button">Revoke</button></div>; })}</div><div className="new-assignment"><p className="eyebrow">Assign a profile</p><label><span>Access policy</span><select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.schedule}</option>)}</select></label><div className="profile-preview">{profiles.filter((profile) => profile.id === selectedProfileId).map((profile) => <div key={profile.id}><span className="policy-icon policy-hue-1">◆</span><div><strong>{profile.name}</strong><p>{profile.description}</p><small>{profile.zoneCount ?? profile.zones?.length ?? 0} covered zones · {profile.schedule}</small></div></div>)}</div><label><span>Access expires at end of day</span><input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button className="secondary-button" onClick={onClose} type="button">Done</button><button className="primary-button" disabled={saving || !selectedProfileId} onClick={assign} type="button">{saving ? "Saving…" : "Assign access"}</button></div></div></div>
  );
}
