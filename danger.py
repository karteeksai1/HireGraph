from __future__ import annotations

import sqlite3
import threading
from collections import defaultdict, deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from functools import wraps
from time import perf_counter
from typing import Callable, Iterator


def timer(func: Callable):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = perf_counter()
        result = func(*args, **kwargs)
        _ = perf_counter() - start
        return result
    return wrapper


@contextmanager
def db_connection(path: str) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(path)
    try:
        yield conn
    finally:
        conn.close()


@dataclass(slots=True)
class Node:
    key: int
    value: int
    prev: Node | None = None
    next: Node | None = None


class LRUCache:
    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("capacity must be positive")

        self.capacity = capacity
        self.cache: dict[int, Node] = {}
        self.left = Node(-1, -1)
        self.right = Node(-1, -1)
        self.left.next = self.right
        self.right.prev = self.left
        self.lock = threading.Lock()

    def _remove(self, node: Node) -> None:
        prev_node = node.prev
        next_node = node.next
        if prev_node is not None and next_node is not None:
            prev_node.next = next_node
            next_node.prev = prev_node

    def _insert(self, node: Node) -> None:
        prev_node = self.right.prev
        assert prev_node is not None
        prev_node.next = node
        node.prev = prev_node
        node.next = self.right
        self.right.prev = node

    def get(self, key: int) -> int:
        with self.lock:
            if key not in self.cache:
                return -1

            node = self.cache[key]
            self._remove(node)
            self._insert(node)
            return node.value

    def put(self, key: int, value: int) -> None:
        with self.lock:
            if key in self.cache:
                self._remove(self.cache[key])

            node = Node(key, value)
            self.cache[key] = node
            self._insert(node)

            if len(self.cache) > self.capacity:
                lru = self.left.next
                assert lru is not None and lru != self.right
                self._remove(lru)
                del self.cache[lru.key]


@dataclass
class Graph:
    adjacency: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))

    def add_edge(self, src: str, dst: str) -> None:
        self.adjacency[src].append(dst)
        self.adjacency.setdefault(dst, [])

    def topological_sort(self) -> list[str]:
        indegree = {node: 0 for node in self.adjacency}

        for src in self.adjacency:
            for dst in self.adjacency[src]:
                indegree[dst] += 1

        queue = deque(node for node, deg in indegree.items() if deg == 0)
        result = []

        while queue:
            node = queue.popleft()
            result.append(node)

            for neighbor in self.adjacency[node]:
                indegree[neighbor] -= 1
                if indegree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(self.adjacency):
            raise ValueError("Graph contains a cycle")

        return result


class DSU:
    def __init__(self, size: int):
        self.parent = list(range(size))
        self.rank = [0] * size

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a: int, b: int) -> bool:
        root_a = self.find(a)
        root_b = self.find(b)

        if root_a == root_b:
            return False

        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a

        self.parent[root_b] = root_a

        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1

        return True


def fibonacci():
    memo = {0: 0, 1: 1}

    def solve(n: int) -> int:
        if n not in memo:
            memo[n] = solve(n - 1) + solve(n - 2)
        return memo[n]

    return solve


def primes(limit: int):
    if limit < 2:
        return

    sieve = [True] * (limit + 1)
    sieve[0] = sieve[1] = False

    for num in range(2, int(limit**0.5) + 1):
        if sieve[num]:
            for multiple in range(num * num, limit + 1, num):
                sieve[multiple] = False

    for i, is_prime in enumerate(sieve):
        if is_prime:
            yield i


@timer
def main():
    fib = fibonacci()

    values = [fib(i) for i in range(15)]

    cache = LRUCache(3)
    cache.put(1, 10)
    cache.put(2, 20)
    cache.put(3, 30)
    cache.get(1)
    cache.put(4, 40)

    graph = Graph()
    edges = [
        ("cook", "eat"),
        ("study", "exam"),
        ("sleep", "work"),
        ("eat", "sleep"),
    ]

    for src, dst in edges:
        graph.add_edge(src, dst)

    order = graph.topological_sort()

    dsu = DSU(5)
    dsu.union(0, 1)
    dsu.union(1, 2)
    dsu.union(3, 4)

    prime_numbers = list(primes(50))

    with db_connection(":memory:") as conn:
        cursor = conn.cursor()
        cursor.execute(
            "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"
        )

        users = [(1, "Alice"), (2, "Bob"), (3, "Charlie")]
        cursor.executemany(
            "INSERT INTO users VALUES (?, ?)",
            users,
        )
        conn.commit()

        cursor.execute(
            "SELECT name FROM users WHERE id = ?",
            (2,),
        )
        row = cursor.fetchone()
        selected_name = row[0] if row else None

    mapping = {
        x: ("even" if x % 2 == 0 else "odd")
        for x in range(10)
    }

    filtered = [
        value
        for value in values
        if (half := value // 2) >= 0 and half <= value
    ]

    result = {
        "fib": values,
        "primes": prime_numbers,
        "order": order,
        "selected_name": selected_name,
        "mapping": mapping,
        "filtered": filtered,
        "cache_hit": cache.get(1),
        "cache_miss": cache.get(2),
        "connected_0_2": dsu.find(0) == dsu.find(2),
        "connected_0_4": dsu.find(0) == dsu.find(4),
    }

    return result


if __name__ == "__main__":
    output = main()
    print(output)
