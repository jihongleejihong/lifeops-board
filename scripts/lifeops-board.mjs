#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0";
const DEFAULT_TIMEZONE = "Asia/Seoul";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_TEMPLATE = path.join(PLUGIN_ROOT, "assets", "templates", "lifeop-board.html");
const DAY_START = 6 * 60;
const DAY_END = 24 * 60;
const PX_PER_HOUR = 34;
const GRID_HEIGHT = ((DAY_END - DAY_START) / 60) * PX_PER_HOUR;
const DOWS = ["월", "화", "수", "목", "금", "토", "일"];
const TEMPLATE_ALL = [{ s: "07:10", e: "07:50", l: "런" }];
const TEMPLATE_WORK = [
  { s: "08:20", e: "08:50", l: "이동" },
  { s: "09:00", e: "18:00", l: "근무" },
];
const TEMPLATE_WFH = [{ s: "09:00", e: "18:00", l: "재택(유연)", flex: true }];
const PRIME_MINUTES = 150;
const MIN_FLEX_MINUTES = 30;
const DEFAULT_FLEX_MINUTES = 60;
const MAX_FLEX_MINUTES = 150;
const PLACEABLE_TYPES = new Set(["할일", "행동변화", "루틴"]);

const STATUS_MAP = {
  confirmed: "대기",
  pending: "대기",
  todo: "대기",
  today: "오늘",
  done: "완료",
  completed: "완료",
  cancelled: "취소",
  canceled: "취소",
};
const IMPORTANCE_MAP = { high: "상", medium: "중", low: "하" };
const TYPE_MAP = {
  event: "할일",
  task: "할일",
  routine: "루틴",
  behavior_change: "행동변화",
  "behavior-change": "행동변화",
};

function usage() {
  return `LifeOps Board ${VERSION}

Usage:
  node scripts/lifeops-board.mjs init --root <icloud-path> [--template <html>]
  node scripts/lifeops-board.mjs add --root <icloud-path> --item-json '<json>'
  node scripts/lifeops-board.mjs update --root <icloud-path> --id <id> --item-json '<json>'
  node scripts/lifeops-board.mjs remove --root <icloud-path> --id <id>
  node scripts/lifeops-board.mjs rebalance --root <icloud-path> [--week YYYY-MM-DD] [--include-backlog true]
  node scripts/lifeops-board.mjs render --root <icloud-path>

Options:
  --root <path>       Runtime iCloud root. Can also be omitted when running inside a root with config.json.
  --template <path>   HTML template to copy during init or use while rendering.
  --item-json <json>  Schedule item or patch JSON.
  --id <id>           Item id for update/remove.
  --help              Show help.
`;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    if (key === "help" || key === "version") {
      args[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function expandHome(value) {
  if (!value) return value;
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  mkdirp(path.dirname(file));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
}

function resolveRoot(args, command) {
  if (args.root) return path.resolve(expandHome(args.root));
  if (process.env.LIFEOPS_ROOT) return path.resolve(expandHome(process.env.LIFEOPS_ROOT));
  const localConfig = path.resolve("config.json");
  if (fs.existsSync(localConfig)) {
    const config = readJson(localConfig);
    if (config.root) return path.resolve(expandHome(config.root));
  }
  if (command === "init") throw new Error("init requires --root <path>");
  throw new Error("Missing --root <path>. Run from a LifeOps root with config.json or set LIFEOPS_ROOT.");
}

function paths(root) {
  return {
    root,
    config: path.join(root, "config.json"),
    schedule: path.join(root, "schedule.json"),
    templateDir: path.join(root, "template"),
    template: path.join(root, "template", "lifeop-board.html"),
    output: path.join(root, "output"),
    latest: path.join(root, "output", "latest.html"),
    snapshots: path.join(root, "snapshots"),
  };
}

function nowIso(timezone = DEFAULT_TIMEZONE) {
  const parts = dateParts(new Date(), timezone);
  return `${parts.date}T${parts.time}${offsetSuffix(timezone)}`;
}

function offsetSuffix(timezone) {
  const now = new Date();
  const here = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const diffMinutes = Math.round((here.getTime() - utc.getTime()) / 60000);
  const sign = diffMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

function dateParts(date, timezone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    hm: `${parts.hour}:${parts.minute}`,
  };
}

function renderStamp(timezone) {
  const parts = dateParts(new Date(), timezone);
  const zoneLabel = timezone === "Asia/Seoul" ? "KST" : timezone;
  return `${parts.date} ${parts.hm} ${zoneLabel}`;
}

function outputDate(timezone) {
  return dateParts(new Date(), timezone).date;
}

function emptySchedule(root) {
  return {
    version: 1,
    timezone: DEFAULT_TIMEZONE,
    updated_at: nowIso(DEFAULT_TIMEZONE),
    root,
    items: [],
    daily_logs: [],
  };
}

function normalizeSchedule(schedule, root) {
  const timezone = schedule.timezone || DEFAULT_TIMEZONE;
  const normalized = {
    version: schedule.version || 1,
    timezone,
    updated_at: schedule.updated_at || nowIso(timezone),
    root: schedule.root || root,
    items: Array.isArray(schedule.items) ? schedule.items.map((item) => normalizeItem(item, timezone)) : [],
    daily_logs: Array.isArray(schedule.daily_logs) ? schedule.daily_logs : [],
  };
  normalized.items.sort(itemSortKey);
  return normalized;
}

function normalizeItem(item, timezone = DEFAULT_TIMEZONE) {
  const copy = { ...item };
  copy.type ||= "event";
  copy.dimension ||= "일정";
  copy.status ||= "대기";
  copy.importance ||= "중";
  copy.estimate ??= null;
  copy.deadline ??= null;
  copy.deadline_type ??= null;
  copy.source_text ??= null;
  copy.created_at ||= nowIso(timezone);
  copy.updated_at ||= copy.created_at;
  validateItem(copy);
  return copy;
}

function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) throw new Error("schedule.json must be an object");
  if (schedule.items && !Array.isArray(schedule.items)) throw new Error("schedule.json items must be an array");
  if (schedule.daily_logs && !Array.isArray(schedule.daily_logs)) throw new Error("schedule.json daily_logs must be an array");
  for (const item of schedule.items || []) validateItem(item);
}

function validateItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("item must be an object");
  if (!item.id || typeof item.id !== "string") throw new Error("item.id is required");
  if (!item.title || typeof item.title !== "string") throw new Error("item.title is required");
  if ((item.type || "event") === "event" && !item.start) throw new Error("event item requires start");
  for (const field of ["start", "end"]) {
    if (item[field]) parseIsoDateTime(item[field], `item.${field}`);
  }
}

