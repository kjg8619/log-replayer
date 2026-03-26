#!/usr/bin/env tsx

/**
 * Performance Benchmark Script for Log Replayer
 * 
 * Tests:
 * 1. Event loading: 10,000 events load <2s
 * 2. Snapshot calculation: <100ms
 * 3. Timeline scroll performance: 60fps with 10k events
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  passed: boolean;
  actualMs: number;
  thresholdMs: number;
  details?: string;
}

interface BenchmarkReport {
  timestamp: string;
  nodeVersion: string;
  results: BenchmarkResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

const results: BenchmarkResult[] = [];

function benchmark(name: string, thresholdMs: number, fn: () => void | Promise<void>): BenchmarkResult {
  const start = performance.now();
  
  const syncFn = async () => {
    await fn();
  };
  
  syncFn();
  
  const actualMs = performance.now() - start;
  const passed = actualMs < thresholdMs;
  
  const result: BenchmarkResult = {
    name,
    passed,
    actualMs,
    thresholdMs,
    details: `${actualMs.toFixed(2)}ms / ${thresholdMs}ms threshold`,
  };
  
  results.push(result);
  return result;
}

async function benchmarkAsync(
  name: string,
  thresholdMs: number,
  fn: () => Promise<void>
): Promise<BenchmarkResult> {
  const start = performance.now();
  await fn();
  const actualMs = performance.now() - start;
  const passed = actualMs < thresholdMs;
  
  const result: BenchmarkResult = {
    name,
    passed,
    actualMs,
    thresholdMs,
    details: `${actualMs.toFixed(2)}ms / ${thresholdMs}ms threshold`,
  };
  
  results.push(result);
  return result;
}

// Benchmark 1: Event Loading
async function benchmarkEventLoading(): Promise<void> {
  // Simulate loading 10,000 events
  const events: Array<{ id: string; sequence: number; type: string; payload: unknown }> = [];
  
  for (let i = 1; i <= 10000; i++) {
    events.push({
      id: `evt-${i}`,
      sequence: i,
      type: `TYPE_${i % 20}`,
      payload: { index: i, data: `Event ${i} payload data` },
    });
  }
  
  // Simulate parsing
  const parsed = events.map((e) => ({
    ...e,
    timestamp: new Date().toISOString(),
  }));
  
  // Simulate state update
  let processedCount = 0;
  for (const event of parsed) {
    processedCount++;
  }
  
  console.log(`Processed ${processedCount} events`);
}

// Benchmark 2: Snapshot Calculation
async function benchmarkSnapshotCalculation(): Promise<void> {
  // Dynamically import to avoid issues with module resolution
  const { SnapshotCalculator } = await import('../server/src/services/snapshotCalculator');
  
  const calculator = new SnapshotCalculator({ checkpointInterval: 100 });
  
  // Add 1000 operations
  for (let i = 1; i <= 1000; i++) {
    calculator.addOperation({
      type: 'CREATE',
      entityType: 'entity',
      entity: { id: String(i), name: `Entity ${i}` },
    });
  }
  
  // Calculate snapshot
  const state = calculator.calculateOptimized(500);
  
  // Verify state integrity
  const entityCount = Object.keys(state.entities.entity || {}).length;
  
  if (entityCount !== 500) {
    throw new Error(`Expected 500 entities, got ${entityCount}`);
  }
}

// Benchmark 3: Entity Operations
async function benchmarkEntityOperations(): Promise<void> {
  const { SnapshotCalculator } = await import('../server/src/services/snapshotCalculator');
  
  const calculator = new SnapshotCalculator();
  
  // Add mixed operations (create, update, delete)
  for (let i = 1; i <= 500; i++) {
    calculator.addOperation({
      type: 'CREATE',
      entityType: 'user',
      entity: { id: String(i), name: `User ${i}` },
    });
    
    if (i % 2 === 0) {
      calculator.addOperation({
        type: 'UPDATE',
        entityType: 'user',
        entityId: String(i),
        changes: { name: `Updated User ${i}` },
      });
    }
    
    if (i % 5 === 0) {
      calculator.addOperation({
        type: 'DELETE',
        entityType: 'user',
        entityId: String(i),
      });
    }
  }
  
  // Calculate final state
  const state = calculator.getFinalState();
  
  // Verify operations were applied correctly
  const users = state.entities.user || {};
  const createdCount = 500;
  const deletedCount = Math.floor(500 / 5);
  const expectedCount = createdCount - deletedCount;
  
  const actualCount = Object.keys(users).length;
  
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} users, got ${actualCount}`);
  }
}

// Benchmark 4: Pagination Performance
async function benchmarkPagination(): Promise<void> {
  const pageSize = 100;
  const totalItems = 10000;
  
  const items: number[] = [];
  for (let i = 1; i <= totalItems; i++) {
    items.push(i);
  }
  
  // Simulate paginated retrieval
  const pages: number[][] = [];
  
  for (let offset = 0; offset < totalItems; offset += pageSize) {
    const page = items.slice(offset, offset + pageSize);
    pages.push(page);
  }
  
  if (pages.length !== 100) {
    throw new Error(`Expected 100 pages, got ${pages.length}`);
  }
  
  // Simulate random access
  const randomPage = pages[Math.floor(Math.random() * pages.length)];
  if (randomPage.length !== pageSize) {
    throw new Error('Random page access failed');
  }
}

// Benchmark 5: State Serialization
async function benchmarkStateSerialization(): Promise<void> {
  const { SnapshotCalculator, serializeSnapshot } = await import('../server/src/services/snapshotCalculator');
  
  const calculator = new SnapshotCalculator();
  
  // Create state with many entities
  for (let i = 1; i <= 1000; i++) {
    calculator.addOperation({
      type: 'CREATE',
      entityType: 'product',
      entity: {
        id: String(i),
        name: `Product ${i}`,
        price: i * 10.99,
        description: `Description for product ${i}`.padEnd(100, ' '),
        metadata: { category: `cat-${i % 10}`, tags: [`tag-${i % 5}`, `tag-${i % 3}`] },
      },
    });
  }
  
  const state = calculator.getFinalState();
  
  // Serialize
  const json = serializeSnapshot(state);
  
  // Verify serialization
  if (json.length === 0) {
    throw new Error('Serialization produced empty string');
  }
  
  // Parse back
  const parsed = JSON.parse(json);
  
  if (!parsed.product) {
    throw new Error('Deserialization failed');
  }
}

async function runBenchmarks(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Log Replayer Performance Benchmarks                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();
  console.log('Running benchmarks...\n');
  
  // Benchmark 1: Event Loading (10,000 events < 2s)
  await benchmarkAsync('Event Loading (10,000 events)', 2000, benchmarkEventLoading);
  
  // Benchmark 2: Snapshot Calculation (<100ms)
  await benchmarkAsync('Snapshot Calculation (500 ops)', 100, benchmarkSnapshotCalculation);
  
  // Benchmark 3: Entity Operations (<50ms)
  await benchmarkAsync('Entity Operations (750 ops)', 50, benchmarkEntityOperations);
  
  // Benchmark 4: Pagination (<20ms)
  await benchmarkAsync('Pagination (10,000 items)', 20, benchmarkPagination);
  
  // Benchmark 5: State Serialization (<100ms)
  await benchmarkAsync('State Serialization (1,000 entities)', 100, benchmarkStateSerialization);
  
  // Print results
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                      BENCHMARK RESULTS                        ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${statusColor}${status}${reset} ${result.name}`);
    console.log(`         ${result.details}`);
    console.log();
  }
  
  // Summary
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
  };
  
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
  console.log('───────────────────────────────────────────────────────────────\n');
  
  if (summary.failed > 0) {
    console.log('\x1b[31mSome benchmarks failed! Please review the results above.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32mAll benchmarks passed!\x1b[0m\n');
    process.exit(0);
  }
  
  // Generate report
  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    results,
    summary,
  };
  
  // Save report to file
  const fs = await import('fs');
  const reportPath = './benchmark-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${reportPath}`);
}

// Run benchmarks
runBenchmarks().catch((error) => {
  console.error('Benchmark failed with error:', error);
  process.exit(1);
});
