// src/components/BalloonGame.jsx
import React, { useEffect, useState, useRef } from "react";
import "../styles/balloongame.css";

/* Utility helpers */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDecimal(min, max) { const v = (Math.random() * (max - min)) + min; return parseFloat(v.toFixed(2)); }

/* maybeDecimal: returns a number either integer or decimal based on probability */
function maybeDecimal(min, max, decimalProb = 0.1) {
  const useDecimal = Math.random() < decimalProb;
  return useDecimal ? randDecimal(min, max) : randInt(min, max);
}

/* Expression generator — accepts decimal probability */
function generateExpression(operatorSet = "mix", decimalProb = 0.1) {
  const ops = operatorSet === "mix" ? ["+", "-", "*", "/"] :
              operatorSet === "addsub" ? ["+", "-"] : ["+"];

  const op = ops[Math.floor(Math.random() * ops.length)];

  if (op === "+") {
    const a = maybeDecimal(1, 50, decimalProb);
    const b = maybeDecimal(1, 50, decimalProb);
    const val = parseFloat((a + b).toFixed(2));
    const expr = `${a % 1 === 0 ? a.toFixed(0) : a} + ${b % 1 === 0 ? b.toFixed(0) : b}`;
    return { expr, value: val };
  }

  if (op === "-") {
    let a = maybeDecimal(1, 60, decimalProb);
    let b = maybeDecimal(0, a, decimalProb);
    const val = parseFloat((a - b).toFixed(2));
    const expr = `${a % 1 === 0 ? a.toFixed(0) : a} - ${b % 1 === 0 ? b.toFixed(0) : b}`;
    return { expr, value: val };
  }

  if (op === "*") {
    const a = maybeDecimal(1, 12, decimalProb);
    const b = maybeDecimal(1, 12, decimalProb);
    const val = parseFloat((a * b).toFixed(2));
    const expr = `${a % 1 === 0 ? a.toFixed(0) : a} × ${b % 1 === 0 ? b.toFixed(0) : b}`;
    return { expr, value: val };
  }

  if (op === "/") {
    const a = maybeDecimal(1, 100, decimalProb);
    let b = maybeDecimal(1, 12, decimalProb);
    if (b === 0) b = 1;
    const val = parseFloat((a / b).toFixed(2));
    const expr = `${a % 1 === 0 ? a.toFixed(0) : a} ÷ ${b % 1 === 0 ? b.toFixed(0) : b}`;
    return { expr, value: val };
  }

  return { expr: "0", value: 0 };
}

