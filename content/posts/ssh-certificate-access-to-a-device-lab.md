+++
title = "SSH certificate access to a device lab, end to end"
date = 2026-06-29
description = "A practical guide to short-lived, identity-bound SSH access for a device lab: a CA, Keycloak over LDAP as the OIDC provisioner, and certificate principals as authorization."
keywords = ["ssh certificates", "ssh certificate authority", "step-ca", "keycloak oidc", "ssh ca ldap", "authorizedprincipalscommand", "short-lived ssh access", "zero trust ssh"]
tags = ["ssh", "security", "infrastructure", "keycloak", "pki"]
draft = false
+++

I run a fleet of embedded Linux test benches. Each bench is a small gateway
(a Raspberry Pi) with a board under test wired to it. People and CI jobs need
to SSH into those gateways and boards to flash images, drive tests, and poke
at failures. The question that looks trivial and is not: **who is allowed to
SSH where, and how do you keep that true over time?**

This is the guide I wish I had when I started. It walks the whole picture
first, then explains each part: why you want a certificate authority at all,
how Keycloak (backed by your company directory over LDAP) becomes the thing
that decides identity, how a CA turns that identity into a short-lived SSH
certificate, and what has to happen on each device so that a certificate
actually opens a session. One piece I underestimated, and spend real time on
below, is how each device learns *who currently holds it*, so that SSH access
can follow a live reservation. None of the parts are hard on their own. The
value is in seeing how they connect.

