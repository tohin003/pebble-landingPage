"""The take agent's hands: real pointer and keyboard events through CoreGraphics, and the macOS permission checks.

This calls the same CoreGraphics functions JXA's bridge exposes (CGEventCreateMouseEvent, CGEventKeyboardSetUnicodeString,
CGEventPost …), from the framework Python every user on this Mac can run, through ctypes: nothing is compiled or
installed. The events go in at the HID level, exactly where a trackpad's and a keyboard's do, so the pointer really
moves and the apps really receive the keys: in the film's terms this is the person's input, recorded, never painted.

SAFETY: nothing here posts an event unless `arm(demo_user)` succeeded, and `arm` succeeds only when this process runs
as the demo user (default "studio"). Every post re-checks the user. In any other account (the person's own, where the
tests run) the module can build events and read them back, but never posts one.
"""

from __future__ import annotations

import ctypes
import math
import os
import pwd
import random
import time
from ctypes import POINTER, c_bool, c_double, c_int32, c_int64, c_size_t, c_uint16, c_uint32, c_uint64, c_ulong, c_void_p

_CG = ctypes.CDLL("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")
_CF = ctypes.CDLL("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation")
_AS = ctypes.CDLL("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices")


class CGPoint(ctypes.Structure):
    _fields_ = [("x", c_double), ("y", c_double)]


class CGSize(ctypes.Structure):
    _fields_ = [("width", c_double), ("height", c_double)]


class CGRect(ctypes.Structure):
    _fields_ = [("origin", CGPoint), ("size", CGSize)]


def _fn(lib, name, restype, argtypes):
    f = getattr(lib, name)
    f.restype = restype
    f.argtypes = argtypes
    return f


CGEventSourceCreate = _fn(_CG, "CGEventSourceCreate", c_void_p, [c_int32])
CGEventCreate = _fn(_CG, "CGEventCreate", c_void_p, [c_void_p])
CGEventCreateMouseEvent = _fn(_CG, "CGEventCreateMouseEvent", c_void_p, [c_void_p, c_uint32, CGPoint, c_uint32])
CGEventCreateKeyboardEvent = _fn(_CG, "CGEventCreateKeyboardEvent", c_void_p, [c_void_p, c_uint16, c_bool])
CGEventCreateScrollWheelEvent2 = _fn(_CG, "CGEventCreateScrollWheelEvent2", c_void_p, [c_void_p, c_uint32, c_uint32, c_int32, c_int32, c_int32])
CGEventKeyboardSetUnicodeString = _fn(_CG, "CGEventKeyboardSetUnicodeString", None, [c_void_p, c_ulong, POINTER(c_uint16)])
CGEventKeyboardGetUnicodeString = _fn(_CG, "CGEventKeyboardGetUnicodeString", None, [c_void_p, c_ulong, POINTER(c_ulong), POINTER(c_uint16)])
CGEventSetFlags = _fn(_CG, "CGEventSetFlags", None, [c_void_p, c_uint64])
CGEventGetFlags = _fn(_CG, "CGEventGetFlags", c_uint64, [c_void_p])
CGEventGetType = _fn(_CG, "CGEventGetType", c_uint32, [c_void_p])
CGEventSetIntegerValueField = _fn(_CG, "CGEventSetIntegerValueField", None, [c_void_p, c_uint32, c_int64])
CGEventGetIntegerValueField = _fn(_CG, "CGEventGetIntegerValueField", c_int64, [c_void_p, c_uint32])
CGEventGetLocation = _fn(_CG, "CGEventGetLocation", CGPoint, [c_void_p])
CGEventPost = _fn(_CG, "CGEventPost", None, [c_uint32, c_void_p])
CGMainDisplayID = _fn(_CG, "CGMainDisplayID", c_uint32, [])
CGDisplayBounds = _fn(_CG, "CGDisplayBounds", CGRect, [c_uint32])
CGDisplayCopyDisplayMode = _fn(_CG, "CGDisplayCopyDisplayMode", c_void_p, [c_uint32])
CGDisplayModeGetPixelWidth = _fn(_CG, "CGDisplayModeGetPixelWidth", c_size_t, [c_void_p])
CGDisplayModeGetPixelHeight = _fn(_CG, "CGDisplayModeGetPixelHeight", c_size_t, [c_void_p])
CGDisplayModeGetWidth = _fn(_CG, "CGDisplayModeGetWidth", c_size_t, [c_void_p])
CGDisplayModeGetRefreshRate = _fn(_CG, "CGDisplayModeGetRefreshRate", c_double, [c_void_p])
CGDisplayModeRelease = _fn(_CG, "CGDisplayModeRelease", None, [c_void_p])
CGPreflightPostEventAccess = _fn(_CG, "CGPreflightPostEventAccess", c_bool, [])
CGPreflightScreenCaptureAccess = _fn(_CG, "CGPreflightScreenCaptureAccess", c_bool, [])
CFRelease = _fn(_CF, "CFRelease", None, [c_void_p])
AXIsProcessTrusted = _fn(_AS, "AXIsProcessTrusted", c_bool, [])

