// components/dashboard/calander/changeDate/ChangeDateModal.js
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import LayerModal from "@/components/LayerModal";
import { useCT, getModeStyle } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import { safeId, fetchMonthCapacity, ymdLocal } from "./changeDateUtils";

import ActionSelectStep from "./ActionSelectStep";
import GroupSelectStep from "./GroupSelectStep";
import DatePickerStep from "./DatePickerStep";
import MovePreviewStep from "./MovePreviewStep";

/*
  STEPS:
  1. ACTION_SELECT   → What to change?
  2. GROUP_SELECT    → Which members? (only for COUPLE/FAMILY)
  3. DATE_PICK_1     → Pick new date (meeting or diksha)
  4. DATE_PICK_2     → Pick second date (only CHANGE_BOTH)
  5. PREVIEW         → Review + confirm
*/

export default function ChangeDateModal({
  open,
  onClose,
  mode,
  container,
  assignment,
  groupMembers,
  pushing,
  onExecuteMove,
  onShowWarn,
  requestCommit,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);
  const ms = getModeStyle(mode, c);

  /* ── Step state ── */
  const [step, setStep] = useState("ACTION_SELECT");
  const [action, setAction] = useState(null);

  /* ── Group selection ── */
  const [moveMembers, setMoveMembers] = useState("ALL");

  /* ── Date selections ── */
  const [newMeetingDate, setNewMeetingDate] = useState(null);
  const [newOccupiedDate, setNewOccupiedDate] = useState(null);

  /* ── Reason ── */
  const [moveReason, setMoveReason] = useState(null);

  /* ── Capacity cache ── */
  const [capacityFrom, setCapacityFrom] = useState(null);
  const [capacityTo, setCapacityTo] = useState(null);

  const isGroup =
    (assignment?.kind === "COUPLE" || assignment?.kind === "FAMILY") &&
    assignment?.pairId &&
    groupMembers &&
    groupMembers.length > 1;

  const containerDate = container?.date || assignment?._containerDate || "—";
  const occupiedDate = assignment?.occupiedDate || null;
  const isBypass =
    assignment?.bypass === true || occupiedDate === "BYPASS";

  /* ── Group size calc ── */
  const groupSize = useMemo(() => {
    if (moveMembers === "ALL") return groupMembers?.length || 1;
    if (moveMembers === "SINGLE") return 1;
    if (Array.isArray(moveMembers)) return moveMembers.length;
    return 1;
  }, [moveMembers, groupMembers]);

  /* ── Is detach ── */
  const isDetach = useMemo(() => {
    if (!isGroup) return false;
    return groupSize < (groupMembers?.length || 0);
  }, [isGroup, groupSize, groupMembers]);

  /* ── Reset on open ── */
  useEffect(() => {
    if (open) {
      setStep("ACTION_SELECT");
      setAction(null);
      setMoveMembers("ALL");
      setNewMeetingDate(null);
      setNewOccupiedDate(null);
      setMoveReason(null);
      setCapacityFrom(null);
      setCapacityTo(null);
    }
  }, [open]);

  /* ── Load capacity for source container ── */
  const loadSourceCapacity = useCallback(async () => {
    if (!containerDate || containerDate === "—") return;
    const [y, m] = containerDate.split("-").map(Number);
    const caps = await fetchMonthCapacity(y - 1, m - 1, mode);
    // Fix: month is 0-indexed for fetchMonthCapacity but date has 1-indexed month
    const capsFixed = await fetchMonthCapacity(
      Number(containerDate.split("-")[0]),
      Number(containerDate.split("-")[1]) - 1,
      mode
    );
    setCapacityFrom(capsFixed[containerDate] || null);
  }, [containerDate, mode]);

  /* ── Load capacity for target date ── */
  const loadTargetCapacity = useCallback(
    async (dateStr, targetMode) => {
      if (!dateStr) return;
      const [y, m] = dateStr.split("-").map(Number);
      const caps = await fetchMonthCapacity(y, m - 1, targetMode || mode);
      setCapacityTo(caps[dateStr] || null);
    },
    [mode]
  );

  /* ── Step titles ── */
  const stepTitle = useMemo(() => {
    switch (step) {
      case "ACTION_SELECT":
        return "📅 Change Schedule";
      case "GROUP_SELECT":
        return "👥 Select Members";
      case "DATE_PICK_1":
        return action === "CHANGE_OCCUPIED_DATE"
          ? "🔱 Pick Diksha Date"
          : action === "CHANGE_DIKSHA_DATE"
          ? "🔱 Pick Diksha Date"
          : "📅 Pick Date";
      case "DATE_PICK_2":
        return "🔱 Pick Diksha Date";
      case "PREVIEW":
        return "🔄 Confirm Move";
      default:
        return "📅 Change Date";
    }
  }, [step, action]);

  const stepSub = useMemo(() => {
    switch (step) {
      case "ACTION_SELECT":
        return "What do you want to change?";
      case "GROUP_SELECT":
        return "Choose members to move";
      case "DATE_PICK_1":
      case "DATE_PICK_2":
        return "Select new date";
      case "PREVIEW":
        return "Review and confirm";
      default:
        return "";
    }
  }, [step]);

  /* ═══════════════════════════════════
     STEP HANDLERS
     ═══════════════════════════════════ */

  function handleActionSelect(actionKey) {
    setAction(actionKey);

    // If group, go to group select
    if (isGroup) {
      setStep("GROUP_SELECT");
      return;
    }

    // Else go directly to date picker
    setStep("DATE_PICK_1");
  }

  function handleGroupSelect(members) {
    setMoveMembers(members);
    setStep("DATE_PICK_1");
  }

  /* ── Date pick 1 complete ── */
  async function handleDatePick1(dateStr) {
    if (action === "CHANGE_MEETING_DATE") {
      setNewMeetingDate(dateStr);
      await loadSourceCapacity();
      await loadTargetCapacity(dateStr, "MEETING");
      setStep("PREVIEW");
    } else if (action === "CHANGE_OCCUPIED_DATE") {
      setNewOccupiedDate(dateStr);
      await loadSourceCapacity();
      await loadTargetCapacity(dateStr, "DIKSHA");
      setStep("PREVIEW");
    } else if (action === "CHANGE_DIKSHA_DATE") {
      setNewMeetingDate(dateStr);
      await loadSourceCapacity();
      await loadTargetCapacity(dateStr, "DIKSHA");
      setStep("PREVIEW");
    } else if (action === "CHANGE_BOTH_DATES") {
      setNewMeetingDate(dateStr);
      await loadTargetCapacity(dateStr, "MEETING");
      setStep("DATE_PICK_2");
    }
  }

  /* ── Date pick 2 complete (both dates) ── */
  async function handleDatePick2(dateStr) {
    setNewOccupiedDate(dateStr);
    await loadSourceCapacity();
    await loadTargetCapacity(dateStr, "DIKSHA");
    setStep("PREVIEW");
  }

  /* ── Final confirm ── */
  async function handleConfirmMove() {
    if (!assignment?._id || !container?._id) return;

    const cId = safeId(container._id);
    const aId = safeId(assignment._id);
    if (!cId || !aId) return;

    // Determine what's changing
    const isDateChange =
      action === "CHANGE_MEETING_DATE" ||
      action === "CHANGE_DIKSHA_DATE" ||
      action === "CHANGE_BOTH_DATES";
    const isOccupyChange =
      action === "CHANGE_OCCUPIED_DATE" ||
      action === "CHANGE_BOTH_DATES";

    // Build title for commit
    let commitTitle = "Move Card";
    if (action === "CHANGE_MEETING_DATE")
      commitTitle = `Move Meeting: ${containerDate} → ${newMeetingDate}`;
    else if (action === "CHANGE_OCCUPIED_DATE")
      commitTitle = `Change Occupy: ${occupiedDate} → ${newOccupiedDate}`;
    else if (action === "CHANGE_DIKSHA_DATE")
      commitTitle = `Move Diksha: ${containerDate} → ${newMeetingDate}`;
    else if (action === "CHANGE_BOTH_DATES")
      commitTitle = `Move Both: M:${newMeetingDate} O:${newOccupiedDate}`;

    const commitMessage = await requestCommit({
      title: commitTitle,
      subtitle: isDetach
        ? `Detaching ${groupSize} member(s)`
        : groupSize > 1
        ? `Moving ${groupSize} members`
        : undefined,
      preset: commitTitle,
    }).catch(() => null);

    if (!commitMessage) return;

    // Build API payload
    const payload = {
      commitMessage,
      moveReason: moveReason || undefined,
      moveMembers:
        isGroup ? moveMembers : undefined,
      expectedUpdatedAt: assignment.updatedAt
        ? new Date(assignment.updatedAt).toISOString()
        : undefined,
    };

    if (isDateChange && newMeetingDate) {
      payload.newDate = newMeetingDate;
    }
    if (isOccupyChange && newOccupiedDate) {
      payload.newOccupiedDate = newOccupiedDate;
    }

    // Execute
    await onExecuteMove(cId, aId, payload);
  }

  /* ── Back navigation ── */
  function handleBack() {
    switch (step) {
      case "GROUP_SELECT":
        setStep("ACTION_SELECT");
        setMoveMembers("ALL");
        break;
      case "DATE_PICK_1":
        if (isGroup) {
          setStep("GROUP_SELECT");
        } else {
          setStep("ACTION_SELECT");
        }
        setNewMeetingDate(null);
        setNewOccupiedDate(null);
        break;
      case "DATE_PICK_2":
        setStep("DATE_PICK_1");
        setNewOccupiedDate(null);
        break;
      case "PREVIEW":
        if (action === "CHANGE_BOTH_DATES" && newOccupiedDate) {
          setStep("DATE_PICK_2");
          setNewOccupiedDate(null);
        } else {
          setStep("DATE_PICK_1");
          setNewMeetingDate(null);
          setNewOccupiedDate(null);
        }
        break;
      default:
        onClose();
    }
  }

  /* ── Picker mode mapping ── */
  function getPickerMode1() {
    if (action === "CHANGE_MEETING_DATE") return "CHANGE_MEETING_DATE";
    if (action === "CHANGE_OCCUPIED_DATE") return "CHANGE_OCCUPIED_DATE";
    if (action === "CHANGE_DIKSHA_DATE") return "CHANGE_DIKSHA_DATE";
    if (action === "CHANGE_BOTH_DATES") return "CHANGE_BOTH_MEETING";
    return "CHANGE_MEETING_DATE";
  }

  /* ── Effective dates for preview ── */
  const previewFromDate = containerDate;
  const previewToDate = useMemo(() => {
    if (action === "CHANGE_MEETING_DATE" || action === "CHANGE_DIKSHA_DATE")
      return newMeetingDate || containerDate;
    if (action === "CHANGE_BOTH_DATES")
      return newMeetingDate || containerDate;
    return containerDate;
  }, [action, newMeetingDate, containerDate]);

  const previewFromOccupied = occupiedDate;
  const previewToOccupied = useMemo(() => {
    if (action === "CHANGE_OCCUPIED_DATE" || action === "CHANGE_BOTH_DATES")
      return newOccupiedDate || occupiedDate;
    return occupiedDate;
  }, [action, newOccupiedDate, occupiedDate]);

  /* ── Enriched assignment ── */
  const enrichedAssignment = useMemo(() => {
    if (!assignment) return null;
    return {
      ...assignment,
      _containerDate: containerDate,
    };
  }, [assignment, containerDate]);

  if (!open || !assignment) return null;

  return (
    <LayerModal
      open={open}
      layerName="ChangeDate"
      title={stepTitle}
      sub={stepSub}
      onClose={() => {
        onClose();
      }}
      maxWidth="max-w-2xl"
    >
      <div
        style={{
          borderRadius: 22,
          border: `1px solid ${c.surfaceBorder}`,
          background: c.surfaceBg,
          padding: 16,
        }}
      >
        {/* Step indicator */}
        <StepIndicator step={step} action={action} c={c} ms={ms} />

        <div style={{ marginTop: 14 }}>
          {/* STEP 1: Action Select */}
          {step === "ACTION_SELECT" && (
            <ActionSelectStep
              mode={mode}
              assignment={enrichedAssignment}
              groupMembers={groupMembers}
              onSelectAction={handleActionSelect}
              onClose={onClose}
            />
          )}

          {/* STEP 2: Group Select */}
          {step === "GROUP_SELECT" && (
            <GroupSelectStep
              assignment={assignment}
              groupMembers={groupMembers}
              onSelectMembers={handleGroupSelect}
              onBack={handleBack}
            />
          )}

          {/* STEP 3: Date Pick 1 */}
          {step === "DATE_PICK_1" && (
            <DatePickerStep
              mode={mode}
              pickerMode={getPickerMode1()}
              currentDate={
                action === "CHANGE_OCCUPIED_DATE"
                  ? occupiedDate
                  : containerDate
              }
              occupiedDate={
                action === "CHANGE_MEETING_DATE" ||
                action === "CHANGE_BOTH_DATES"
                  ? occupiedDate
                  : null
              }
              containerDate={
                action === "CHANGE_OCCUPIED_DATE"
                  ? containerDate
                  : null
              }
              groupSize={groupSize}
              selectedDate={
                action === "CHANGE_OCCUPIED_DATE"
                  ? newOccupiedDate
                  : newMeetingDate
              }
              onSelect={(d) => {
                if (action === "CHANGE_OCCUPIED_DATE")
                  setNewOccupiedDate(d);
                else setNewMeetingDate(d);
              }}
              onConfirm={() => {
                const dateStr =
                  action === "CHANGE_OCCUPIED_DATE"
                    ? newOccupiedDate
                    : newMeetingDate;
                if (!dateStr) return;
                handleDatePick1(dateStr);
              }}
              onBack={handleBack}
            />
          )}

          {/* STEP 4: Date Pick 2 (Both dates) */}
          {step === "DATE_PICK_2" && (
            <DatePickerStep
              mode={mode}
              pickerMode="CHANGE_BOTH_OCCUPY"
              currentDate={occupiedDate}
              occupiedDate={null}
              containerDate={newMeetingDate || containerDate}
              groupSize={groupSize}
              selectedDate={newOccupiedDate}
              onSelect={setNewOccupiedDate}
              onConfirm={() => {
                if (!newOccupiedDate) return;
                handleDatePick2(newOccupiedDate);
              }}
              onBack={handleBack}
            />
          )}

          {/* STEP 5: Preview */}
          {step === "PREVIEW" && (
            <MovePreviewStep
              mode={mode}
              fromDate={previewFromDate}
              toDate={previewToDate}
              fromOccupied={previewFromOccupied}
              toOccupied={previewToOccupied}
              assignment={assignment}
              groupMembers={groupMembers || [assignment]}
              moveMembers={moveMembers}
              capacityFrom={capacityFrom}
              capacityTo={capacityTo}
              groupSize={groupSize}
              isDetach={isDetach}
              moveReason={moveReason}
              onReasonChange={setMoveReason}
              pushing={pushing}
              onConfirm={handleConfirmMove}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </LayerModal>
  );
}

/* ═══════════════════════════════════
   STEP INDICATOR
   ═══════════════════════════════════ */
function StepIndicator({ step, action, c, ms }) {
  const steps = useMemo(() => {
    const base = [
      { key: "ACTION_SELECT", label: "Select", icon: "1" },
      { key: "GROUP_SELECT", label: "Members", icon: "2" },
      { key: "DATE_PICK_1", label: "Date", icon: "3" },
    ];

    if (action === "CHANGE_BOTH_DATES") {
      base.push({ key: "DATE_PICK_2", label: "Occupy", icon: "4" });
      base.push({ key: "PREVIEW", label: "Confirm", icon: "5" });
    } else {
      base.push({ key: "PREVIEW", label: "Confirm", icon: "4" });
    }

    return base;
  }, [action]);

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-1" style={{ overflow: "auto" }}>
      {steps.map((s, idx) => {
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;

        return (
          <div
            key={s.key}
            className="flex items-center gap-1"
            style={{ flexShrink: 0 }}
          >
            {idx > 0 && (
              <div
                style={{
                  width: 12,
                  height: 1,
                  background: isDone ? ms.accent : c.divider,
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 10,
                background: isActive
                  ? ms.bg
                  : isDone
                  ? c.previewToBg
                  : "transparent",
                border: `1px solid ${
                  isActive
                    ? ms.border
                    : isDone
                    ? c.previewToBorder
                    : c.divider
                }`,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  fontWeight: 800,
                  background: isActive
                    ? ms.accent
                    : isDone
                    ? c.previewImpactOk
                    : c.panelBg,
                  color: isActive || isDone ? "#fff" : c.t3,
                }}
              >
                {isDone ? "✓" : s.icon}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? ms.text
                    : isDone
                    ? c.previewToText
                    : c.t3,
                }}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