function parseIsoDateTime(value, label = "datetime") {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(value)) throw new Error(`${label} must include timezone offset: ${value}`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid ISO datetime: ${value}`);
  return date;
}

function itemSortKey(a, b) {
  const aKey = itemKey(a);
  const bKey = itemKey(b);
  return aKey.localeCompare(bKey);
}

function itemKey(item) {
  if (item.start) {
    const parts = dateParts(parseIsoDateTime(item.start), DEFAULT_TIMEZONE);
    return `${parts.date} ${parts.hm} ${item.title}`;
  }
  return `${String(item.date || item.deadline || "9999-12-31").slice(0, 10)} 99:99 ${item.title}`;
}

function readSchedule(root, create = false) {
  const p = paths(root);
  if (!fs.existsSync(p.schedule)) {
    if (!create) throw new Error(`schedule.json not found: ${p.schedule}`);
    const schedule = emptySchedule(root);
    writeJson(p.schedule, schedule);
    return schedule;
  }
  const schedule = readJson(p.schedule);
  validateSchedule(schedule);
  return normalizeSchedule(schedule, root);
}

function ensureTemplate(root, templateArg) {
  const p = paths(root);
  const source = templateArg ? path.resolve(expandHome(templateArg)) : DEFAULT_TEMPLATE;
  if (templateArg || !fs.existsSync(p.template)) {
    if (!fs.existsSync(source)) throw new Error(`template not found: ${source}`);
    mkdirp(p.templateDir);
    fs.copyFileSync(source, p.template);
  }
  return p.template;
}

function saveSchedule(root, schedule, templateArg) {
  const normalized = normalizeSchedule(schedule, root);
  normalized.updated_at = nowIso(normalized.timezone);
  writeJson(paths(root).schedule, normalized);
  writeSnapshots(root, normalized);
  render(root, normalized, templateArg);
  return normalized;
}

function writeSnapshots(root, schedule) {
  const p = paths(root);
  mkdirp(p.snapshots);
  const byDate = new Map();
  for (const item of schedule.items) {
    for (const date of itemDates(item, schedule.timezone)) {
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(item);
    }
  }
  for (const [date, items] of byDate.entries()) {
    writeJson(path.join(p.snapshots, `${date}.json`), {
      date,
      timezone: schedule.timezone,
      generated_at: nowIso(schedule.timezone),
      items: [...items].sort(itemSortKey),
    });
  }
}

function itemDates(item, timezone) {
  const dates = new Set();
  for (const field of ["start", "end"]) {
    if (item[field]) dates.add(dateParts(parseIsoDateTime(item[field]), timezone).date);
  }
  for (const field of ["date", "deadline"]) {
    if (item[field]) dates.add(String(item[field]).slice(0, 10));
  }
  if (!dates.size) dates.add("unscheduled");
  return [...dates].sort();
}

function toBoardDateTime(value) {
  if (!value) return null;
  return `${parseIsoDateTime(value).toISOString().slice(0, 19).replace("T", " ")}Z`;
}

function toBoardRow(item) {
  const bd = item.start ? toBoardDateTime(item.start) : item.date ? String(item.date).slice(0, 10) : null;
  return {
    id: item.id,
    "할일": item.title,
    Dimension: item.dimension || "일정",
    "유형": TYPE_MAP[item.type] || item.type || "할일",
    "상태": STATUS_MAP[item.status] || item.status || "대기",
    "중요도": IMPORTANCE_MAP[item.importance] || item.importance || "중",
    "예상소요": item.estimate || null,
    bd,
    be: toBoardDateTime(item.end),
    ddl: item.deadline ? String(item.deadline).slice(0, 10) : null,
    dt: item.deadline_type || null,
  };
}

function toDlog(row) {
  return {
    "날짜": row.date || row["날짜"] || null,
    "부하": row.load || row["부하"] || null,
    "컨디션": row.condition || row["컨디션"] || null,
  };
}

function makeBaked(schedule) {
  return {
    ts: renderStamp(schedule.timezone),
    backlog: schedule.items.map(toBoardRow),
    dlog: schedule.daily_logs.map(toDlog),
  };
}

function minutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function yTop(minute) {
  return ((minute - DAY_START) / 60) * PX_PER_HOUR;
}

function dateKeyToUtc(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function mondayForDateKey(key) {
  const date = dateKeyToUtc(key);
  const weekday = (date.getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

function boardDateInfo(value, timezone) {
  if (!value) return null;
  if (String(value).length <= 10) return { date: String(value).slice(0, 10), minute: null, label: "" };
  const normalized = String(value).replace(" ", "T");
  const parts = dateParts(parseIsoDateTime(normalized), timezone);
  return {
    date: parts.date,
    minute: parts.hour * 60 + parts.minute,
    label: parts.hm,
  };
}

function isActiveStatus(status) {
  const normalized = String(status || "대기").toLowerCase();
  if (["완료", "취소", "cancelled", "canceled", "done", "completed"].includes(normalized)) return false;
  return true;
}

function importanceRank(value) {
  return { "상": 0, high: 0, "중": 1, medium: 1, "하": 2, low: 2 }[value] ?? 2;
}

function deadlineKey(row, fallback = "9999-12-31") {
  return row.ddl ? String(row.ddl).slice(0, 10) : fallback;
}

function isPlaceableFlexRow(row) {
  return PLACEABLE_TYPES.has(row["유형"]) && isActiveStatus(row["상태"]);
}

function parseEstimateMinutes(value) {
  if (!value) return DEFAULT_FLEX_MINUTES;
  const text = String(value).toLowerCase();
  if (text.includes("분산")) return 90;
  const hourRange = text.match(/(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*h/);
  if (hourRange) return ((Number(hourRange[1]) + Number(hourRange[2])) / 2) * 60;
  const hour = text.match(/(\d+(?:\.\d+)?)\s*(?:h|시간)/);
  if (hour) return Number(hour[1]) * 60;
  const minute = text.match(/(\d+)\s*(?:m|분)/);
  if (minute) return Number(minute[1]);
  return DEFAULT_FLEX_MINUTES;
}

function flexDuration(row) {
  const estimate = parseEstimateMinutes(row["예상소요"]);
  const rounded = Math.ceil(estimate / 15) * 15;
  return Math.min(MAX_FLEX_MINUTES, Math.max(MIN_FLEX_MINUTES, rounded));
}

function isPrimeBlock(block) {
  return block.s <= 19 * 60 && block.e - block.s >= PRIME_MINUTES;
}

function collectTimedBusy(rows, schedule, day, weekdayIndex) {
  const key = dateKey(day);
  const busy = fixedBusy(weekdayIndex);
  for (const row of rows) {
    const start = boardDateInfo(row.bd, schedule.timezone);
    if (!start || start.date !== key || start.minute === null) continue;
    const end = boardDateInfo(row.be, schedule.timezone);
    busy.push({
      s: start.minute,
      e: end && end.date === key && end.minute !== null ? end.minute : start.minute + 60,
      l: row["할일"],
      cls: `evt${row["상태"] === "완료" ? " done" : ""}`,
      tm: start.label,
      evt: true,
      visible: true,
    });
  }
  return busy.sort((a, b) => a.s - b.s);
}

function currentScheduleMinute(schedule) {
  const parts = dateParts(new Date(), schedule.timezone);
  return { date: parts.date, minute: parts.hour * 60 + parts.minute };
}

function getFlexCandidates(rows, schedule, weekStart, weekEnd, options = {}) {
  const startKey = dateKey(weekStart);
  const endKey = dateKey(weekEnd);
  return rows
    .map((row, index) => ({ row, index, info: boardDateInfo(row.bd, schedule.timezone) }))
    .filter(({ row, info }) => {
      if (!isPlaceableFlexRow(row)) return false;
      if (info?.minute !== null) return false;
      if (info?.date) return startKey <= info.date && info.date <= endKey;
      if (!options.includeBacklog) return false;
      return row["상태"] === "오늘" || deadlineKey(row) <= endKey || options.includeBacklog === "all";
    })
    .sort((a, b) => {
      const aToday = a.row["상태"] === "오늘" ? 0 : 1;
      const bToday = b.row["상태"] === "오늘" ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      const aHard = a.row.dt === "hard" ? 0 : 1;
      const bHard = b.row.dt === "hard" ? 0 : 1;
      if (aHard !== bHard) return aHard - bHard;
      const ddl = deadlineKey(a.row).localeCompare(deadlineKey(b.row));
      if (ddl) return ddl;
      const imp = importanceRank(a.row["중요도"]) - importanceRank(b.row["중요도"]);
      return imp || a.index - b.index;
    });
}

function buildFlexPlan(rows, schedule, days, options = {}) {
  const now = currentScheduleMinute(schedule);
  const weekStart = days[0];
  const weekEnd = days[6];
  const candidates = getFlexCandidates(rows, schedule, weekStart, weekEnd, options);
  const slots = [];
  days.forEach((day, index) => {
    const key = dateKey(day);
    const busy = collectTimedBusy(rows, schedule, day, index);
    for (const block of openBlocks(busy)) {
      if (!isPrimeBlock(block)) continue;
      const start = key === now.date ? Math.max(block.s, now.minute) : block.s;
      if (key < now.date || block.e - start < MIN_FLEX_MINUTES) continue;
      slots.push({ date: key, dow: DOWS[index], s: start, e: block.e, cursor: start });
    }
  });
  const byDate = new Map();
  const placed = [];
  const unplaced = [];
  for (const candidate of candidates) {
    const duration = flexDuration(candidate.row);
    const due = candidate.row.ddl ? String(candidate.row.ddl).slice(0, 10) : null;
    const latest = due && due < dateKey(weekEnd) ? due : dateKey(weekEnd);
    const currentDate = candidate.info?.date;
    const eligible = slots.filter((slot) => {
      if (slot.date > latest) return false;
      if (slot.e - slot.cursor < duration) return false;
      if (currentDate && slot.date < currentDate && candidate.row.dt !== "hard") return false;
      return true;
    });
    const slot = eligible[0] || slots.find((item) => item.date <= latest && item.e - item.cursor >= MIN_FLEX_MINUTES);
    if (!slot) {
      unplaced.push(candidate.row);
      continue;
    }
    const minutesValue = Math.min(duration, slot.e - slot.cursor);
    const block = {
      row: candidate.row,
      id: candidate.row.id,
      date: slot.date,
      dow: slot.dow,
      s: slot.cursor,
      e: slot.cursor + minutesValue,
      duration: minutesValue,
      partial: minutesValue < duration,
    };
    slot.cursor = block.e;
    if (!byDate.has(block.date)) byDate.set(block.date, []);
    byDate.get(block.date).push(block);
    placed.push(block);
  }
  return { byDate, placed, unplaced, candidates: candidates.map((candidate) => candidate.row) };
}

function selectWeek(rows, schedule) {
  const today = dateParts(new Date(), schedule.timezone).date;
  const currentMonday = mondayForDateKey(today);
  const currentStart = dateKey(currentMonday);
  const currentEnd = dateKey(addDays(currentMonday, 6));
  const dates = rows
    .map((row) => boardDateInfo(row.bd, schedule.timezone))
    .filter(Boolean)
    .map((info) => info.date)
    .sort();
  if (dates.some((date) => currentStart <= date && date <= currentEnd)) return currentMonday;
  const future = dates.find((date) => date >= today);
  return future ? mondayForDateKey(future) : currentMonday;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderStaticBoard(schedule) {
  const rows = schedule.items.map(toBoardRow);
  const weekStart = selectWeek(rows, schedule);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const today = dateParts(new Date(), schedule.timezone).date;
  const weekEnd = days[6];
  const flexPlan = buildFlexPlan(rows, schedule, days);
  const grid = renderGrid(rows, schedule, days, today, flexPlan);
  const flexRows = [];
  const backlogRows = [];
  for (const row of rows) {
    const info = boardDateInfo(row.bd, schedule.timezone);
    if (info && info.minute === null && dateKey(weekStart) <= info.date && info.date <= dateKey(weekEnd)) {
      flexRows.push(row);
    } else if (!row.bd && ["할일", "행동변화"].includes(row["유형"]) && row["상태"] !== "완료") {
      backlogRows.push(row);
    }
  }
  const { prime, tired } = calculateOpenMinutes(rows, schedule, days, flexPlan);
  const mustRows = rows.filter(
    (row) => row.ddl && String(row.ddl).slice(0, 10) <= dateKey(weekEnd) && row["상태"] !== "완료" && row["유형"] === "할일",
  );
  return {
    title: `주간 보드 · ${weekStart.getUTCMonth() + 1}/${weekStart.getUTCDate()} – ${weekEnd.getUTCMonth() + 1}/${weekEnd.getUTCDate()}`,
    tips: renderTips(prime, tired, mustRows, flexPlan),
    grid,
    flex: renderFlexPool(flexRows, schedule, flexPlan),
    backlog: renderBacklogPool(backlogRows),
    flexCount: flexRows.length,
    backlogCount: backlogRows.length,
    cards: renderCards(prime, tired, mustRows, flexPlan),
  };
}

function renderGrid(rows, schedule, days, todayKey, flexPlan) {
  const parts = ["<div></div>"];
  const logByDate = new Map(schedule.daily_logs.map((row) => [String(row.date || row["날짜"] || "").slice(0, 10), row]));
  const eColor = { "가벼움": "#7cb98c", "보통": "#e2c04d", "폭발": "#dd7d6a" };
  days.forEach((day, index) => {
    const key = dateKey(day);
    const isToday = key === todayKey;
    let dot = "";
    if (key <= todayKey) {
      const log = logByDate.get(key);
      const color = log ? eColor[log.load || log["부하"]] || "#dedbd4" : "#dedbd4";
      const tip = log ? `부하 ${log.load || log["부하"] || "?"} · 컨디션 ${log.condition || log["컨디션"] || "?"}` : "기록 없음";
      dot = ` <span title="${escapeHtml(tip)}" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};vertical-align:0"></span>`;
    }
    parts.push(`<div class="dhead ${isToday ? "today" : ""}">${DOWS[index]} <span class="dt">${day.getUTCMonth() + 1}/${day.getUTCDate()}</span>${dot}${isToday ? " · 오늘" : ""}</div>`);
  });
  const gutter = [`<div class="gutter" style="height:${GRID_HEIGHT}px">`];
  for (let hour = 7; hour < 24; hour += 2) {
    gutter.push(`<div class="hr" style="top:${yTop(hour * 60)}px">${hour}시</div>`);
  }
  gutter.push("</div>");
  parts.push(...gutter);
  days.forEach((day, index) => parts.push(renderDayColumn(rows, schedule, day, index, todayKey, flexPlan)));
  return parts.join("");
}

