#!/usr/bin/env python3
import json
import sys
import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

# パス定義 (自身の配置場所からの相対パス)
BRAIN_DIR = Path(__file__).parent.parent
TRANSCRIPT_FILE = BRAIN_DIR / ".system_generated" / "logs" / "transcript.jsonl"
STATUS_FILE = BRAIN_DIR / "system_status.md"

# トークン制限の設定 (仮定値)
LIMIT_5H = 500000       # 5時間制限: 50万トークン
LIMIT_WEEK = 5000000    # 週間制限: 500万トークン

def is_agy_active_in_current_pane() -> bool:
    """現在アクティブな tmux ペイン内で agy が実行中かどうかを確認する。"""
    try:
        # 現在アクティブなペインの PID を取得
        res = subprocess.run(["tmux", "display-message", "-p", "#{pane_pid}"],
                             capture_output=True, text=True, check=True)
        pane_pid_str = res.stdout.strip()
        if not pane_pid_str.isdigit():
            return False
        pane_pid = int(pane_pid_str)
    except Exception:
        # tmux の外で実行されている、あるいはエラーの場合は False
        return False

    # プロセスツリーを構築し、pane_pid の子孫プロセスに agy があるか確認
    ppid_map = {} # ppid -> list of pids
    pid_to_name = {} # pid -> name
    
    for pid_str in os.listdir("/proc"):
        if not pid_str.isdigit():
            continue
        pid = int(pid_str)
        try:
            with open(f"/proc/{pid}/stat", "r") as f:
                stat = f.read()
                rparen_idx = stat.rfind(")")
                if rparen_idx != -1:
                    name = stat[stat.find("(")+1:rparen_idx]
                    parts = stat[rparen_idx+2:].split()
                    ppid = int(parts[1])
                    ppid_map.setdefault(ppid, []).append(pid)
                    pid_to_name[pid] = name
        except (IOError, IndexError, ValueError):
            continue

    # pane_pid から始まる深さ優先探索 (DFS)
    stack = [pane_pid]
    visited = set()
    while stack:
        curr = stack.pop()
        if curr in visited:
            continue
        visited.add(curr)
        
        name = pid_to_name.get(curr, "")
        if name == "agy" or "agy" in name:
            return True
            
        # 子プロセスをスタックに追加
        for child in ppid_map.get(curr, []):
            stack.append(child)
            
    return False

def estimate_tokens(text: str) -> int:
    """文字数から簡易的にトークン数を見積もる。"""
    if not text:
        return 0
    ascii_count = 0
    multi_count = 0
    for char in text:
        if ord(char) < 128:
            ascii_count += 1
        else:
            multi_count += 1
    return int(ascii_count * 0.35 + multi_count * 1.5)

def parse_iso_time(time_str: str) -> datetime:
    """ISO8601 時間文字列を datetime オブジェクトに変換 (タイムゾーン対応)。"""
    if time_str.endswith("Z"):
        time_str = time_str[:-1] + "+00:00"
    return datetime.fromisoformat(time_str)

def make_progress_bar(percent: float) -> str:
    """パーセンテージから進捗バーを生成する。"""
    percent = max(0.0, min(100.0, percent))
    filled = int(round(percent / 10.0))
    empty = 10 - filled
    return "[" + "█" * filled + "░" * empty + "]"

