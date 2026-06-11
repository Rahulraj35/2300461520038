export function getWeight(type) {
  const t = type ? type.toLowerCase() : '';
  if (t === 'placement') return 3;
  if (t === 'result') return 2;
  if (t === 'event') return 1;
  return 0;
}

export function isLowerPriority(a, b) {
  const weightA = getWeight(a.Type);
  const weightB = getWeight(b.Type);
  
  if (weightA !== weightB) {
    return weightA < weightB;
  }
  
  const timeA = new Date(a.Timestamp).getTime();
  const timeB = new Date(b.Timestamp).getTime();
  return timeA < timeB;
}

export class NotificationMinHeap {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  insert(notification) {
    // If the notification already exists in the heap (by ID), skip it
    if (this.heap.some(item => item.ID === notification.ID)) {
      return false;
    }

    if (this.heap.length < this.maxSize) {
      this.heap.push(notification);
      this._heapifyUp(this.heap.length - 1);
      return true;
    } else {
      const root = this.peek();
      if (isLowerPriority(root, notification)) {
        this.heap[0] = notification;
        this._heapifyDown(0);
        return true;
      }
    }
    return false;
  }

  // Bulk update or reset size
  updateMaxSize(newSize) {
    this.maxSize = newSize;
    // If size decreases, we need to rebuild the heap with the top newSize elements
    if (this.heap.length > this.maxSize) {
      const allItems = this.getSortedList();
      this.heap = [];
      for (let i = 0; i < Math.min(newSize, allItems.length); i++) {
        this.insert(allItems[i]);
      }
    }
  }

  getSortedList() {
    return [...this.heap].sort((a, b) => {
      // We want descending order: highest priority first
      // So if a is lower priority than b, it should come after b (return 1)
      if (isLowerPriority(a, b)) return 1;
      if (isLowerPriority(b, a)) return -1;
      return 0;
    });
  }

  _heapifyUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      // In min-heap, parent must be lower priority than current.
      // If parent is HIGHER priority than current, swap them so lower priority bubbled up.
      if (isLowerPriority(this.heap[current], this.heap[parent])) {
        this._swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  _heapifyDown(index) {
    let current = index;
    const length = this.heap.length;

    while (true) {
      let smallest = current;
      const left = 2 * current + 1;
      const right = 2 * current + 2;

      // Find the smallest (lowest priority) among current, left, and right child
      if (left < length && isLowerPriority(this.heap[left], this.heap[smallest])) {
        smallest = left;
      }
      if (right < length && isLowerPriority(this.heap[right], this.heap[smallest])) {
        smallest = right;
      }

      if (smallest !== current) {
        this._swap(current, smallest);
        current = smallest;
      } else {
        break;
      }
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
