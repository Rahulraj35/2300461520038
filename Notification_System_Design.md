# Stage 1

## Campus Notification System Design: Priority Inbox

This document explains the technical approach, algorithmic design, and architectural decisions behind implementing the **Priority Inbox** for the campus notifications stream.

---

## 1. The Core Problem
Campus notifications arrive in large volumes. Users lose track of critical announcements (like placement registrations or exam results) because they are buried under lower-priority events (such as club announcements or general seminars).

To address this, we introduce a **Priority Inbox** that dynamically filters and displays the **Top N** (e.g., top 10, 15, or 20) most important unread notifications.

### 1.1 Priority Definition
Each notification has a priority score determined by two factors:
1. **Category Weight (Primary Key)**: 
   - `Placement` announcements are most critical (Weight = **3**).
   - `Result` announcements are moderately critical (Weight = **2**).
   - `Event` announcements are least critical (Weight = **1**).
2. **Recency (Secondary Key)**:
   - Within the same category, more recent notifications (newer timestamps) take precedence.

---

## 2. Algorithm & Data Structure Selection
A naive approach is to store all notifications in a flat array, append new ones as they arrive, and sort the entire array. However, this is inefficient for continuous real-time streams:

| Algorithm / Approach | Time Complexity (Per Insertion) | Space Complexity | Details |
| :--- | :--- | :--- | :--- |
| **Full Array Sort** | $O(K \log K)$ | $O(K)$ | Requires sorting all $K$ historical items upon every arrival. Very slow as $K \to \infty$. |
| **Fixed Min-Heap** | $O(\log N)$ | $O(N)$ | Maintains a binary min-heap of size $N$. Ideal for high-throughput streaming. |

### 2.1 The Min-Heap Strategy
Since we only ever need to display the top $N$ items, we maintain a **Min-Heap of size $N$**.
The root of the Min-Heap always points to the **lowest priority element** currently within our "Top N" set.

#### Insertion Workflow:
1. **If Heap Size < $N$**: 
   - Insert the new notification directly.
   - Bubble it up to maintain the heap properties ($O(\log N)$).
2. **If Heap Size == $N$**:
   - Compare the incoming notification with the **root** (the current weakest item in the Top N).
   - If the incoming item has **higher priority** than the root:
     - Replace the root with the incoming item.
     - Bubble down the new root to restore heap hierarchy ($O(\log N)$).
   - If it has **lower or equal priority** than the root, ignore it ($O(1)$).

This ensures that we perform at most $O(\log N)$ comparisons per incoming notification, keeping memory footprint bounded to exactly $O(N)$.

---

## 3. Detailed Component Architecture

### 3.1 Data Flow Pipeline
```
[Campus Notifications API] ---> [Auth & Fetch Client]
                                         |
                                         v (Filtered stream)
[Live User Interaction]    ---> [Min-Heap Controller (Size N)]
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             [Priority Inbox (Sorted)]           [Heap Memory Layout]
```

### 3.2 Comparison Operator Logic
The ordering comparator checks the Type Weight first. If equal, it falls back to the Timestamp epoch value:

```javascript
function isLowerPriority(a, b) {
  const weightA = getWeight(a.Type);
  const weightB = getWeight(b.Type);
  
  if (weightA !== weightB) {
    return weightA < weightB;
  }
  
  return new Date(a.Timestamp).getTime() < new Date(b.Timestamp).getTime();
}
```

---

## 4. Frontend Visual Dashboard
We built a premium React-based dashboard interface that provides:
1. **Interactive Configurator**: Let's users switch between live APIs and stream simulators to visually test the heapify-up and heapify-down algorithms.
2. **Live Heap Debug Track**: Visualizes the array indices ($0$ to $N-1$) of the min-heap in real-time, highlighting root nodes and changes.
3. **Responsive Grid**: Displays the sorted Priority Inbox side-by-side with the raw chronological activity stream.