function renderDayColumn(rows, schedule, day, weekdayIndex, todayKey, flexPlan) {
  const key = dateKey(day);
  const busy = collectTimedBusy(rows, schedule, day, weekdayIndex);
  const flexBlocks = flexPlan?.byDate.get(key) || [];
  const busyWithFlex = [...busy, ...flexBlocks.map((block) => ({ s: block.s, e: block.e }))].sort((a, b) => a.s - b.s);
  const classes = ["col"];
  if (key === todayKey) classes.push("today");
  if (key < todayKey) classes.push("past");
  const parts = [`<div class="${classes.join(" ")}" style="height:${GRID_HEIGHT}px">`];
  for (let hour = 7; hour < 24; hour += 2) {
    parts.push(`<div class="hline" style="top:${yTop(hour * 60)}px"></div>`);
  }
  for (const block of openBlocks(busyWithFlex)) {
    if (block.e - block.s < 60) continue;
    const prime = isPrimeBlock(block);
    if (!prime) continue;
    const label = "오픈 프라임";
    const height = ((block.e - block.s) / 60) * PX_PER_HOUR - 2;
    const hours = Math.round((block.e - block.s) / 6) / 10;
    parts.push(`<div class="blk open" style="top:${yTop(block.s)}px;height:${height}px">${label}<span class="t">${hours}h</span></div>`);
  }
  for (const block of flexBlocks) {
    parts.push(renderFlexBlock(block));
  }
  let previousEnd = -1;
  for (const block of busy) {
    if (block.visible === false) continue;
    const overlap = block.evt && block.s < previousEnd ? " ov" : "";
    const height = Math.max(((block.e - block.s) / 60) * PX_PER_HOUR - 2, 14);
    const tm = block.tm ? `<span class="t">${escapeHtml(block.tm)}</span>` : "";
    parts.push(`<div class="blk ${escapeHtml(block.cls)}${overlap}" style="top:${yTop(block.s)}px;height:${height}px">${escapeHtml(block.l)}${tm}</div>`);
    previousEnd = Math.max(previousEnd, block.e);
  }
  parts.push("</div>");
  return parts.join("");
}