The examples use [step-ca](https://smallstep.com/docs/step-ca/),
[Keycloak](https://www.keycloak.org/), and OpenSSH, but the model is
portable. Swap Keycloak for Azure AD or Okta, swap step-ca for any CA that
speaks OIDC, and the shape is identical.

## Why not just SSH keys

Every lab starts the same way. A shared root password in a wiki. Then someone
sets up SSH keys, which is better, until you count the work: every device
needs every authorized public key, and that is a matrix that grows with
people times devices. Then someone leaves, or a contractor's three months
end, and nobody removes their key from twenty devices, because the only
priority anyone actually has is "make the tests pass."

The root problem is **lifecycle**. An SSH key in `authorized_keys` is valid
forever, on every device it was ever copied to, until a human actively
deletes it. In a test lab, no human is actively deleting anything.

Certificates flip the model. Instead of copying many keys to many devices,
every device trusts one **certificate authority**. People do not hold standing
access; they hold the ability to ask the CA for a **short-lived certificate**
after proving who they are. A certificate is good for hours, not forever. When
it expires, access is simply gone. No revocation lists, no cleanup playbooks.
A contractor's access disappears on its own when their certificate is not
renewed.

That single idea, "devices trust a CA, not a pile of keys," is the whole
reason a CA exists in this design.

## The full picture

Here is the entire system on one page. Read it once now; the rest of the post
zooms into each box.

{{< diagram >}}
- title: Company directory
  kicker: LDAP / Active Directory
  desc: Users and groups live here. Nothing is provisioned per device.
- title: Keycloak
  kicker: identity provider
  edge: users, groups
  desc: Federates the directory. You log in with corporate credentials; group membership becomes roles.
- title: step-ca
  kicker: certificate authority
  edge: signed token · identity + roles
  desc: Trusts Keycloak as an OIDC provisioner. Validates the token, then signs your SSH key. A template turns claims into <code>principals</code>.
- title: Test bench gateway / device
  kicker: sshd → AuthorizedPrincipalsCommand
  edge: short-lived SSH certificate
  desc: Trusts the CA, holds its own host certificate, and runs a script that decides which principals are allowed <strong>right now</strong>.
  aside:
    title: Reservation system
    tag: out of band
    branch: who holds it now
    desc: A per-host sync service watches the reservation system and records the current owner in the same identity form used as a principal.
{{< /diagram >}}

Three things feed the decision on the device. The first is **identity**: LDAP
knows who you are, Keycloak proves it, step-ca stamps it into a certificate.
The second is **authorization**, and it rides inside the certificate as a list
of **principals**: short labels like `you@example.com`, an environment tag, a
role, or a reservation owner ID. The third does *not* ride in the certificate
at all: each host separately learns who currently holds it, straight from the
lab's reservation system, and feeds that into the same check. That third input
is the one people forget, so it gets its own section below.

The device side never has to know who you are. It only has to answer one
question: does this certificate carry a principal I am willing to accept right
now, given who holds the device? Everything below is just the detail of those
flows.

## Identity: Keycloak backed by LDAP

You almost certainly already have a source of truth for "who works here": a
company LDAP or Active Directory. The goal is to not invent a second one.

Keycloak sits in front of that directory as the identity provider. In
Keycloak this is **User Federation**: you point Keycloak at your LDAP server
with a read-only bind, and from then on people log in with their normal
corporate username and password. No separate lab accounts to create or
deprovision; when someone is removed from the directory, they can no longer
authenticate, full stop.

You do not need much LDAP detail to make this work. The two pieces that
matter for access control are:

- **Users** come from LDAP. Keycloak validates the login against the
  directory.
- **Groups** come from LDAP too, and a Keycloak group/role mapper turns
  "member of LDAP group `lab-admins`" into a Keycloak role like `admin`. That
  role is the thing that will eventually become a certificate principal.

So the chain is: directory group -> Keycloak role -> token claim ->
certificate principal -> access on the device. That is the whole reason LDAP is
in the picture. It is how "this person is in the platform team" becomes "this
person may SSH to prod benches," without anyone editing a file on a device.

For non-interactive callers (CI), you do not use a human login. You create a
Keycloak **client** with the OIDC client-credentials grant: CI presents a
client id and secret, gets a token, and never opens a browser.

## The CA: step-ca with Keycloak as the provisioner

step-ca is the certificate authority. The key concept is the **provisioner**:
a configured way to obtain a certificate. We configure an **OIDC
provisioner** that trusts Keycloak.

In step-ca's `ca.json`, an OIDC provisioner is essentially a client id plus
the issuer's discovery URL:

```json
{
  "type": "OIDC",
  "name": "keycloak",
  "clientID": "test-infra-step",
  "configurationEndpoint": "https://idp.example.com/realms/lab/.well-known/openid-configuration",
  "claims": { "enableSSHCA": true, "defaultSSHCertDuration": "24h" }
}
```

The flow from a user's machine:

1. The user runs a small wrapper script (or CLI) that asks step-ca for an SSH
   certificate via the `keycloak` provisioner.
2. step-ca redirects them through Keycloak's OAuth2 device flow. The user logs
   in with corporate credentials (which Keycloak checks against LDAP).
3. Keycloak returns a signed token containing the user's email and roles.
4. step-ca validates that token against Keycloak's published keys, then signs
   the user's SSH public key into a certificate.

The certificate is short-lived by policy: 24h for users, 8h for CI. There is
nothing to revoke because there is nothing long-lived to revoke.

### Principals: turning identity into authorization

A signed certificate is not interesting until it carries the right
**principals**. step-ca decides what goes in using a template. Ours builds the
principal list from the token claims, roughly:

- the user's **email** (a stable personal identity),
- any **roles** the user has on the relevant client (this is where the LDAP
  group -> Keycloak role mapping surfaces, for example `admin` or
  `lab-dev`),
- an optional **`host_id`** of the form `hostname/username`, which is the hook
  for reservation-gated access (explained later).

The result is a certificate whose principal list literally describes what the
holder is allowed to be:

```
Principals:
    jane@example.com
    lab-dev
    jane-laptop/jane
```

There is one subtlety worth calling out because it confused me early on. For
CI, the `host_id` is injected by a tiny Keycloak **script mapper** that copies
a `host_id` form parameter from the token request into a token claim, so it is
vouched for by the IdP. For an interactive user, `host_id` is supplied
client-side and is therefore *not* cryptographically guaranteed by the IdP.
That is fine, and intentional: the device side does not trust `host_id` on its
own. It cross-checks it against a live reservation, so a forged `host_id` buys
nothing. Defense in depth, not blind trust.

## The host side, part 1: trusting the CA and staying trusted

Now the device. Two responsibilities live here, and people usually only think
about the first one.

**Responsibility 1: trust the CA, and prove your own identity.** A gateway has
to (a) trust user certificates the CA signed, and (b) present its own host
certificate so clients stop seeing "the authenticity of host ... can't be
established" prompts. Both come from a provisioning step that, on each host:

1. signs the host's SSH key with step-ca, producing a host certificate,
2. writes the CA's public key to `/etc/ssh/ca.pub`,
3. updates `sshd_config` to wire it together:

```
# trust user certs signed by our CA
TrustedUserCAKeys /etc/ssh/ca.pub
# present our own host certificate
HostKey         /etc/ssh/ssh_host_ed25519_key
HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub
```

In our setup this is driven by configuration management (Salt) that runs a
provisioning script with the CA URL and OIDC client credentials. It is
idempotent and validity-aware: a full re-provision only happens if the host
certificate is missing or already expired, so re-running it self-heals a
device that fell behind.

**Responsibility 2: stay trusted without human help.** Host certificates
expire too (ours are 30 days). Renewal must be automatic, and here is a trap I
paid for: do not use cron for this on appliance-style hosts. On some of our
devices `/etc` is a read-only overlay mounted `noexec`, so cron's `run-parts`
cannot execute a script dropped into `/etc/cron.weekly`, and the certificate
silently expired. The fix is a **systemd timer**:

- a `rotate-ssh-certificate.{service,timer}` pair runs daily,
- with `Persistent=true`, so a run missed while a bench was powered off is
  caught up at next boot,
- the script renews with `step ssh renew`, which authenticates using the
  existing host certificate and key, so **no OIDC secret is needed** for
  routine renewal,
- renewal only acts once the certificate is within a few days of expiry.

`step ssh renew` cannot resurrect an already-expired certificate, so the
validity-aware Salt re-provision above is the recovery path for a bench that
went fully stale. Renew before expiry with the timer; re-provision after
expiry with the state. Two mechanisms, clear division of labor.

## The host side, part 2: the access script

Trusting the CA answers "is this certificate genuine." It does not answer "is
this particular person allowed in right now." That is a separate decision, and
it is the part I most wish someone had drawn for me up front.

OpenSSH gives you the hook: instead of a static `AuthorizedPrincipalsFile`,
you can point sshd at a program with `AuthorizedPrincipalsCommand`. sshd runs
it on every certificate login and passes the certificate. The program prints
the principals it is willing to accept; if any printed line matches any
principal in the certificate, the login succeeds.

```
# sshd runs this for every cert login, passing user, cert type, cert blob
AuthorizedPrincipalsCommand /usr/local/bin/ssh-principals-check.sh %u %t %k
AuthorizedPrincipalsCommandUser root
```

Our `ssh-principals-check.sh` extracts the certificate's principals with
`ssh-keygen -L`, then applies a small, readable ladder of checks driven by a
config file (so each gate is a feature flag you can turn on per device):

1. **Admin bypass.** If the certificate carries the `admin` principal, allow.
   This is the break-glass path and it is deliberately first.
2. **CI bypass.** If it carries the environment-scoped CI principal (for
   example `lab-prod-ci`), allow. CI always reserves devices through the lab
   framework before touching them, so this is safe and avoids coupling access
   to ephemeral container hostnames.
3. **Environment gating** (optional). If enabled, the certificate must carry
   `<project>-<env>`, for example `lab-dev`. This is how a dev certificate is
   kept off prod benches.
4. **Reservation gating** (optional). If enabled, the certificate must carry a
   principal matching the device's *current reservation owner*. More on this
   next.

When more than one gate is on, they are **AND** conditions: a valid
certificate is necessary but not sufficient; it also has to clear every
enabled gate. The script logs each decision to syslog (`auth.info` /
`auth.warning`), which makes "why was I denied" a one-line grep instead of a
mystery.

## Reservation-gated access: the part that makes it a lab

Authentication proves who you are. In a *shared* lab you also want
authorization tied to "you actually have this device booked right now."

Most device labs have some reservation system so that two people do not grab
the same board at once (we use [labgrid](https://labgrid.org/), an open-source
orchestration framework for hardware labs, but the idea is generic). You
reserve a device and get exclusive use of its lab operations. The catch is
that plain SSH to the gateway is a side channel the reservation system does
not control. Reservation gating closes that gap so that SSH access follows the
reservation.

It is two cooperating pieces on each gateway:

- A small **sync service** watches the reservation system and writes the
  current reservation owner to a state file. The owner is recorded in the same
  `hostname/username` form that appears as the `host_id` principal in a user's
  certificate.
- The **access script** above, in its reservation-gating step, reads that
  state file and only accepts a certificate whose principals include the
  current owner.

### How reservation ownership reaches the host

This sync is easy to wave away and is surprisingly load-bearing, so here is
what it actually has to do. Your reservation system tracks, per device, who
holds it. In our case (labgrid) the coordinator exposes two fields per device:

- **acquired**: the current owner, set when someone locks the device and
  cleared on release,
- **allowed**: zero or more extra users the owner has granted access to.

A sync service on each gateway turns that into a tiny local state file the
access script can read with no network call on the hot path:

```
# /var/lib/.../current_owner
jane-laptop/jane          # line 1: the acquired owner
bob-laptop/bob            # lines 2+: allowed users (optional)
```

The access script grants access if any certificate principal matches any line.
That `allowed` list is how a reservation holder pulls in a colleague without
either of them being an admin.

How the data gets from the reservation system into that file is an
implementation choice. We have done it two ways:

- **Polling**: a systemd timer periodically asks the coordinator for this
  device's owner (`labgrid-client show`) and rewrites the state file. A few
  lines of shell, with a lag equal to the poll interval.
- **Event-driven**: a long-lived process subscribes to the coordinator over
  gRPC and rewrites the state file the instant a reservation changes. No lag,
  and it can export metrics for a dashboard, at the cost of a persistent
  connection.

This is the one place where "use whatever tool you already have" needs a
caveat, so check it before you commit. Whatever runs your reservations has to
let a host answer one question: *who holds this device right now?* Confirm your
tool can either be **queried** for the current owner per device, or better,
**subscribed to** for change events, and that the owner identity it reports can
be mapped to something you can put in a certificate (an email, a username, a
`hostname/username` pair). If your current tool cannot expose ownership at all,
that is the thing to fix, or the reason to pick a different one. Everything
else in reservation gating is downstream of that one capability.

The effect, from a user's seat (host names and the SSH login user are just
examples here):

```bash
# reserve the device through the lab's reservation system
reserve bench-02

# SSH now works: the cert's owner principal matches the reservation owner
ssh dev@bench-02      # granted

# without a reservation, the same valid certificate is refused
ssh dev@bench-02      # denied: no matching reservation
```

This is what makes a forged client-side `host_id` harmless: the principal has
to match a reservation the system actually granted. Certificate and
reservation both have to agree.

A note on failure modes, because they matter in a lab people depend on: if the
reservation system is unreachable or the sync service stalls, it keeps the
last known owner rather than locking everyone out. A monitoring outage should
not evict the person actively using a device. Roll it out gradually too: gate
one device first, watch the logs, then expand. Every gate is a feature flag
for exactly this reason.

## One login, start to finish

To make the moving parts concrete, here is what actually happens when a
developer runs `ssh dev@bench-02`:

1. Earlier that day they ran the auth wrapper, logged into Keycloak (checked
   against LDAP), and step-ca signed a 24h certificate carrying their email,
   their roles, and their `host_id`.
2. They reserved `bench-02`; the gateway's sync service recorded them as the
   current owner.
3. sshd on the gateway sees a certificate, verifies it was signed by the
   trusted CA and is unexpired.
4. sshd runs the access script with the certificate. Not admin, not CI;
   environment gate passes (`lab-dev` present); reservation gate passes
   (`host_id` matches the recorded owner).
5. The script prints the matching principals, sshd accepts, session opens.

No key was copied to the device. No password was typed. Tomorrow the
certificate expires and the whole thing has to be re-earned, which is exactly
what you want.

## Where to start

If you take one thing from this, let it be the order to build it in, because
trying to do it all at once is how this stalls.

1. **Stand up step-ca with a Keycloak OIDC provisioner, and trust the CA on
   your hosts.** This alone replaces key distribution with "log in with your
   company account, get a certificate, SSH works." It is the real win and
   everything else is optional on top.
2. **Add host certificates** at the same time. It is little extra effort and
   it kills `known_hosts` prompts forever.
3. **Automate host renewal with a systemd timer**, not cron, especially on
   appliance images with a `noexec` `/etc`.
4. **Add environment gating** only if you have a real dev/prod split worth
   enforcing.
5. **Add reservation gating** last, and only on devices that multiple people
   and CI actually contend over. For a bench only you use, it is overhead.

For two people and three devices this is overkill; use keys. The moment you
catch yourself asking "did we ever remove that contractor's access?" or "which
CI runner can reach which device?", certificates answer both by construction,
and your existing company directory is already most of the way there.
