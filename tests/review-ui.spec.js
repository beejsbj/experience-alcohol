import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, h, nextTick, ref, ssrContextKey } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "../src/stores/session";
import PourMat from "../src/components/PourMat.vue";
import ScrubNumber from "../src/components/ScrubNumber.vue";
import WeightRuler from "../src/components/WeightRuler.vue";
import { readFileSync } from "node:fs";
import Doodle from "../src/components/Doodle.vue";
import CloseTab from "../src/components/CloseTab.vue";
import PersonReceipt from "../src/components/PersonReceipt.vue";

const clock = vi.hoisted(() => ({ now: null }));
vi.mock("../src/composables/useLiveNow", () => ({ useLiveNow: () => clock.now, liveNow: clock.now }));
vi.mock("../src/components/ThermalChart.vue", () => ({ default: { render: () => null } }));

// Exercise real component setup and event handlers without adding a DOM dependency.
const makeNode = (type) => ({ type, children: [], props: {}, style: {}, setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(), contains: () => false, clientWidth: 400, scrollWidth: 400 });
const renderer = createRenderer({
  createElement: makeNode,
  createText: (text) => ({ ...makeNode("text"), text }),
  createComment: (text) => ({ ...makeNode("comment"), text }),
  setText: (node, text) => { node.text = text; },
  setElementText: (node, text) => { node.text = text; },
  patchProp: (node, key, old, value) => { node.props[key] = value; },
  insert: (node, parent, anchor) => { node.parent = parent; const i = parent.children.indexOf(anchor); parent.children.splice(i < 0 ? parent.children.length : i, 0, node); },
  remove: (node) => { node.parent?.children.splice(node.parent.children.indexOf(node), 1); },
  parentNode: (node) => node.parent,
  nextSibling: () => null,
});
let apps;
const mount = (component, props) => {
  // Node transforms SFCs for SSR; mount their real setup without DOM templates.
  const app = renderer.createApp({ render: () => h({ ...component, render: () => h("div") }, props) });
  app.provide(ssrContextKey, {});
  app.mount(makeNode("root"));
  apps.push(app);
  return app._instance.subTree.component;
};
const pointer = (id, x) => ({ pointerId: id, clientX: x, stopPropagation() {} });

