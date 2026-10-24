"""Full-rate, stereo-shared gain trajectory for the server true-peak limiter."""
import numpy as np
from numba import jit


@jit(nopython=True, cache=True)
def limiter_gain(required, sr):
    """Bounded linear pre-attack, program-dependent release, never above required.

    Unlike control-rate interpolation, every sample including the file tail is
    covered. The backward ramp is bounded to at most 5 ms before an isolated
    event; forward recovery is 35–160 ms, slower for sustained gain reduction.
    """
    n = len(required)
    gain = np.empty(n, np.float32)
    step = 1.0 / max(1, int(sr * .005))
    state = 1.0
    for i in range(n - 1, -1, -1):
        state = min(float(required[i]), state + step)
        gain[i] = state
    history = np.exp(-1.0 / max(1.0, sr * .075))
    # Release coefficients are computed once, not exp() at every audio sample.
    fast = np.exp(-1.0 / max(1.0, sr * .035))
    slow = np.exp(-1.0 / max(1.0, sr * .160))
    state = 1.0; density = 0.0
    for i in range(n):
        target = float(gain[i])
        density = history * density + (1 - history) * (1 - float(required[i]))
        blend = min(1.0, density / .2)
        coeff = fast + (slow - fast) * blend
        state = min(target, coeff * state + (1 - coeff))
        gain[i] = state
    return gain