/* Shuffle */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* MAIN COMPONENT */
export default function BalloonGame() {

  const DEFAULT_BALLOON_COUNT = 5;
  const DEFAULT_ROUND_SECONDS = 25;
  const DEFAULT_OPS = "mix";
  const DEFAULT_DECIMAL_FREQ = 0.1; // 10% (rare)

  const [balloonCount, setBalloonCount] = useState(DEFAULT_BALLOON_COUNT);
  const [roundSeconds, setRoundSeconds] = useState(DEFAULT_ROUND_SECONDS);
  const [ops, setOps] = useState(DEFAULT_OPS);

  // decimal frequency state (probability from 0 to 1)
  const [decimalFreq, setDecimalFreq] = useState(DEFAULT_DECIMAL_FREQ);

  const [balloons, setBalloons] = useState([]);
  const [sorted, setSorted] = useState([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [roundActive, setRoundActive] = useState(false);
  const [message, setMessage] = useState("");
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("mb_highscore") || 0));

  const timerRef = useRef(null);

  function startRound() {
    setMessage("");
    const arr = [];
    for (let i = 0; i < balloonCount; i++) {
      arr.push(generateExpression(ops, decimalFreq));
    }
    const sortedList = [...arr].sort((a, b) => a.value - b.value);
    const display = shuffle([...arr]);
    const colors = ["blue", "green", "purple", "yellow"];

    setBalloons(display.map((it, idx) => ({
      ...it,
      id: idx,
      popped: false,
      color: colors[idx % colors.length]
    })));

    setSorted(sortedList);
    setNextIndex(0);
    setTimeLeft(roundSeconds);
    setRoundActive(true);

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
  }

  function endRound(reason) {
    clearInterval(timerRef.current);
    setRoundActive(false);

    if (reason === "success") {
        setMessage("Round cleared!");
    }
    else if (reason === "time") {
        setMessage("Time's up! -1 life");
        setLives(l => Math.max(0, l - 1));
    }
    else if (reason === "lives") {
        setMessage("Game Over! Restarting...");
        
        // RESET score & lives after game over
        setTimeout(() => {
        setScore(0);
        setLives(3);
        setMessage("");

        // optional: auto-start a new round
        // startRound();

        }, 1500);
    }
    else if (reason === "allpopped") {
        setMessage("All popped — well done!");
    }

    // Update high score
    setHighScore(hs => {
        const max = Math.max(hs, score);
        localStorage.setItem("mb_highscore", String(max));
        return max;
    });
    }


  useEffect(() => {
    if (timeLeft <= 0 && roundActive) endRound("time");
  }, [timeLeft, roundActive]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  function onBalloonClick(id) {
    if (!roundActive) return;
    const b = balloons.find(x => x.id === id);
    if (!b || b.popped) return;

    const expected = sorted[nextIndex].value;

    if (b.value === expected) {
      setScore(s => s + 10);
      setBalloons(prev => prev.map(x => x.id === id ? { ...x, popped: true } : x));
      setNextIndex(i => {
        const newI = i + 1;
        if (newI === sorted.length) endRound("allpopped");
        return newI;
      });
      setMessage(`Correct — ${b.expr}`);
    } else {
      setLives(l => {
        const newL = Math.max(0, l - 1);
        if (newL === 0) endRound("lives");
        setMessage(`Wrong — Next should be ${expected}`);
        return newL;
      });
      highlightCorrect(expected);
    }
  }

  function highlightCorrect(expected) {
    const node = document.querySelector(`.bb-button[data-value='${expected}']`);
    if (!node) return;
    node.classList.add("bb-highlight");
    setTimeout(() => node.classList.remove("bb-highlight"), 700);
  }

  const expectedValue = sorted[nextIndex] ? sorted[nextIndex].value : null;

  return (
    <div className="bb-root">
      <h2>Math Balloon — Mixed Integers & Rare Decimals</h2>

      <div className="bb-controls">
        <div className="bb-left">
          <label>
            Count:
            <select value={balloonCount} onChange={e => setBalloonCount(Number(e.target.value))}>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>

          <label>
            Time:
            <select value={roundSeconds} onChange={e => { setRoundSeconds(Number(e.target.value)); setTimeLeft(Number(e.target.value)); }}>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={30}>30</option>
            </select>
          </label>

          <label>
            Decimal frequency:
            <select value={decimalFreq} onChange={e => setDecimalFreq(Number(e.target.value))}>
              <option value={0}>Never (0%)</option>
              <option value={0.1}>Rare — 1 in 10 (10%)</option>
              <option value={0.2}>Occasional — 1 in 5 (20%)</option>
              <option value={0.5}>Half (50%)</option>
              <option value={1}>Always (100%)</option>
            </select>
          </label>

          <label>
            Ops:
            <select value={ops} onChange={e => setOps(e.target.value)}>
              <option value="add">+ only</option>
              <option value="addsub">+ / -</option>
              <option value="mix">+ - × ÷</option>
            </select>
          </label>

          <button onClick={startRound} className="bb-start">Start</button>
        </div>

        <div className="bb-stats">
          <div>Score: <strong>{score}</strong></div>
          <div>Lives: <strong>{lives}</strong></div>
          <div>Time: <strong>{timeLeft}s</strong></div>
          <div>Expected: <strong>{expectedValue ?? "—"}</strong></div>
          <div>Highscore: <strong>{highScore}</strong></div>
        </div>
      </div>

      <div className="bb-field" role="region" aria-live="polite">
        {balloons.map(b => (
          <button
            key={b.id}
            data-value={b.value}
            data-color={b.color}
            className={`bb-button ${b.popped ? "popped" : ""}`}
            disabled={b.popped || !roundActive}
            onClick={() => onBalloonClick(b.id)}
            aria-label={b.expr}
          >
            <div className="bb-expr">{b.expr}</div>
            <div className="bb-kicker">tap to pop</div>
            <div className="bb-string" aria-hidden />
          </button>
        ))}
      </div>

      <div className="bb-msg">{message}</div>
    </div>
  );
}
