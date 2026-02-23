import assert from "node:assert/strict";
import {
  DND_EXPERIMENT_DEFAULT_POLICY,
  evaluateInboundOsDrop,
  evaluateOutboundAppDragCandidate,
  formatInboundDropProbeStatus,
  isNativeOutboundDragSuppressActive,
  markNativeOutboundDragSuppress,
  normalizeDroppedOsPaths,
  parseDragDropExperimentPolicy,
  endNativeOutboundDrag,
  isFormalOutboundDirectDragMouseChord,
  tryBeginNativeOutboundDrag,
} from "../../src/lib/utils/drag_drop_experiment.ts";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test("normalizeDroppedOsPaths deduplicates and normalizes slashes", () => {
  const out = normalizeDroppedOsPaths([
    "C:/Work/a.txt",
    "c:\\work\\a.txt",
    "  C:/Work/b.txt  ",
    "",
    null,
  ]);
  assert.deepEqual(out, ["C:\\Work\\a.txt", "C:\\Work\\b.txt"]);
});

test("inbound drop is disabled by default", () => {
  const result = evaluateInboundOsDrop({
    destinationPath: "C:\\Work",
    droppedPaths: ["C:\\tmp\\a.txt"],
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "disabled");
  assert.deepEqual(result.acceptedPaths, []);
});

test("inbound local-only phase accepts local paths", () => {
  const result = evaluateInboundOsDrop({
    policy: { enabled: true, phase: "phase1_inbound_local_only" },
    destinationPath: "C:\\Work",
    destinationProvider: "local",
    destinationCapabilities: {
      can_read: true,
      can_create: true,
      can_rename: true,
      can_copy: true,
      can_move: true,
      can_delete: true,
      can_archive_create: true,
      can_archive_extract: true,
    },
    droppedPaths: ["C:\\tmp\\a.txt", "D:\\data\\b"],
  });
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "ok");
  assert.deepEqual(result.rejectedPaths, []);
});