function minuteLabel(minute) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function renderFlexBlock(block) {
  const height = Math.max(((block.e - block.s) / 60) * PX_PER_HOUR - 2, 16);
  const suffix = block.partial ? " · 일부" : "";
  return `<div class="blk flex" style="top:${yTop(block.s)}px;height:${height}px">${escapeHtml(block.row["할일"])}<span class="t">${minuteLabel(block.s)}-${minuteLabel(block.e)}${suffix}</span></div>`;
}

function fixedBusy(weekdayIndex) {
  const busy = TEMPLATE_ALL.map((block) => ({ s: minutes(block.s), e: minutes(block.e), l: block.l, cls: "fixed", visible: false }));
  if (weekdayIndex <= 3) {
    busy.push(...TEMPLATE_WORK.map((block) => ({ s: minutes(block.s), e: minutes(block.e), l: block.l, cls: "fixed", visible: false })));
  }
  if (weekdayIndex === 4) {
    busy.push(...TEMPLATE_WFH.map((block) => ({ s: minutes(block.s), e: minutes(block.e), l: block.l, cls: "fixed flex-work", visible: false })));
  }
  return busy;
}

function openBlocks(busy) {
  const merged = [];
  for (const block of busy) {
    if (merged.length && block.s <= merged.at(-1).e) merged.at(-1).e = Math.max(merged.at(-1).e, block.e);
    else merged.push({ s: block.s, e: block.e });
  }
  const blocks = [];
  let current = 7 * 60;
  const end = 23.5 * 60;
  for (const block of merged) {
    if (block.s > current) blocks.push({ s: current, e: Math.min(block.s, end) });
    current = Math.max(current, block.e);
  }
  if (current < end) blocks.push({ s: current, e: end });
  return blocks;
}