describe("review UI regressions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    clock.now = ref(Date.now());
    apps = [];
    setActivePinia(createPinia());
    vi.stubGlobal("localStorage", { getItem: () => null, setItem() {} });
    vi.stubGlobal("window", { addEventListener() {}, removeEventListener() {} });
    vi.stubGlobal("document", { addEventListener() {}, removeEventListener() {} });
  });
  afterEach(() => { apps.forEach((app) => app.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("keeps water and custom zero-proof glasses full and ready past cutoff", () => {
    const store = useSessionStore();
    for (let i = 0; i < 10; i++) store.logDrink(1, { type: "shot", abv: 0.4, volume: 1.5 });
    store.addCustomDrink({ type: "mocktail", abv: 0, volume: 8 });
    const state = mount(PourMat, { person: store.person(1) }).setupState;
    expect(state.bac).toBeGreaterThan(0.18);
    for (const name of ["water", "mocktail"]) {
      const glass = state.glasses.find((g) => g.label === name);
      expect(glass.ready).toBe(true);
      expect(glass.fill).toBe(1);
      expect(glass.wait).toBe(0);
    }
    expect(state.glasses.find((g) => g.label === "beer").ready).toBe(false);
  });

  it("does not restart an alcoholic glass's fill after logging water", async () => {
    const store = useSessionStore();
    for (let i = 0; i < 4; i++) store.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    clock.now.value += 20 * 60000;
    vi.setSystemTime(clock.now.value);
    const state = mount(PourMat, { person: store.person(1) }).setupState;
    const before = state.glasses.find((g) => g.label === "beer");
    expect(before.fill).toBeGreaterThan(0);
    store.logDrink(1, { type: "water", abv: 0, volume: 12 });
    await nextTick();
    const after = state.glasses.find((g) => g.label === "beer");
    expect(after.fill).toBe(before.fill);
    expect(after.wait).toBe(before.wait);
  });

  it.each([35, 200])("ruler retains accepted weight %s on its first arrow key", async (weight) => {
    const store = useSessionStore();
    store.updatePerson(1, { weight });
    const identity = readFileSync(new URL("../src/components/IdentityLine.vue", import.meta.url), "utf8");
    const min = Number(identity.match(/<WeightRuler[^>]*:min="(\d+)"/)[1]);
    const max = Number(identity.match(/<WeightRuler[^>]*:max="(\d+)"/)[1]);
    const component = mount(WeightRuler, { modelValue: weight, min, max, "onUpdate:modelValue": (weight) => store.updatePerson(1, { weight }) });
    expect(component.setupState.x(weight)).toBeGreaterThanOrEqual(10);
    expect(component.setupState.x(weight)).toBeLessThanOrEqual(290);
    component.setupState.keyDown({ key: "ArrowRight", preventDefault() {} });
    expect(store.person(1).weight).toBe(weight + 1);
  });

  it("captures a scrub on pointerdown while keeping taps and cancellations distinct", () => {
    const update = vi.fn(), tap = vi.fn();
    const component = mount(ScrubNumber, { modelValue: 78, min: 30, max: 250, label: "Weight", "onUpdate:modelValue": update, onTap: tap });
    const el = component.subTree.el;
    component.setupState.el = el;
    const state = component.setupState;
    state.down(pointer(7, 10));
    expect(el.setPointerCapture).toHaveBeenCalledWith(7);
    state.move(pointer(7, 90));
    state.up(pointer(7, 90));
    expect(update).toHaveBeenCalledWith(88);
    expect(tap).not.toHaveBeenCalled();
    state.down(pointer(8, 10));
    state.up(pointer(8, 11));
    expect(tap).toHaveBeenCalledTimes(1);
    state.down(pointer(9, 10));
    state.cancel(pointer(9, 10));
    expect(tap).toHaveBeenCalledTimes(1);
  });

  it("keeps settled receipt marks through a friend joining and remount", async () => {
    const store = useSessionStore();
    store.introduce(1, { name: "Sam", weight: 78, gender: "male" });
    store.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    const ledger = JSON.parse(JSON.stringify(state.ledgerDoodles));
    const paper = JSON.parse(JSON.stringify(state.marks));
    const face = JSON.parse(JSON.stringify(state.stateDoodle));
    expect(state.note).toBeNull();
    store.addPerson({ name: "Ren", needsIntro: false, color: "#abcdef" });
    await nextTick();
    expect(state.ledgerDoodles).toEqual(ledger);
    expect(state.marks).toEqual(paper);
    expect(state.stateDoodle).toEqual(face);
    expect(state.note.from).toBe("Ren");
    const remounted = mount(PersonReceipt, { person: store.person(1) }).setupState;
    expect(remounted.lines.every((line) => !line.fresh)).toBe(true);
    const doodle = mount(Doodle, { name: "star", seed: "settled", animate: false }).setupState;
    expect(doodle.strokeStyle(0).animation).toBe("none");
    expect(doodle.charStyle(0).animation).toBe("none");
  });

  it("passes exact BAC and actual drink identity into the bar and state face", () => {
    const store = useSessionStore();
    store.logDrink(1, { id: "special", type: "water", abv: 0.1, volume: 5 });
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    expect(state.barCtx.bac).toBe(state.bac);
    expect(state.barCtx.lastIsCustom).toBe(true);
    expect(state.barCtx.lastIsSoft).toBe(false);
    expect(state.lines[0].isCustom).toBe(true);
    expect(state.stateDoodle.key).not.toBe("water");
  });

  it("animates a newly received pour even when the peer clock is behind", async () => {
    const store = useSessionStore();
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    const remote = JSON.parse(JSON.stringify(store.session));
    remote.events.push({ id: "peer-pour", personId: 1, type: "beer", abv: 0.05, volume: 12, timestamp: new Date(Date.now() - 60000).toISOString() });
    expect(store.mergeRemote(remote)).toBe(true);
    await nextTick();
    expect(state.lines.find((line) => line.id === "peer-pour").fresh).toBe(true);
    expect(mount(PersonReceipt, { person: store.person(1) }).setupState.lines[0].fresh).toBe(false);
  });

  it("draws body marks first revealed by introduction", async () => {
    const store = useSessionStore();
    store.introduce(1, { name: "Sam", weight: 78, gender: "male" });
    for (let i=0;i<12;i++) store.logDrink(1, { type: "water", abv: 0, volume: 12 });
    const id = store.addPerson();
    const state = mount(PersonReceipt, { person: store.person(id) }).setupState;
    expect([...state.settledPaperSlots].every((slot) => slot === "0" || slot === "1")).toBe(true);
    store.introduce(id, { name: "Ren", weight: 70, gender: "female" });
    await nextTick();
    expect(Object.keys(state.marks).filter((slot) => slot !== "0" && slot !== "1").every((slot) => !state.settledPaperSlots.has(slot))).toBe(true);
  });

  it("reacts to a behind-clock water arrival before a later-timestamped local pour", async () => {
    const store = useSessionStore();
    store.introduce(1, { name: "Sam", weight: 78, gender: "male" });
    store.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    const remote = JSON.parse(JSON.stringify(store.session));
    const timestamp = new Date(Date.now()-60*60000).toISOString();
    remote.events.push({ id: "skew-water", personId: 1, type: "water", abv: 0, volume: 12, timestamp });
    store.mergeRemote(remote);
    await nextTick();
    expect(store.eventsFor(1).at(-1).type).toBe("beer");
    expect(state.barCtx).toMatchObject({ lastType: "water", lastIsSoft: true, sinceLastMin: 0, comingDown: false });
    expect(state.stateDoodle.key).toBe("water");
    expect(store.session.events.find((e) => e.id === "skew-water").timestamp).toBe(timestamp);
    const observed = store.latestReceiptFor(1).at;
    clock.now.value += 15*60000;
    vi.setSystemTime(clock.now.value);
    expect(store.mergeRemote(remote)).toBe(false);
    expect(store.latestReceiptFor(1).at).toBe(observed);
    expect(mount(PersonReceipt, { person: store.person(1) }).setupState.barCtx.sinceLastMin).toBe(15);
    store.closeTab();
    expect(store.latestReceiptFor(1)).toBeNull();
  });

  it("keeps printed initials while the name editor changes the guest", async () => {
    const store = useSessionStore();
    store.introduce(1, { name: "Sam Jones", weight: 78, gender: "male" });
    for (let i = 0; i < 10; i++) store.logDrink(1, { type: "water", abv: 0, volume: 12 });
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    const before = JSON.parse(JSON.stringify(state.marks));
    expect(Object.values(before).some((mark) => mark.name === "word:SJ")).toBe(true);
    store.updatePerson(1, { name: "Robin Doe" });
    await nextTick();
    expect(state.marks).toEqual(before);
  });

  it("retains emergency closing guidance for already-received future peer pours", () => {
    const store = useSessionStore();
    store.introduce(1, { name: "Sam", weight: 78, gender: "male" });
    const remote = JSON.parse(JSON.stringify(store.session));
    const timestamp = new Date(clock.now.value + 60000).toISOString();
    remote.events = Array.from({ length: 20 }, (_, i) => ({ id: `future-${i}`, personId: 1, type: "shot", abv: 0.4, volume: 1.5, timestamp }));
    store.mergeRemote(remote);
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    expect(state.bac).toBe(0);
    expect(state.barClosing.topic).toBe("getHelp");
    expect(store.session.events.every((event) => event.timestamp === timestamp)).toBe(true);
    store.closeTab();
    expect(store.lastTab.summary[0].closingBAC).toBeGreaterThan(0.35);
    expect(mount(CloseTab).setupState.signOff.topic).toBe("getHelp");
  });

  it("keys the coming-down topic when exact BAC crosses 0.02", async () => {
    const store = useSessionStore();
    store.introduce(1, { name: "Sam", weight: 78, gender: "male" });
    store.logDrink(1, { type: "beer", abv: 0.05, volume: 24 });
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    const initial = state.bac;
    clock.now.value += ((initial - 0.0201) / 0.015) * 3600000;
    await nextTick();
    expect(state.barCtx.comingDown).toBe(true);
    const beat = state.beat;
    const unchanged = [state.barCtx.state, state.barCtx.verdict, state.barCtx.hour, state.barCtx.sinceLastMin];
    clock.now.value += 48000;
    await nextTick();
    expect(state.barCtx.comingDown).toBe(false);
    expect([state.barCtx.state, state.barCtx.verdict, state.barCtx.hour, state.barCtx.sinceLastMin]).toEqual(unchanged);
    expect(state.beat).not.toBe(beat);
  });

  it("keeps emergency guidance when a sober friend closes the whole table", () => {
    const store = useSessionStore();
    const friend = store.addPerson({ name: "Ren", needsIntro: false });
    for (let i = 0; i < 20; i++) store.logDrink(friend, { type: "shot", abv: 0.4, volume: 1.5 });
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    expect(state.bac).toBe(0);
    expect(state.barClosing.topic).toBe("getHelp");
  });

  it("preserves emergency guidance in the closed receipt", () => {
    const store = useSessionStore();
    for (let i = 0; i < 20; i++) store.logDrink(1, { type: "shot", abv: 0.4, volume: 1.5 });
    store.closeTab();
    const state = mount(CloseTab).setupState;
    expect(state.signOff.topic).toBe("getHelp");
    expect(state.signOff.text).toMatch(/^call emergency services now/);
  });

  it("updates the printed peak when local time reaches a future peer pour", async () => {
    const store = useSessionStore();
    store.updatePerson(1, { needsIntro: false, name: "Sam" });
    const remote = JSON.parse(JSON.stringify(store.session));
    remote.events.push({ id: "peer-pour", personId: 1, type: "shot", abv: 0.4, volume: 1.5, timestamp: new Date(clock.now.value + 10000).toISOString() });
    store.mergeRemote(remote);
    const state = mount(PersonReceipt, { person: store.person(1) }).setupState;
    expect(state.totals.peak).toBe("0.000");
    clock.now.value += 11000;
    await nextTick();
    expect(Number(state.totals.peak)).toBeGreaterThan(0);
  });
});