test("inbound local-only phase rejects gdrive destination", () => {
  const result = evaluateInboundOsDrop({
    policy: { enabled: true, phase: "phase1_inbound_local_only" },
    destinationPath: "gdrive://root/my-drive",
    destinationProvider: "gdrive",
    droppedPaths: ["C:\\tmp\\a.txt"],
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "destination_not_local");
});

test("inbound local-only phase rejects mixed local and non-local sources", () => {
  const result = evaluateInboundOsDrop({
    policy: { enabled: true, phase: "phase1_inbound_local_only" },
    destinationPath: "C:\\Work",
    droppedPaths: ["C:\\tmp\\a.txt", "gdrive://root/my-drive/x"],
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "mixed_or_invalid_sources");
  assert.deepEqual(result.acceptedPaths, ["C:\\tmp\\a.txt"]);
  assert.deepEqual(result.rejectedPaths, ["gdrive:\\\\root\\my-drive\\x"]);
});

test("outbound candidate is blocked before phase2", () => {
  const result = evaluateOutboundAppDragCandidate({
    policy: { enabled: true, phase: "phase1_inbound_local_only" },
    selectedEntries: [{ path: "C:\\Work\\a.txt", provider: "local" }],
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "phase_not_supported");
});

test("outbound candidate phase2 allows local-only selection and rejects gdrive", () => {
  const allowed = evaluateOutboundAppDragCandidate({
    policy: { enabled: true, phase: "phase2_outbound_local_only" },
    selectedEntries: [{ path: "C:\\Work\\a.txt", provider: "local" }],
  });
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.reason, "ok");

  const rejected = evaluateOutboundAppDragCandidate({
    policy: { enabled: true, phase: "phase2_outbound_local_only" },
    selectedEntries: [{ path: "gdrive://root/my-drive/a.txt", provider: "gdrive" }],
  });
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.reason, "source_not_local");
});

test("default policy is safe off", () => {
  assert.equal(DND_EXPERIMENT_DEFAULT_POLICY.enabled, false);
  assert.equal(DND_EXPERIMENT_DEFAULT_POLICY.phase, "phase0_foundation");
});

test("policy parser supports off/phase1/phase2 and falls back safely", () => {
  assert.deepEqual(parseDragDropExperimentPolicy("off"), DND_EXPERIMENT_DEFAULT_POLICY);
  assert.deepEqual(parseDragDropExperimentPolicy("phase1"), {
    enabled: true,
    phase: "phase1_inbound_local_only",
  });
  assert.deepEqual(parseDragDropExperimentPolicy("phase2"), {
    enabled: true,
    phase: "phase2_outbound_local_only",
  });
  assert.deepEqual(parseDragDropExperimentPolicy("unknown"), DND_EXPERIMENT_DEFAULT_POLICY);
});

test("status formatter reports probe result", () => {
  const ok = formatInboundDropProbeStatus({
    currentPath: "C:\\Work",
    decision: {
      allowed: true,
      reason: "ok",
      acceptedPaths: ["C:\\tmp\\a.txt"],
      rejectedPaths: [],
    },
  });
  assert.match(ok, /D&D import probe \(experimental\): 1 item/);

  const blocked = formatInboundDropProbeStatus({
    currentPath: "gdrive://root/my-drive",
    decision: {
      allowed: false,
      reason: "destination_not_local",
      acceptedPaths: [],
      rejectedPaths: ["C:\\tmp\\a.txt"],
    },
  });
  assert.match(blocked, /blocked \(destination_not_local\)/);
});

test("native outbound suppress helpers set and check TTL safely", () => {
  const fakeWindow = {};
  assert.equal(isNativeOutboundDragSuppressActive(fakeWindow, 1000), false);
  const realNow = Date.now;
  try {
    Date.now = () => 1000;
    const until = markNativeOutboundDragSuppress(fakeWindow, 500);
    assert.equal(until, 1500);
    assert.equal(fakeWindow.__rf_native_outbound_drag_suppress_until, 1500);
    assert.equal(isNativeOutboundDragSuppressActive(fakeWindow, 1499), true);
    assert.equal(isNativeOutboundDragSuppressActive(fakeWindow, 1500), false);
  } finally {
    Date.now = realNow;
  }
});

test("native outbound in-flight guard prevents reentry and can be cleared", () => {
  const fakeWindow = {};
  assert.equal(tryBeginNativeOutboundDrag(fakeWindow), true);
  assert.equal(tryBeginNativeOutboundDrag(fakeWindow), false);
  endNativeOutboundDrag(fakeWindow);
  assert.equal(tryBeginNativeOutboundDrag(fakeWindow), true);
});

test("formal outbound direct drag chord is Ctrl+Alt + left click only", () => {
  assert.equal(
    isFormalOutboundDirectDragMouseChord({
      button: 0,
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      metaKey: false,
    }),
    true
  );

  assert.equal(
    isFormalOutboundDirectDragMouseChord({
      button: 0,
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
      metaKey: false,
    }),
    false
  );
  assert.equal(
    isFormalOutboundDirectDragMouseChord({
      button: 0,
      ctrlKey: false,
      altKey: true,
      shiftKey: true,
      metaKey: false,
    }),
    false
  );
  assert.equal(
    isFormalOutboundDirectDragMouseChord({
      button: 0,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    }),
    false
  );
  assert.equal(
    isFormalOutboundDirectDragMouseChord({
      button: 2,
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      metaKey: false,
    }),
    false
  );
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`[test:dnd] PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`[test:dnd] FAIL ${name}`);
    console.error(error instanceof Error ? error.stack : error);
  }
}

if (failed > 0) {
  console.error(`[test:dnd] ${failed} test(s) failed.`);
  process.exit(1);
}
console.log(`[test:dnd] all ${tests.length} test(s) passed.`);