# CGEventType
MOUSE_DOWN = {"left": 1, "right": 3}
MOUSE_UP = {"left": 2, "right": 4}
MOUSE_MOVED = 5
MOUSE_DRAGGED = {"left": 6, "right": 7}
KEY_DOWN, KEY_UP, FLAGS_CHANGED, SCROLL = 10, 11, 12, 22
BUTTON = {"left": 0, "right": 1}
FIELD_CLICK_STATE = 1
HID_TAP = 0                 # kCGHIDEventTap: where hardware events enter
HID_STATE = 1               # kCGEventSourceStateHIDSystemState
SCROLL_UNIT_LINE = 1
FLAG = {"shift": 0x20000, "ctrl": 0x40000, "opt": 0x80000, "cmd": 0x100000, "fn": 0x800000}
FLAG_NUMPAD = 0x200000
MOD_KEYCODE = {"shift": 56, "ctrl": 59, "opt": 58, "cmd": 55, "fn": 63}
RETURN_KEYCODE = 36
TICK_S = 1 / 120            # pointer updates at 120 Hz, twice the recording's 60 fps


class NotArmed(RuntimeError):
    pass


_ARMED_FOR: str | None = None


def current_user() -> str:
    return pwd.getpwuid(os.getuid()).pw_name


def arm(demo_user: str) -> bool:
    """Allows posting events, only when this process runs as the demo user. Returns whether it is armed."""
    global _ARMED_FOR
    _ARMED_FOR = demo_user if current_user() == demo_user else None
    return _ARMED_FOR is not None


def armed() -> bool:
    return _ARMED_FOR is not None and current_user() == _ARMED_FOR


def _post(ev: int) -> None:
    if not armed():
        CFRelease(ev)
        raise NotArmed(f"refusing to post an input event as '{current_user()}': the agent posts only as the demo user")
    CGEventPost(HID_TAP, ev)
    CFRelease(ev)


# ---- reading (safe anywhere) --------------------------------------------------------------------------------------

def permissions() -> dict:
    """What macOS lets this process (through its responsible app, Terminal) do. Asking never prompts."""
    return {"accessibility": bool(AXIsProcessTrusted()), "post_events": bool(CGPreflightPostEventAccess()),
            "screen_recording": bool(CGPreflightScreenCaptureAccess())}


def screen_info() -> dict:
    d = CGMainDisplayID()
    b = CGDisplayBounds(d)
    mode = CGDisplayCopyDisplayMode(d)
    try:
        px_w, px_h = CGDisplayModeGetPixelWidth(mode), CGDisplayModeGetPixelHeight(mode)
        pt_w, hz = CGDisplayModeGetWidth(mode), CGDisplayModeGetRefreshRate(mode)
    finally:
        CGDisplayModeRelease(mode)
    return {"display": int(d), "points": {"x": b.origin.x, "y": b.origin.y, "w": b.size.width, "h": b.size.height},
            "pixels": {"w": int(px_w), "h": int(px_h)}, "scale": (px_w / pt_w) if pt_w else None, "refresh_hz": hz}


def pointer_location() -> tuple[float, float]:
    ev = CGEventCreate(None)
    try:
        p = CGEventGetLocation(ev)
        return (p.x, p.y)
    finally:
        CFRelease(ev)


# ---- event builders (pure: they make events and hand them back) ---------------------------------------------------

_SOURCE: int | None = None


def _source() -> int:
    global _SOURCE
    if _SOURCE is None:
        _SOURCE = CGEventSourceCreate(HID_STATE)
    return _SOURCE