def calculate_usage():
    # tmux 用の出力要求時、agy がアクティブでなければ何も出力せず終了
    if "--tmux" in sys.argv and not is_agy_active_in_current_pane():
        print("")
        sys.exit(0)

    if not TRANSCRIPT_FILE.exists():
        print(f"Error: Transcript file not found at {TRANSCRIPT_FILE}", file=sys.stderr)
        sys.exit(1)

    steps = []
    with open(TRANSCRIPT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                steps.append(json.loads(line))

    if not steps:
        print("No steps found in transcript.", file=sys.stderr)
        return

    # 各ステップのサイズを見積もる
    step_tokens = []
    for step in steps:
        content = step.get("content", "") or ""
        thinking = step.get("thinking", "") or ""
        
        tool_calls_str = ""
        if "tool_calls" in step and step["tool_calls"]:
            tool_calls_str = json.dumps(step["tool_calls"])
            
        text = content + thinking + tool_calls_str
        step_tokens.append(estimate_tokens(text))

    # 各ステップのユニークなトークン数を単純集計する（重複加算を排除）
    model_consumptions = []  # tuple of (timestamp, tokens)
    for idx, step in enumerate(steps):
        tokens = step_tokens[idx]
        time_str = step.get("created_at")
        if time_str:
            dt = parse_iso_time(time_str)
            model_consumptions.append((dt, tokens))

    if not model_consumptions:
        model_consumptions.append((datetime.now(timezone.utc), 0))

    # 最新のステップの時間を基準時間とする
    latest_time = max(item[0] for item in model_consumptions)
    
    # 5時間以内と1週間以内の使用量を集計
    used_5h = 0
    used_week = 0
    
    cutoff_5h = latest_time - timedelta(hours=5)
    cutoff_week = latest_time - timedelta(days=7)
    
    for dt, tokens in model_consumptions:
        if dt >= cutoff_5h:
            used_5h += tokens
        if dt >= cutoff_week:
            used_week += tokens

    # 比率計算
    LIMIT_CONTEXT = 1000000  # 最大コンテキスト：100万トークン
    ratio_5h = (used_5h / LIMIT_5H) * 100
    ratio_week = (used_week / LIMIT_WEEK) * 100
    
    current_context = sum(step_tokens)
    ratio_context = (current_context / LIMIT_CONTEXT) * 100

    if "--tmux" in sys.argv:
        # tmux ステータスバー用にコンパクトに出力
        print(f"Token 5h:{ratio_5h:.1f}% Wk:{ratio_week:.1f}% Ctx:{ratio_context:.1f}%")
        return

    bar_5h = make_progress_bar(ratio_5h)
    bar_week = make_progress_bar(ratio_week)
    bar_context = make_progress_bar(ratio_context)

    # ステータス情報の作成
    status_content = (
        "| 维度 | 使用比例 | 可视化状态栏 | 估计使用量 / 限制值 |\n"
        "| :--- | :---: | :--- | :--- |\n"
        f"| **最近 5 小时** | {ratio_5h:.1f}% | `{bar_5h}` | `{used_5h:,}` / `{LIMIT_5H:,}` Tokens |\n"
        f"| **最近 1 周 (7天)** | {ratio_week:.1f}% | `{bar_week}` | `{used_week:,}` / `{LIMIT_WEEK:,}` Tokens |\n"
        f"| **当前上下文窗口** | {ratio_context:.1f}% | `{bar_context}` | `{current_context:,}` / `{LIMIT_CONTEXT:,}` Tokens |\n"
    )

    # system_status.md の更新
    if not STATUS_FILE.exists():
        print(f"Error: Status file not found at {STATUS_FILE}", file=sys.stderr)
        sys.exit(1)

    status_text = STATUS_FILE.read_text(encoding="utf-8")
    
    start_marker = "<!-- TOKEN_STATUS_START -->"
    end_marker = "<!-- TOKEN_STATUS_END -->"
    
    start_idx = status_text.find(start_marker)
    end_idx = status_text.find(end_marker)
    
    if start_idx == -1 or end_idx == -1:
        print("Error: Markers not found in status file.", file=sys.stderr)
        sys.exit(1)
        
    new_text = (
        status_text[:start_idx + len(start_marker)] + "\n" +
        status_content +
        status_text[end_idx:]
    )
    
    STATUS_FILE.write_text(new_text, encoding="utf-8")
    print("Successfully updated token usage status bar!")

if __name__ == "__main__":
    calculate_usage()