function calculateOpenMinutes(rows, schedule, days, flexPlan) {
  const prime = Object.fromEntries(DOWS.map((day) => [day, 0]));
  const tired = Object.fromEntries(DOWS.map((day) => [day, 0]));
  days.forEach((day, index) => {
    const key = dateKey(day);
    const busy = collectTimedBusy(rows, schedule, day, index);
    const flexBlocks = flexPlan?.byDate.get(key) || [];
    busy.push(...flexBlocks.map((block) => ({ s: block.s, e: block.e })));
    for (const block of openBlocks(busy.sort((a, b) => a.s - b.s))) {
      if (block.e - block.s < 60) continue;
      if (isPrimeBlock(block)) prime[DOWS[index]] += block.e - block.s;
      else tired[DOWS[index]] += block.e - block.s;
    }
  });
  return { prime, tired };
}

function renderFlexPool(rows, schedule, flexPlan) {
  if (!rows.length) return '<span style="font-size:12px;color:#a7a49e">없음</span>';
  return rows.map((row) => renderChip(row, schedule, true, flexPlan)).join("");
}

function renderBacklogPool(rows) {
  if (!rows.length) return '<span style="font-size:12px;color:#a7a49e">비어있음 🎉</span>';
  const order = { "상": 0, "중": 1, "하": 2 };
  return [...rows].sort((a, b) => (order[a["중요도"]] ?? 2) - (order[b["중요도"]] ?? 2)).map((row) => renderChip(row, null, false)).join("");
}

