# Problem Statement

The company is building an interactive Office Hot-Desking Map. Employees view a grid representation of an office floor, see desk statuses in real time, and click to reserve spots. The core backend works, but it has three problems.

## 1. Adjacent-seat race conditions

Each booking is checked against the desks next to it before it's saved. When two employees reserve **neighbouring** desks for the same day at the same moment, both requests can pass that check before either is saved. Both succeed, and the spacing rule is broken.

This is a **write skew** race. The two requests insert rows for *different* desks, so a unique constraint or a lock on only the desk being booked can't stop it. See [[Booking Concurrency]] for a step-by-step walk-through and the fix.

**Expected:** among conflicting concurrent requests, exactly one succeeds. The others get a clear conflict error (HTTP 409).

## 2. Invalid spatial isolation selections

The backend accepts reservations that break the spacing rule, for example booking a desk directly next to one already reserved for the same day.

**Expected:** the server rejects every booking that would place two booked desks next to each other on the same day, using the floor's neighbour setting (`ORTHOGONAL` or `ALL`). The frontend may warn early, but the server's check is what counts. See [[Domain Rules]].

## 3. No fluid matrix updates on the frontend

The map doesn't update smoothly when desk statuses change. It needs a manual refresh, or it re-renders the whole grid instead of just the changed desk.

**Expected:**
- Status changes reach every open map within moments.
- Only the affected cells redraw.
- The map recovers correctly after a dropped connection.
- The map never shows a booking the server rolled back or rejected.

See [[Real-Time Updates]] and [[Frontend Design]].
