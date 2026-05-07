import process from "node:process";

import type { TrackHealth } from "./types.js";

export type TrackLanguage = "en" | "ko";

export interface TrackLanguageOptions {
  lang?: TrackLanguage;
}

type MessageKey =
  | "active"
  | "bar"
  | "block"
  | "check"
  | "crew"
  | "draft"
  | "draftReview"
  | "evidence"
  | "flags"
  | "forceOverwrite"
  | "greenFlag"
  | "harnessFail"
  | "harnessOk"
  | "initBlocked"
  | "initCreated"
  | "initDryRun"
  | "initPlan"
  | "issues"
  | "lap"
  | "mode"
  | "next"
  | "nextHeader"
  | "nextMap"
  | "nextStatus"
  | "plan"
  | "project"
  | "recent"
  | "redFlag"
  | "roadmap"
  | "runtime"
  | "signal"
  | "sources"
  | "state"
  | "statusHeader"
  | "template"
  | "title"
  | "trackBootstrapDraft"
  | "trackBootstrapWriteBlocked"
  | "trackBootstrapWriteDryRun"
  | "trackBootstrapWritePlan"
  | "trackBootstrapWritten"
  | "warnings"
  | "worksheet"
  | "writeNext"
  | "yellowFlag";

const MESSAGES: Record<TrackLanguage, Record<MessageKey, string>> = {
  en: {
    active: "ACTIVE",
    bar: "BAR",
    block: "BLOCK",
    check: "CHECK",
    crew: "CREW",
    draft: "DRAFT",
    draftReview: "This is a draft. Review the evidence before writing .track files.",
    evidence: "Evidence",
    flags: "FLAGS",
    forceOverwrite: "Use force to overwrite existing Track files.",
    greenFlag: "GREEN FLAG",
    harnessFail: "HARNESS FAIL",
    harnessOk: "HARNESS OK",
    initBlocked: "TRACK INIT BLOCKED",
    initCreated: "TRACK INIT CREATED",
    initDryRun: "TRACK INIT DRY RUN",
    initPlan: "TRACK INIT PLAN",
    issues: "Issues",
    lap: "LAP",
    mode: "MODE",
    next: "NEXT",
    nextHeader: "TRACK // NEXT MOVE",
    nextMap: "Next: track map",
    nextStatus: "Next: track status",
    plan: "PLAN",
    project: "PROJECT",
    recent: "RECENT",
    redFlag: "RED FLAG",
    roadmap: "Roadmap",
    runtime: "RUNTIME",
    signal: "SIGNAL",
    sources: "SOURCES",
    state: "State",
    statusHeader: "TRACK // DRIVER HUD",
    template: "Template",
    title: "TITLE",
    trackBootstrapDraft: "TRACK BOOTSTRAP DRAFT",
    trackBootstrapWriteBlocked: "TRACK BOOTSTRAP WRITE BLOCKED",
    trackBootstrapWriteDryRun: "TRACK BOOTSTRAP WRITE DRY RUN",
    trackBootstrapWritePlan: "TRACK BOOTSTRAP WRITE PLAN",
    trackBootstrapWritten: "TRACK BOOTSTRAP WRITTEN",
    warnings: "Warnings",
    worksheet: "WORKSHEET",
    writeNext: "Next: rerun with --write to create Track files.",
    yellowFlag: "YELLOW FLAG",
  },
  ko: {
    active: "활성",
    bar: "진행",
    block: "차단",
    check: "체크",
    crew: "담당",
    draft: "초안",
    draftReview: "이 출력은 초안입니다. .track 파일을 쓰기 전에 근거를 검토하세요.",
    evidence: "근거",
    flags: "플래그",
    forceOverwrite: "기존 Track 파일을 덮어쓰려면 force를 사용하세요.",
    greenFlag: "그린 플래그",
    harnessFail: "하네스 실패",
    harnessOk: "하네스 정상",
    initBlocked: "TRACK 초기화 차단",
    initCreated: "TRACK 초기화 생성됨",
    initDryRun: "TRACK 초기화 미리보기",
    initPlan: "TRACK 초기화 계획",
    issues: "문제",
    lap: "랩",
    mode: "모드",
    next: "다음",
    nextHeader: "TRACK // 다음 작업",
    nextMap: "다음: track map",
    nextStatus: "다음: track status",
    plan: "계획",
    project: "프로젝트",
    recent: "최근",
    redFlag: "레드 플래그",
    roadmap: "로드맵",
    runtime: "런타임",
    signal: "신호",
    sources: "소스",
    state: "상태",
    statusHeader: "TRACK // 드라이버 HUD",
    template: "템플릿",
    title: "제목",
    trackBootstrapDraft: "TRACK 부트스트랩 초안",
    trackBootstrapWriteBlocked: "TRACK 부트스트랩 쓰기 차단",
    trackBootstrapWriteDryRun: "TRACK 부트스트랩 쓰기 미리보기",
    trackBootstrapWritePlan: "TRACK 부트스트랩 쓰기 계획",
    trackBootstrapWritten: "TRACK 부트스트랩 작성됨",
    warnings: "경고",
    worksheet: "워크시트",
    writeNext: "다음: .track 파일을 만들려면 --write로 다시 실행하세요.",
    yellowFlag: "옐로 플래그",
  },
};

export function resolveTrackLanguage(raw?: string | null, env: NodeJS.ProcessEnv = process.env): TrackLanguage {
  return normalizeTrackLanguage(raw ?? env.TRACK_LANG ?? "en");
}

export function normalizeTrackLanguage(raw: string | null | undefined): TrackLanguage {
  const normalized = (raw ?? "en").trim().toLowerCase().replace("_", "-");
  if (normalized === "ko" || normalized === "ko-kr" || normalized === "kor" || normalized === "korean") {
    return "ko";
  }
  if (normalized === "en" || normalized === "en-us" || normalized === "en-gb" || normalized === "english") {
    return "en";
  }
  throw new Error("`--lang` must be one of en or ko.");
}

export function renderLanguage(options?: TrackLanguageOptions): TrackLanguage {
  return options?.lang ?? "en";
}

export function msg(lang: TrackLanguage, key: MessageKey): string {
  return MESSAGES[lang][key];
}

export function field(lang: TrackLanguage, key: MessageKey): string {
  return padRight(msg(lang, key).toUpperCase(), 8);
}

export function healthSignal(health: TrackHealth, lang: TrackLanguage): string {
  if (health === "red") {
    return msg(lang, "redFlag");
  }
  if (health === "yellow") {
    return msg(lang, "yellowFlag");
  }
  return msg(lang, "greenFlag");
}

function padRight(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}