function renderChip(row, schedule, includeDay, flexPlan) {
  const impCls = { "상": "imp-h", "중": "imp-m", "하": "imp-l" }[row["중요도"]] || "imp-l";
  const done = row["상태"] === "완료" ? " done" : "";
  let dayHtml = "";
  let planHtml = "";
  const planned = flexPlan?.placed.find((block) => block.row === row || block.id && block.id === row.id);
  if (includeDay && schedule) {
    const info = boardDateInfo(row.bd, schedule.timezone);
    const planDate = planned?.date || info?.date;
    if (planDate) {
      const weekday = (dateKeyToUtc(planDate).getUTCDay() + 6) % 7;
      dayHtml = `<span class="day">${DOWS[weekday]}</span>`;
    }
    if (planned) planHtml = `<span class="ddl">${minuteLabel(planned.s)}-${minuteLabel(planned.e)}</span>`;
  }
  const ddl = row.ddl ? `<span class="ddl">⏰${escapeHtml(String(row.ddl).slice(5, 10).replace("-", "/"))}${row.dt === "hard" ? "!" : ""}</span>` : "";
  return `<span class="chip${done}">${dayHtml}<span class="imp ${impCls}"></span>${escapeHtml(row["할일"])}${planHtml}${ddl}</span>`;
}

function renderCards(prime, tired, mustRows, flexPlan) {
  const hour = (minutesValue) => Math.round(minutesValue / 30) / 2;
  const primeDays = Object.entries(prime).filter(([, value]) => value).map(([day]) => day);
  const placedMinutes = flexPlan.placed.reduce((sum, block) => sum + block.duration, 0);
  const mustTitles = mustRows.map((row) => String(row["할일"]).split(" ")[0]).slice(0, 3).join(" · ") || "—";
  return `<div class="card"><div class="l">남은 프라임</div><div class="v">~${hour(Object.values(prime).reduce((a, b) => a + b, 0))}시간</div><div class="d">${primeDays.join("·") || "—"}</div></div>` +
    `<div class="card"><div class="l">유동 배치</div><div class="v">${flexPlan.placed.length}건</div><div class="d">~${hour(placedMinutes)}시간${flexPlan.unplaced.length ? ` · 미배치 ${flexPlan.unplaced.length}건` : ""}</div></div>` +
    `<div class="card"><div class="l">이번주 필수</div><div class="v">${mustRows.length}건</div><div class="d">${escapeHtml(mustTitles)}</div></div>`;
}

