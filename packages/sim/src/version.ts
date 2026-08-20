/**
 * SIM_VERSION — bump on ANY rule change (D31).
 * Every recorded run stores the version it was created under; verification
 * rejects version mismatches so old runs invalidate cleanly instead of
 * silently re-scoring. The golden-hash regression tests force a conscious
 * bump here whenever the sim behavior changes.
 */
export const SIM_VERSION = 2;
