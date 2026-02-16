# Governance Rules

Non-negotiable rules for the 3-tier multi-tenant platform model. These rules apply to every project, regardless of whether all tiers are active.

---

## Parent-Child Relationships

### Hierarchy Structure

```
T0 (Platform)
 +-- T1-A (Partner)
 |    +-- T2-A1 (Customer)
 |    +-- T2-A2 (Customer)
 +-- T1-B (Partner)
      +-- T2-B1 (Customer)
```

### Rules

1. **T0 is the root.** There is exactly one T0 tenant per platform. It has no parent (`parent_id IS NULL`).

2. **T1 parents are always T0.** A T1 tenant's `parent_id` must reference the T0 tenant.

3. **T2 parents are always T1.** A T2 tenant's `parent_id` must reference a T1 tenant.

4. **No deeper nesting.** The hierarchy is exactly 3 levels. If sub-organizations are needed within T2, model them as "teams" or "departments" within the application layer, not as additional tenant tiers.

5. **Parent is immutable.** Once a tenant's `parent_id` is set at creation, it cannot be changed. Reparenting (moving a T2 from one T1 to another) requires a formal migration process with data export/import and audit trail.

6. **Deletion cascades logically, not physically.** Deleting a T1 sets it and all its T2 children to `status = 'decommissioned'`. Data is retained for the compliance retention period (minimum 7 years) before physical deletion.

---

## Access Control

### Visibility Rules

| Actor Tier | Can See Own Data | Can See Children | Can See Parent | Can See Siblings |
|------------|-----------------|-----------------|----------------|-----------------|
| **T0** | Yes | Yes (all T1, all T2) | N/A (root) | N/A (singleton) |
| **T1** | Yes | Yes (own T2s) | **No** | **No** |
| **T2** | Yes | N/A (leaf) | **No** | **No** |

### Hard Rules

1. **Never siblings.** A T1 tenant can never see another T1's data. A T2 tenant can never see another T2's data, even if they share the same T1 parent.

2. **Never upward.** A T2 can never see its T1 parent's management data. A T1 can never see T0's platform data. The hierarchy is opaque when looking upward.

3. **T0 sees everything.** Platform operators have full read access to all tenant data, but every access is audit-logged with the T0 actor's identity.

4. **Cross-tenant queries are prohibited.** The application layer must never construct queries that join data across tenants. If cross-tenant analytics are needed, they run at T0 or T1 level using the closure table to scope the query to authorized descendants.

5. **API responses never leak tenant hierarchy.** A T2 API response must not include its T1 parent's ID, name, or any metadata. The tenant appears to T2 users as if it were a standalone instance.

---

## Delegation Model

Delegation defines what capabilities a higher tier can grant to a lower tier.

### T0 to T1 Delegation

T0 can delegate the following to T1 partners:

| Capability | Delegatable | Notes |
|-----------|-------------|-------|
| Create T2 tenants | Yes | T1 can onboard its own customers |
| Set T2 feature flags | Yes | Within limits defined by T0 |
| Custom domain mapping | Yes | T1 manages its own domains |
| Theme customization | Yes | Within protected token constraints |
| User management | Yes | For T1's own users and T2 users |
| Billing management | Yes | T1 can manage T2 billing |
| View audit logs | Yes | For T1 and its T2 descendants |
| Modify platform settings | **No** | T0-only |
| Access other T1 data | **No** | Never |
| Modify RLS policies | **No** | Infrastructure-level, T0-only |
| Change isolation mode | **No** | Requires T0 migration |

### T1 to T2 Delegation

T1 can delegate the following to T2 customers:

| Capability | Delegatable | Notes |
|-----------|-------------|-------|
| User management | Yes | T2 manages its own org members |
| Theme customization | Yes | Within T1's allowed overrides |
| Data export | Yes | T2 can export its own data |
| API key management | Yes | Scoped to T2's own resources |
| Feature configuration | Yes | Within T1-defined limits |
| Create sub-tenants | **No** | T2 is the leaf tier |
| Modify T1 settings | **No** | Never |
| View other T2 data | **No** | Never |
| Domain management | **No** | T1 manages domains |
| Billing configuration | **No** | T1 manages billing |

### Delegation Inheritance

- Delegations do not automatically cascade. T0 delegating "theme customization" to T1 does not mean T1 automatically delegates it to T2. T1 must explicitly delegate to T2.
- A tier can never delegate more than it was given. If T0 restricts T1 to 5 custom colors, T1 cannot grant T2 access to 10 custom colors.
- Delegation records are versioned and audit-logged.

---

## Token and Branding Autonomy

### Token Override Hierarchy

```
T0 Base Tokens (platform defaults)
 +-- T1 Overrides (partner branding)
      +-- T2 Overrides (customer branding)
```

### Rules

1. **T0 defines the base token set.** All semantic tokens have platform-level defaults. These are the fallback for any token not overridden at T1 or T2.

2. **T1 can override non-protected tokens.** Partners can customize brand colors, typography, logo, spacing scale, and component variants -- but not protected tokens.

3. **T2 can override tokens that T1 has marked as customizable.** By default, T2 can override: logo, primary brand color, and a limited set of surface colors. T1 controls which tokens are exposed to T2.

4. **Protected tokens are immutable below T0.** The following tokens are platform-controlled and cannot be overridden by T1 or T2:
   - Minimum contrast ratios (WCAG AA enforcement)
   - Minimum touch target sizes (48px)
   - Focus indicator styles
   - Minimum font sizes (14px body, 12px caption)
   - Animation duration limits (respects `prefers-reduced-motion`)
   - Z-index scale (prevents layering conflicts)

5. **Token resolution is bottom-up.** The system resolves a token by checking T2 first, then T1, then T0. First non-null value wins.

6. **All token overrides are validated at write time.** The platform checks WCAG AA compliance, valid CSS values, and protected token constraints before persisting any override.

---

## Data Residency

### Implications per Tier

| Tier | Data Residency Scope | Notes |
|------|---------------------|-------|
| **T0** | Platform operator's jurisdiction | Management plane data follows T0's policies |
| **T1** | Partner's jurisdiction or contract-defined | DB-per-T1 isolation enables geographic placement via Neon regions |
| **T2** | Inherited from T1 unless explicitly overridden | T2 data resides in the same database as its T1 parent |

### Rules

1. **T1 isolation enables regional compliance.** Because T1 partners get their own database (Neon branch), the database can be provisioned in a specific region to meet data residency requirements (e.g., EU data stays in EU).

2. **T2 inherits T1's region.** Since T2 data lives within T1's database via RLS, it automatically resides in the same region as T1.

3. **Cross-region queries are prohibited.** If two T1 partners are in different regions, T0 analytics must query each region independently and aggregate results, never join across regions.

4. **Data export respects residency.** When T2 exports its data, the export is generated within the same region and served from the nearest edge location. Data never transits through a non-authorized region.

5. **Residency metadata is stored on the tenant record.** The `metadata` JSONB column on the tenants table includes a `data_residency` field specifying the required region, enabling runtime validation.