def mouse_event(kind: int, x: float, y: float, button: str = "left", clicks: int = 0, flags: int = 0) -> int:
    ev = CGEventCreateMouseEvent(_source(), kind, CGPoint(x, y), BUTTON[button])
    if clicks:
        CGEventSetIntegerValueField(ev, FIELD_CLICK_STATE, clicks)
    if flags:
        CGEventSetFlags(ev, flags)
    return ev


def key_event(keycode: int, down: bool, flags: int = 0, text: str | None = None) -> int:
    ev = CGEventCreateKeyboardEvent(_source(), keycode, down)
    if text is not None:
        units = text.encode("utf-16-le")
        arr = (c_uint16 * (len(units) // 2)).from_buffer_copy(units)
        CGEventKeyboardSetUnicodeString(ev, len(arr), arr)
    CGEventSetFlags(ev, flags)
    return ev


def event_text(ev: int) -> str:
    n = c_ulong(0)
    buf = (c_uint16 * 16)()
    CGEventKeyboardGetUnicodeString(ev, 16, ctypes.byref(n), buf)
    return bytes(buf)[: n.value * 2].decode("utf-16-le")


def flags_for(mods: list[str], arrow: bool = False) -> int:
    f = 0
    for m in mods:
        f |= FLAG[m]
    if arrow:
        f |= FLAG_NUMPAD | FLAG["fn"]  # what a real arrow key carries (Mission Control's ⌃→ needs them)
    return f


# ---- paths and timing (pure) ------------------------------------------------------------------------------------

def min_jerk(t: float) -> float:
    return t * t * t * (10 - 15 * t + 6 * t * t)


def path_points(x0: float, y0: float, x1: float, y1: float, ms: int, curve: float, rng: random.Random) -> list[tuple[float, float]]:
    """A hand's path: a gentle arc (a quadratic curve bowed sideways by `curve` × the distance) travelled with the
    minimum-jerk speed profile, sampled at 120 Hz. The last point is exactly the target."""
    n = max(2, int(round(ms / 1000 / TICK_S)))
    dx, dy = x1 - x0, y1 - y0
    dist = math.hypot(dx, dy)
    side = rng.choice((-1, 1))
    cx = (x0 + x1) / 2 - dy / (dist or 1) * dist * curve * side
    cy = (y0 + y1) / 2 + dx / (dist or 1) * dist * curve * side
    pts = []
    for i in range(1, n + 1):
        s = min_jerk(i / n)
        a, b, c = (1 - s) ** 2, 2 * (1 - s) * s, s * s
        pts.append((a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1))
    pts[-1] = (x1, y1)
    return pts


def move_ms(x0: float, y0: float, x1: float, y1: float) -> int:
    """Fitts-like: about 0.35 s for a short hop, about 0.9 s across the screen."""
    d = math.hypot(x1 - x0, y1 - y0)
    return int(max(180, min(1100, 260 + 140 * math.log2(1 + d / 30))))


def circle_points(cx: float, cy: float, r: float, turns: float, ms: int) -> list[tuple[float, float]]:
    n = max(8, int(ms / 1000 / TICK_S))
    return [(cx + r * math.cos(2 * math.pi * turns * i / n), cy + r * math.sin(2 * math.pi * turns * i / n)) for i in range(n + 1)]


def typing_delays(text: str, cps: float, jitter: float, rng: random.Random) -> list[float]:
    """The pause before each character: a steady hand at `cps` characters a second, a little uneven, with a longer
    breath after a space and after punctuation."""
    base = 1 / cps
    out = []
    prev = ""
    for ch in text:
        d = base * (1 + jitter * rng.uniform(-1, 1))
        if prev == " ":
            d *= 1.25
        elif prev in ",.;:?!":
            d *= 1.8
        out.append(max(0.03, d))
        prev = ch
    if out:
        out[0] = 0.0
    return out


# ---- the hands (post events: armed only) -------------------------------------------------------------------------

class Hands:
    """Posts real input. `should_stop()` is checked between events, so the kill switch acts within one tick."""

    def __init__(self, should_stop=lambda: False, seed: int = 0):
        self.should_stop = should_stop
        self.rng = random.Random(seed)
        self.down_button: str | None = None
        self.down_mods: list[str] = []

    def _sleep_until(self, t: float) -> None:
        while True:
            left = t - time.monotonic()
            if left <= 0:
                return
            if self.should_stop():
                raise InterruptedError("stopped")
            time.sleep(min(left, 0.05))

    def move(self, x: float, y: float, ms: int | None = None, curve: float = 0.12) -> None:
        x0, y0 = pointer_location()
        ms = ms or move_ms(x0, y0, x, y)
        kind = MOUSE_DRAGGED[self.down_button] if self.down_button else MOUSE_MOVED
        self._glide(path_points(x0, y0, x, y, ms, curve, self.rng), kind)

    def _glide(self, pts: list[tuple[float, float]], kind: int) -> None:
        t = time.monotonic()
        for (px, py) in pts:
            if self.should_stop():
                raise InterruptedError("stopped")
            _post(mouse_event(kind, px, py, self.down_button or "left"))
            t += TICK_S
            self._sleep_until(t)

    def press(self, button: str = "left", clicks: int = 1, flags: int = 0) -> None:
        x, y = pointer_location()
        _post(mouse_event(MOUSE_DOWN[button], x, y, button, clicks, flags))
        self.down_button = button

    def release(self, button: str = "left", clicks: int = 1, flags: int = 0) -> None:
        x, y = pointer_location()
        _post(mouse_event(MOUSE_UP[button], x, y, button, clicks, flags))
        self.down_button = None

    def click(self, button: str = "left", count: int = 1, hold_ms: int = 70, mods: list[str] | None = None, on_press=None) -> None:
        mods = mods or []
        self.mods_down(mods)
        try:
            for n in range(1, count + 1):
                if n == 1 and on_press:
                    on_press()
                self.press(button, n, flags_for(mods))
                self._sleep_until(time.monotonic() + hold_ms / 1000)
                self.release(button, n, flags_for(mods))
                if n < count:
                    self._sleep_until(time.monotonic() + 0.09)
        finally:
            self.mods_up()

    def drag(self, pts: list[tuple[float, float]], hold_ms: int = 120) -> None:
        self.press("left", 1)
        try:
            self._sleep_until(time.monotonic() + hold_ms / 1000)
            self._glide(pts, MOUSE_DRAGGED["left"])
            self._sleep_until(time.monotonic() + hold_ms / 1000)
        finally:
            self.release("left", 1)

    def scroll(self, lines: int, ms: int = 400) -> None:
        steps = max(1, abs(lines))
        sign = 1 if lines > 0 else -1
        t = time.monotonic()
        for _ in range(steps):
            ev = CGEventCreateScrollWheelEvent2(_source(), SCROLL_UNIT_LINE, 1, -sign, 0, 0)
            _post(ev)
            t += ms / 1000 / steps
            self._sleep_until(t)

    def mods_down(self, mods: list[str]) -> None:
        flags = 0
        for m in mods:
            flags |= FLAG[m]
            _post(key_event(MOD_KEYCODE[m], True, flags))
            self.down_mods.append(m)
            self._sleep_until(time.monotonic() + 0.025)

    def mods_up(self) -> None:
        while self.down_mods:
            m = self.down_mods.pop()
            flags = flags_for(self.down_mods)
            try:
                _post(key_event(MOD_KEYCODE[m], False, flags))
            except NotArmed:
                pass

    def key(self, keycode: int, mods: list[str], arrow: bool, hold_ms: int = 60, on_press=None) -> None:
        self.mods_down(mods)
        try:
            f = flags_for(mods, arrow)
            if on_press:
                on_press()
            _post(key_event(keycode, True, f))
            self._sleep_until(time.monotonic() + hold_ms / 1000)
            _post(key_event(keycode, False, f))
        finally:
            self.mods_up()

    def type_text(self, text: str, cps: float, jitter: float, on_first=None) -> None:
        delays = typing_delays(text, cps, jitter, self.rng)
        t = time.monotonic()
        for i, (ch, d) in enumerate(zip(text, delays)):
            t += d
            self._sleep_until(t)
            if i == 0 and on_first:
                on_first()
            hold = self.rng.uniform(0.035, 0.075)
            if ch == "\n":
                _post(key_event(RETURN_KEYCODE, True))
                time.sleep(hold)
                _post(key_event(RETURN_KEYCODE, False))
            else:
                _post(key_event(0, True, 0, ch))
                time.sleep(hold)
                _post(key_event(0, False, 0, ch))
            t += hold

    def release_all(self) -> None:
        """After a stop: let go of any button or modifier still held, so nothing stays pressed."""
        if self.down_button:
            try:
                self.release(self.down_button)
            except NotArmed:
                self.down_button = None
        self.mods_up()
