"use client";

import { useEffect, useState, useCallback } from "react";
import "./grit.css";

const MONTH_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DAY_SHORT_ES = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

const DAY_LONG_ES = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
];

/** Devuelve el lunes de la semana que contiene `date` (Date local). */
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom … 6=Sáb
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formatea Date → "YYYY-MM-DD" en hora local. */
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Devuelve los 7 días (Date) de la semana empezando en monday. */
function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Formatea "2026-03-23" → day-of-week index 0=Lun, 1=Mar… */
function dayIndex(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

export default function GritPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Programa activo (índice)
  const [programIdx, setProgramIdx] = useState(0);

  // Lunes de la semana visible
  const [weekMonday, setWeekMonday] = useState(() => getMondayOf(new Date()));

  // Día seleccionado (string "YYYY-MM-DD")
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));

  // Cargar JSON
  useEffect(() => {
    fetch("/grit-data.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const programs = data?.programs ?? [];
  const activeProgram = programs[programIdx] ?? null;
  const days = data?.days?.[activeProgram] ?? {};

  // Cuando cambia el programa, mantener la semana y el día seleccionado
  const weekDays = getWeekDays(weekMonday);
  const todayStr = toDateStr(new Date());

  const prevWeek = useCallback(() => {
    setWeekMonday((m) => {
      const d = new Date(m);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const nextWeek = useCallback(() => {
    setWeekMonday((m) => {
      const d = new Date(m);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  // Etiqueta del mes/semana en la nav
  const monthLabel = (() => {
    const months = new Set(weekDays.map((d) => d.getMonth()));
    if (months.size === 1) {
      const d = weekDays[0];
      return `${MONTH_ES[d.getMonth()]} ${d.getFullYear()}`;
    }
    const d0 = weekDays[0];
    const d6 = weekDays[6];
    if (d0.getFullYear() === d6.getFullYear()) {
      return `${MONTH_ES[d0.getMonth()]} – ${MONTH_ES[d6.getMonth()]} ${d6.getFullYear()}`;
    }
    return `${MONTH_ES[d0.getMonth()]} ${d0.getFullYear()} – ${MONTH_ES[d6.getMonth()]} ${d6.getFullYear()}`;
  })();

  // Etiqueta del día seleccionado
  const selectedDayLabel = (() => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate + "T00:00:00");
    const idx = dayIndex(selectedDate);
    return `${DAY_LONG_ES[idx]}, ${d.getDate()} ${MONTH_ES[d.getMonth()]}`;
  })();

  const selectedHtml = selectedDate ? days[selectedDate] : null;

  return (
    <div className="grit-app">
      {/* Header */}
      <header className="grit-header">
        <div className="grit-title">GRIT Programming</div>
        <div className="program-tabs">
          {loading ? (
            <button className="program-tab active">Cargando…</button>
          ) : programs.length === 0 ? (
            <button className="program-tab active">Sin datos</button>
          ) : (
            programs.map((prog, i) => (
              <button
                key={prog}
                className={`program-tab${i === programIdx ? " active" : ""}`}
                onClick={() => setProgramIdx(i)}
              >
                {prog.replace("GRIT Program ", "GRIT ")}
              </button>
            ))
          )}
        </div>
      </header>

      {/* Week nav */}
      <div className="week-nav">
        <button className="week-nav-btn" onClick={prevWeek} aria-label="Semana anterior">
          ‹
        </button>
        <span className="week-label">{monthLabel}</span>
        <button className="week-nav-btn" onClick={nextWeek} aria-label="Semana siguiente">
          ›
        </button>
      </div>

      {/* Calendar row */}
      <div className="calendar-week">
        {weekDays.map((d, i) => {
          const dateStr = toDateStr(d);
          const hasWod = !!days[dateStr];
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={[
                "day-pill",
                isSelected ? "selected" : "",
                !hasWod ? "no-wod" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setSelectedDate(dateStr);
                // Si el día no está en la semana visible, mover la semana
                setWeekMonday(getMondayOf(d));
              }}
            >
              <span className="day-label">{DAY_SHORT_ES[i]}</span>
              <span className="day-num">{d.getDate()}</span>
              {isToday && !isSelected && <span className="day-dot" />}
            </div>
          );
        })}
      </div>

      {/* WOD area */}
      <div className="wod-area">
        {loading && <div className="loading-state">Cargando programación…</div>}

        {error && (
          <div className="empty-state">
            <span className="empty-icon">⚠️</span>
            <span className="empty-text">No se pudo cargar la programación</span>
            <span className="empty-sub">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {selectedDate && (
              <div className="selected-day-label">{selectedDayLabel}</div>
            )}

            {selectedHtml ? (
              <div className="wod-card">
                <div
                  className="wod-html"
                  dangerouslySetInnerHTML={{ __html: selectedHtml }}
                />
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🏋️</span>
                <span className="empty-text">
                  No hay entrenamiento programado para este día
                </span>
                <span className="empty-sub">
                  Selecciona otro día o vuelve más tarde
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