function renderTips(prime, tired, mustRows, flexPlan) {
  const tips = [];
  const primeTotal = Object.values(prime).reduce((a, b) => a + b, 0);
  const tiredTotal = Object.values(tired).reduce((a, b) => a + b, 0);
  const tightHard = mustRows.filter((row) => row.dt === "hard").length;
  if (flexPlan.unplaced.length) {
    tips.push(`프라임에 못 넣은 유동 할일 ${flexPlan.unplaced.length}건이 있어요. 마감/중요도 낮은 항목을 다음주로 넘기거나 30분 첫 행동으로 쪼개세요.`);
  } else if (flexPlan.placed.length) {
    tips.push(`유동 할일 ${flexPlan.placed.length}건을 프라임 슬롯에 자동 배치했습니다. 새 약속이 생기면 같은 기준으로 다시 나눕니다.`);
  }
  if (tightHard) tips.push(`이번주 hard 마감 ${tightHard}건은 상태보다 우선입니다. 가장 이른 남은 프라임부터 지키는 편이 낫습니다.`);
  if (primeTotal >= 150) tips.push(`아직 ${Math.round(primeTotal / 30) / 2}시간 정도의 프라임이 남아 있습니다. 오전/긴 저녁 블록은 딥워크 한 가지에 쓰세요.`);
  if (tiredTotal >= 180) tips.push(`자투리 시간은 화면에서 숨겼습니다. 이 시간은 회복, 식사, 정리처럼 낮은 에너지 작업으로만 보세요.`);
  if (!tips.length) tips.push("이번주 보드는 빡빡합니다. 새 일을 넣기 전에 기존 유동 할일 하나를 덜어내는 편이 안전합니다.");
  return tips.slice(0, 3).map((tip) => `<div class="tip">${escapeHtml(tip)}</div>`).join("");
}

function includeBacklogMode(value) {
  if (value === "all") return "all";
  return ["true", "1", "yes", "y"].includes(String(value || "").toLowerCase());
}

function rebalanceFlexibleTasks(schedule, args = {}) {
  const target = args.week ? String(args.week).slice(0, 10) : dateParts(new Date(), schedule.timezone).date;
  const weekStart = mondayForDateKey(target);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const rows = schedule.items.map(toBoardRow);
  const plan = buildFlexPlan(rows, schedule, days, { includeBacklog: includeBacklogMode(args["include-backlog"]) });
  const plannedById = new Map(plan.placed.filter((block) => block.id).map((block) => [block.id, block]));
  let updated = 0;
  for (const item of schedule.items) {
    const block = plannedById.get(item.id);
    if (!block) continue;
    if (item.date !== block.date) {
      item.date = block.date;
      item.updated_at = nowIso(schedule.timezone);
      updated += 1;
    }
  }
  return { plan, updated, weekStart, weekEnd: days[6] };
}

function injectStaticFallback(htmlText, schedule) {
  const staticBoard = renderStaticBoard(schedule);
  let text = htmlText.replace(
    /<h1 id="title">.*?<\/h1>/s,
    `<h1 id="title">${escapeHtml(staticBoard.title)} <span id="ver" style="font-size:10px;color:#c9c6c0;font-weight:400">v2.0 · 정적</span></h1>`,
  );
  text = text.replace(
    '<div class="gridwrap"><div id="grid" class="grid"><div class="loading" style="grid-column:1/-1">불러오는 중…</div></div></div>',
    `<div class="gridwrap"><div id="grid" class="grid">${staticBoard.grid}</div></div>`,
  );
  text = text.replace('<div id="tips" class="tips"></div>', `<div id="tips" class="tips">${staticBoard.tips}</div>`);
  text = text.replace(
    '<span id="flexn" style="color:#a7a49e;font-weight:400"></span>',
    `<span id="flexn" style="color:#a7a49e;font-weight:400">· ${staticBoard.flexCount}건</span>`,
  );
  text = text.replace(
    '<span id="backn" style="color:#a7a49e;font-weight:400"></span>',
    `<span id="backn" style="color:#a7a49e;font-weight:400">· ${staticBoard.backlogCount}건</span>`,
  );
  text = text.replace('<div class="chips" id="flexpool"></div>', `<div class="chips" id="flexpool">${staticBoard.flex}</div>`);
  text = text.replace('<div class="chips" id="backpool"></div>', `<div class="chips" id="backpool">${staticBoard.backlog}</div>`);
  text = text.replace('<div class="cards" id="cards"></div>', `<div class="cards" id="cards">${staticBoard.cards}</div>`);
  return text;
}

