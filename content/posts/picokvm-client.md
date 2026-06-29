+++
title = "Reverse-engineering the Luckfox PicoKVM into a Python client"
date = 2026-06-29
description = "How I reverse-engineered the Luckfox PicoKVM's JSON-RPC API and built picokvm-client: a typed Python client and CLI, tested without hardware."
keywords = ["picokvm", "luckfox picokvm", "jetkvm", "python kvm client", "json-rpc", "reverse engineering", "hardware automation", "cli"]
tags = ["python", "reverse-engineering", "embedded", "testing", "hardware"]
draft = false
+++

I do hardware-in-the-loop test automation. Part of that is driving a KVM
over IP: power-cycle a board, watch the screen, send keystrokes, mount an
installer image, all from a script with no human at the bench. The cheap
device that does this well is the [Luckfox
PicoKVM](https://github.com/LuckfoxTECH/kvm). The problem: there was no
Python client for it. So I wrote one and published it.

[`picokvm-client`](https://github.com/onurcelep/picokvm-client) is a small,
typed, synchronous client and CLI for the PicoKVM, on PyPI:

```bash
pip install picokvm-client
# or
uv add picokvm-client
```

This post is less about the package and more about how I got there: reading
an undocumented protocol off the wire, deciding what a good client looks
like, and testing it without a device on the desk.

## What the PicoKVM actually speaks

The PicoKVM firmware is a Luckfox-Pico fork of
[JetKVM](https://github.com/jetkvm/kvm). There is no published API document,
so the protocol had to come off the device itself. Watching the web UI talk
to the box, the surface turned out to be small and clean:

- Authentication is a cookie. `POST /auth/login-local` with the password
  sets a session cookie that every later call carries.
- Everything else is [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
  over a single endpoint, `POST /api/rpc`. Methods like `getDeviceID`,
  `getVideoState`, `keyboardReport`, `mountWithHTTP`.
- Keyboard and mouse input are standard USB HID Boot-Protocol reports. The
  device just forwards the report bytes to the attached host. No vendor
  magic, just the HID spec.

That last point is the important one. Once you know the input layer is plain
HID, "type a string" stops being a special feature and becomes a small
encoder: map characters to HID usage codes plus modifier bits, emit the
press report, emit the release report. Same for key combos like
`Ctrl+Alt+Del` and for absolute and relative mouse movement.

No vendor source is bundled in the client. It reimplements the device's
public JSON-RPC protocol and the standard HID reports, nothing more.

## What I wanted the client to be

A wrapper around an RPC endpoint is easy to write badly: a single `call()`
that takes a method string and returns a dict, and now every caller is
juggling raw dictionaries and magic strings. I wanted something a colleague
could use without reading the protocol notes.

The shape I landed on:

**Typed methods for the common path, an escape hatch for the rest.** The
operations you actually reach for, ping, video state, keyboard and mouse,
virtual media, power, get real methods with real signatures and typed
returns:

```python
from picokvm_client import PicoKVMClient

with PicoKVMClient("http://kvm.example", password="hunter2") as kvm:
    if not kvm.ping():
        raise RuntimeError("KVM not responding")

    state = kvm.get_video_state()
    print(f"Video: {state.width}x{state.height}, ready={state.ready}")

    kvm.key_combo("Ctrl+Alt+Del")
    kvm.type_text("hello world\n")
    kvm.click(state.width // 2, state.height // 2)

    kvm.mount_with_http("https://files.example.com/installer.iso")
    kvm.trigger_reset()
```

Anything the device exposes that does not have a typed method is still one
call away through `client.rpc(method, **params)`. The typed surface covers
the 90 percent without boxing anyone out of the rest.

**A context manager that owns the session.** The client holds an
`httpx.Client` and the session cookie. `__enter__` logs in when a password
is set; `__exit__` releases the connection pool and the cookie. You cannot
forget to clean up.

**Exceptions you can act on.** Everything inherits from a single
`PicoKVMError` (a plain `Exception`, no third-party base to leak into your
code). `AuthError` for 401, `RpcError` for a JSON-RPC error response,
`TransportError` for the network and bad-response cases. Each carries
advisory `exit_code`, `hint`, and `retryable` attributes, so a caller can
map them onto its own error model or a CLI exit code without string-matching
messages.

**Typed end to end.** Ships with `py.typed`, checked under `mypy --strict`.
Consumers get the types, not just me.

## A CLI on top of the same client

The same operations are available from the shell. The package installs a
`picokvm` command:

```bash
export PICOKVM_URL=http://kvm.example PICOKVM_PASSWORD=hunter2

picokvm ping
picokvm device-id
picokvm video-state
picokvm type "hello world"
picokvm combo "Ctrl+Alt+Del"
picokvm rpc getJigglerState
```

The `rpc` subcommand mirrors the library escape hatch: any method on the
device, straight from the shell, which is handy when you are still poking at
the protocol.

## Testing a hardware client with no hardware

The interesting engineering problem in a device client is not the happy
path, it is testing it. You cannot put a physical KVM in CI, and you do not
want tests that only pass when a specific box is plugged in.

The protocol is HTTP, so the device is fakeable. The tests drive the client
through
[`httpx.MockTransport`](https://www.python-httpx.org/advanced/transports/),
which intercepts requests in-process. No sockets open. Each test asserts the
exact JSON-RPC `method` and `params` the client puts on the wire, and feeds
back canned responses and error cases.

That turns "does typing a string work" into a precise, hardware-free check:
given `type_text("hi")`, assert the exact sequence of `keyboardReport`
payloads, including modifier bits and the release reports. The HID encoding,
the auth flow, the error mapping, all verified without a device.

The result is roughly a one-to-one test-to-source ratio (about 100 test
cases against ~1000 lines of client), run on every commit in CI across
Python 3.11 through 3.13. The one honest gap: the HID commands are checked at
the payload level only. Whether the attached host interprets those bytes the
way you expect still needs a manual smoke test on a throwaway target, which
the README says plainly.

## Honest scope

Two warnings ship with the package, and they belong here too.

It is **unofficial**. Independent and community-built, not affiliated with
or endorsed by Luckfox or JetKVM. It is tested against the PicoKVM only.
Because the PicoKVM firmware shares ancestry with JetKVM, the wire protocol
currently overlaps, but the client makes no compatibility promise to JetKVM.
A JetKVM is better served by a dedicated client.

And the HID commands inject input into whatever host is attached to the KVM.
A mistake can lock the keyboard, type into the wrong window, or click at a
random coordinate. Test against something disposable before wiring these
into automation.

## Links

- Source: <https://github.com/onurcelep/picokvm-client>
- PyPI: <https://pypi.org/project/picokvm-client/>
- Issues and feedback: <https://github.com/onurcelep/picokvm-client/issues>

If you run a PicoKVM, I would like to know whether it works against your
unit and firmware version. That is the one thing I cannot test alone.