function render(root, schedule, templateArg) {
  const p = paths(root);
  const template = ensureTemplate(root, templateArg);
  mkdirp(p.output);
  const baked = JSON.stringify(makeBaked(schedule));
  let text = fs.readFileSync(template, "utf8");
  text = text.replace(
    /const BAKED = .*?;\n\nconst DAY_S =/s,
    `const BAKED = ${baked};\n\nconst DAY_S =`,
  );
  if (!text.includes(`const BAKED = ${baked};`)) throw new Error("Could not replace const BAKED in template");
  text = text.replace(
    /<div class="sub">.*?<\/div>/s,
    '<div class="sub">프라임 슬롯 기반 자동 재배치 · 참고자료 기반 인사이트 · 데이터: iCloud schedule.json 스냅샷</div>',
  );
  text = text.replace("if(!await waitCowork()){", "if(true || !await waitCowork()){");
  text = text.replace("const top = m =>", "const yTop = m =>");
  text = text.replaceAll("${top(", "${yTop(");
  text = injectStaticFallback(text, schedule);
  const dated = path.join(p.output, `${outputDate(schedule.timezone)}.html`);
  fs.writeFileSync(p.latest, text, "utf8");
  fs.writeFileSync(dated, text, "utf8");
  return { latest: p.latest, dated };
}

function initCommand(args) {
  const root = resolveRoot(args, "init");
  const p = paths(root);
  mkdirp(root);
  mkdirp(p.output);
  mkdirp(p.snapshots);
  ensureTemplate(root, args.template);
  const existing = fs.existsSync(p.schedule) ? readSchedule(root, false) : emptySchedule(root);
  const schedule = normalizeSchedule(existing, root);
  writeJson(p.config, {
    version: 1,
    root,
    timezone: schedule.timezone,
    schedule: "schedule.json",
    template: "template/lifeop-board.html",
    output: "output",
  });
  saveSchedule(root, schedule, args.template);
  console.log(p.config);
  console.log(p.schedule);
  console.log(p.latest);
}

function itemJson(args) {
  if (!args["item-json"]) throw new Error("--item-json is required");
  const parsed = JSON.parse(args["item-json"]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("--item-json must be an object");
  return parsed;
}

function addCommand(args) {
  const root = resolveRoot(args, "add");
  const schedule = readSchedule(root, true);
  const item = normalizeItem(itemJson(args), schedule.timezone);
  const index = schedule.items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) {
    item.created_at = schedule.items[index].created_at || item.created_at;
    item.updated_at = nowIso(schedule.timezone);
    schedule.items[index] = item;
  } else {
    schedule.items.push(item);
  }
  const saved = saveSchedule(root, schedule, args.template);
  console.log(`${index >= 0 ? "updated" : "added"} ${item.id}`);
  console.log(paths(root).latest);
  return saved;
}

function updateCommand(args) {
  if (!args.id) throw new Error("--id is required");
  const root = resolveRoot(args, "update");
  const schedule = readSchedule(root, false);
  const patch = itemJson(args);
  const item = schedule.items.find((candidate) => candidate.id === args.id);
  if (!item) throw new Error(`item not found: ${args.id}`);
  Object.assign(item, patch, { updated_at: nowIso(schedule.timezone) });
  validateItem(item);
  saveSchedule(root, schedule, args.template);
  console.log(`updated ${args.id}`);
  console.log(paths(root).latest);
}

function removeCommand(args) {
  if (!args.id) throw new Error("--id is required");
  const root = resolveRoot(args, "remove");
  const schedule = readSchedule(root, false);
  const before = schedule.items.length;
  schedule.items = schedule.items.filter((item) => item.id !== args.id);
  if (schedule.items.length === before) throw new Error(`item not found: ${args.id}`);
  saveSchedule(root, schedule, args.template);
  console.log(`removed ${args.id}`);
  console.log(paths(root).latest);
}

function rebalanceCommand(args) {
  const root = resolveRoot(args, "rebalance");
  const schedule = readSchedule(root, false);
  const result = rebalanceFlexibleTasks(schedule, args);
  saveSchedule(root, schedule, args.template);
  console.log(
    `rebalanced ${result.plan.placed.length} flexible tasks (${result.updated} date updates, ${result.plan.unplaced.length} unplaced)`,
  );
  console.log(`${dateKey(result.weekStart)}..${dateKey(result.weekEnd)}`);
  console.log(paths(root).latest);
}

function renderCommand(args) {
  const root = resolveRoot(args, "render");
  const schedule = readSchedule(root, false);
  saveSchedule(root, schedule, args.template);
  console.log(paths(root).latest);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args._.length) {
    console.log(usage());
    return;
  }
  if (args.version) {
    console.log(VERSION);
    return;
  }
  const command = args._[0];
  if (command === "init") initCommand(args);
  else if (command === "add") addCommand(args);
  else if (command === "update") updateCommand(args);
  else if (command === "remove") removeCommand(args);
  else if (command === "rebalance") rebalanceCommand(args);
  else if (command === "render") renderCommand(args);
  else throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error(`lifeops-board: ${error.message}`);
  process.exit(1);
}
