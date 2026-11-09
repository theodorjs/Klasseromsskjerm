import { useEffect, useState } from 'react';
import { useAppState } from '../hooks/useAppState.js';
import { getOsloTimeAndDay, getMinutesFromTime } from '../utils/time.js';
import { getClassScheduleState, normalizeActiveTimelineClassNames, getTempScheduleKey } from '../utils/schedule.js';

import Stars from './Stars.jsx';
import StatusBar from './StatusBar.jsx';
import MainContainer from './MainContainer.jsx';
import Timeline from './Timeline.jsx';
import Toolbox from './Toolbox.jsx';
import TimePicker from './TimePicker.jsx';
import CountdownStack from './CountdownStack.jsx';
import TimerPanel from './TimerPanel.jsx';
import AgendaSidebar from './AgendaSidebar.jsx';
import NotePanel from './NotePanel.jsx';
import SplitScreen from './SplitScreen.jsx';
import ShareModal from './ShareModal.jsx';
import ReceiveShareModal from './ReceiveShareModal.jsx';
import { readShareTokenFromLocation, clearShareHashFromLocation, decodeShareToken } from '../utils/share.js';
import { getCurrentSubjectColor } from '../utils/color.js';
import WallScreen from './WallScreen.jsx';
import { DagensTimeKort, PlanleggTimeDialog } from './DagensTime.jsx';
import { useDagensTime, finnSynligTime, dagensDato } from '../hooks/useDagensTime.js';
import { formatMinutesAsTime } from '../utils/time.js';
import { formatExpandedActivityDisplay } from '../utils/schedule.js';
import { readWallModePreference, WALL_MODE_KEY } from '../utils/wallMode.js';
import { safeSetItem, safeRemoveItem } from '../utils/storage.js';
import {
  EditModal,
  ActivityModal,
  CountdownModal,
  LoginModal,
  ColorDetailModal,
} from './Modals.jsx';

function applyBodyClasses(themeMode) {
  const mode = String(themeMode);
  document.body.classList.remove('light-mode', 'dark-mode', 'star-mode', 'colorful-mode', 'ui-light', 'ui-dark');
  if (mode === '0') document.body.classList.add('light-mode', 'ui-light');
  else if (mode === '1') document.body.classList.add('dark-mode', 'ui-dark');
  else if (mode === '2') document.body.classList.add('star-mode', 'ui-dark');
  else document.body.classList.add('colorful-mode', 'ui-light');
}

export default function App() {
  const state = useAppState();
  const {
    classes,
    currentClassName,
    currentClass,
    activeTimelineClassNames,
    tempScheduleChanges,
    editPermission,
    simState,
    themeMode,
    timerPanelOpen, setTimerPanelOpen,
    agendaOpen, setAgendaOpen,
    noteOpen, setNoteOpen,
    underTheHoodOpen, setUnderTheHoodOpen,
    underTheHoodView, setUnderTheHoodView,
    scheduleEditorDraft, setScheduleEditorDraft,  // eslint-disable-line no-unused-vars
    timePickerOpen, setTimePickerOpen,
    editModal, setEditModal,
    activityModal, setActivityModal,
    countdownModal, setCountdownModal,
    loginModalOpen, setLoginModalOpen,
    colorDetailModal, setColorDetailModal,
    agendaSubject, setAgendaSubject,
    selectClass,
    toggleTimelineClass,
    renameCurrentClass,
    deleteCurrentClass,
    addNewClass,
    setThemeMode,
    grantEditPermission,
    revokeEditPermission,
    resetToRealTime,
    applySimTime,
    updateTempSchedule,
    saveCountdown,
    deleteCountdown,
    toggleCountdownVisibility,
    saveAgendaItem,
    toggleAgendaItemCompleted,
    deleteAgendaItem,
    reorderAgendaItems,
    clearAgenda,
    saveAgendaTemplate,
    loadAgendaTemplate,
    saveSubjectColor,
    generatePalette,
    saveScheduleFromDraft,  // eslint-disable-line no-unused-vars
    saveScheduleV2,
    importSharedClass,
    undoLastImport,
    canUndoImport,
    lastImportInfo,
  } = state;

  // Dagens time: tittel, tid, mål og agenda på tavla
  const dagensTime = useDagensTime();
  const [planleggOpen, setPlanleggOpen] = useState(false);
  const [planleggId, setPlanleggId] = useState(null);

  // Clock tick state
  const [tick, setTick] = useState(0);  // eslint-disable-line no-unused-vars

  // Veggskjerm: egen visning for en liten skjerm langt unna
  const [wallMode, setWallMode] = useState(readWallModePreference);
  function enterWallMode() {
    safeSetItem(WALL_MODE_KEY, 'vegg');
    setWallMode(true);
  }
  function exitWallMode() {
    safeRemoveItem(WALL_MODE_KEY);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('visning')) {
        url.searchParams.delete('visning');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    } catch { /* adressen lar seg ikke endre; visningen bytter uansett */ }
    setWallMode(false);
  }

  // Deling av timeplan via lenke
  const [shareOpen, setShareOpen] = useState(false);
  const [receiveState, setReceiveState] = useState(null); // { status, payload, error, replaced }

  useEffect(() => {
    // Kjøres ved oppstart og hver gang #-delen endres. Hashen fjernes med en
    // gang, så StrictMode sin andre kjøring og en ny klikk på samme lenke
    // begge oppfører seg riktig.
    function handleIncomingLink() {
      const token = readShareTokenFromLocation();
      if (!token) return;
      clearShareHashFromLocation();
      try {
        const payload = decodeShareToken(token);
        setReceiveState({ status: 'ask', payload });
      } catch (err) {
        setReceiveState({ status: 'error', error: err?.message || 'Lenken kunne ikke leses.' });
      }
    }
    handleIncomingLink();
    window.addEventListener('hashchange', handleIncomingLink);
    return () => window.removeEventListener('hashchange', handleIncomingLink);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Apply theme body classes
  useEffect(() => {
    applyBodyClasses(themeMode);
  }, [themeMode]);

  // Apply under-the-hood class to body
  useEffect(() => {
    if (underTheHoodOpen) document.body.classList.add('under-the-hood-active');
    else document.body.classList.remove('under-the-hood-active');
  }, [underTheHoodOpen]);

  useEffect(() => {
    document.body.classList.toggle('vegg-aktiv', wallMode);
    return () => document.body.classList.remove('vegg-aktiv');
  }, [wallMode]);

  // Compute current time info
  const { osloTime, currentDay, realDay, realOsloTime } = getOsloTimeAndDay(simState);
  const isSim = !!(simState.simDay || simState.simHour != null || simState.simMinute != null);
  const currentTime = isSim ? osloTime : realOsloTime;
  const currentMinutes = getMinutesFromTime(currentTime);
  const realMinutes = getMinutesFromTime(realOsloTime);
  const currentSeconds = isSim ? 0 : new Date().getSeconds();

  // Status bar date
  const now = new Date();
  const dateStr = now.toLocaleDateString('no-NO', { day: 'numeric', month: 'long', timeZone: 'Europe/Oslo' });
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);

  // Compute schedule states
  const timelineClassNames = normalizeActiveTimelineClassNames(activeTimelineClassNames, classes, currentClassName);
  const primaryState = getClassScheduleState(currentClassName, currentDay, currentMinutes, classes, tempScheduleChanges);
  const displayStates = timelineClassNames
    .map(name => getClassScheduleState(name, currentDay, currentMinutes, classes, tempScheduleChanges))
    .filter(Boolean);

  const isWeekend = (now.getDay() === 0 || now.getDay() === 6) && !isSim;

  // Nedtelleren følger fargen til faget som pågår
  const currentSubject = getCurrentSubjectColor(primaryState);

  // Count downs for stack
  const countdowns = currentClass?.customCountdowns || [];
  const countdownsVisible = currentClass?.countdownsVisible !== false;

  // Subject color for modal
  const colorModalSubject = colorDetailModal?.subject;
  const colorModalCurrentColor = colorModalSubject
    ? (currentClass?.subjectColors?.[colorModalSubject] || '#ffffff')
    : '#ffffff';
  const colorModalCurrentEmoji = colorModalSubject
    ? (currentClass?.subjectEmojis?.[colorModalSubject] || 'palette')
    : 'palette';

  // Timen som står på tavla nå, og forslag til tid når en ny time settes opp
  const synligTime = finnSynligTime(dagensTime.timer, dagensDato(), currentDay, currentMinutes);
  const planleggEksisterende = planleggId ? (dagensTime.timer.find(t => t.id === planleggId) || null) : null;
  function lagForslag() {
    const okter = (primaryState?.normalizedDayEvents || []).filter(e => e.type === 'class');
    const okt = okter.find(e => currentMinutes >= e.start && currentMinutes < e.end)
      || okter.find(e => e.start > currentMinutes);
    if (okt) {
      return {
        fra: formatMinutesAsTime(okt.start),
        til: formatMinutesAsTime(okt.end),
        fag: formatExpandedActivityDisplay(okt.displayActivity || okt.activity).split(' / ')[0],
      };
    }
    const start = Math.min(23 * 60, Math.ceil((currentMinutes + 1) / 5) * 5);
    return { fra: formatMinutesAsTime(start), til: formatMinutesAsTime(Math.min(start + 45, 23 * 60 + 59)), fag: '' };
  }
  function openPlanlegg(id) {
    setPlanleggId(id ?? synligTime?.id ?? null);
    setPlanleggOpen(true);
  }

  // Handler: open edit modal from timeline
  function handleOpenEditModal({ eventKey, legacyEventKey, displayActivity, hasTempActivity }) {
    setEditModal({ eventKey, legacyEventKey, displayActivity, hasTempActivity });
  }

  // Handler: lock toggle
  function handleToggleLock() {
    if (editPermission) {
      if (confirm('Vil du logge ut?')) {
        revokeEditPermission();
        setUnderTheHoodOpen(false);
      }
    } else {
      setLoginModalOpen(true);
    }
  }

  if (wallMode) {
    return (
      <>
        <Stars />
        <WallScreen
          primaryState={primaryState}
          displayStates={displayStates}
          currentMinutes={currentMinutes}
          currentSeconds={currentSeconds}
          currentDay={currentDay}
          currentTime={currentTime}
          dateStr={dateStr}
          isWeekend={isWeekend}
          classes={classes}
          activeTimelineClassNames={activeTimelineClassNames}
          tempScheduleChanges={tempScheduleChanges}
          realMinutes={realMinutes}
          isSim={isSim}
          themeMode={themeMode}
          countdowns={countdowns}
          countdownsVisible={countdownsVisible}
          onExit={exitWallMode}
        />
        <TimerPanel
          open={timerPanelOpen}
          onClose={() => setTimerPanelOpen(false)}
          onRequestOpen={() => setTimerPanelOpen(true)}
          subjectColor={currentSubject?.color || null}
          subjectName={currentSubject?.name || null}
        />
        <ReceiveShareModal
          state={receiveState}
          hasExisting={!!(receiveState?.payload && Object.hasOwn(classes, receiveState.payload.name))}
          canUndo={canUndoImport}
          onAccept={() => {
            if (!receiveState?.payload) return;
            try {
              const { replaced } = importSharedClass(receiveState.payload);
              setReceiveState(prev => ({ ...prev, status: 'done', replaced }));
            } catch (err) {
              console.error('Import av delt timeplan feilet:', err);
              setReceiveState({ status: 'error', error: 'Kunne ikke legge til timeplanen.' });
            }
          }}
          onUndo={() => { undoLastImport(); setReceiveState(null); }}
          onClose={() => setReceiveState(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="noise-bg"></div>
      <Stars />

      <div className="split-surface">
        <div
          id="split-top"
          className="split-layer"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '5vh' }}
        >
          <Toolbox
            themeMode={themeMode}
            onSetTheme={setThemeMode}
            onOpenTimer={() => setTimerPanelOpen(true)}
            onOpenPlanlegg={() => openPlanlegg()}
            onOpenAgenda={() => setAgendaOpen(true)}
            onOpenNote={() => setNoteOpen(true)}
            onOpenClass={() => { setUnderTheHoodOpen(true); setUnderTheHoodView('classGrid'); }}
            editPermission={editPermission}
            onToggleLock={handleToggleLock}
            onOpenTimePicker={() => setTimePickerOpen(true)}
            timePickerOpen={timePickerOpen}
            onCloseTimePicker={() => setTimePickerOpen(false)}
            onApplyTime={(day, hour, minute) => {
              applySimTime(day, parseInt(hour, 10), parseInt(minute, 10));
            }}
            currentClass={currentClass}
            onAddCountdown={() => setCountdownModal({ index: null })}
            onToggleCountdownVisibility={toggleCountdownVisibility}
            onEnterWallMode={enterWallMode}
          />
          {synligTime ? (
            <DagensTimeKort
              time={synligTime}
              minutter={currentMinutes}
              onEndre={() => openPlanlegg(synligTime.id)}
              onSkjul={() => dagensTime.skjulTime(synligTime.id)}
              onVekslePunkt={(i) => dagensTime.vekslePunkt(synligTime.id, i)}
            />
          ) : (
            <MainContainer
              primaryState={primaryState}
              displayStates={displayStates}
              currentMinutes={currentMinutes}
              isWeekend={isWeekend}
              currentDay={currentDay}
            />
          )}
        </div>

        <div
          id="split-bottom"
          className="split-layer"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '5vh' }}
        >
          <Timeline
            classes={classes}
            currentDay={currentDay}
            currentMinutes={currentMinutes}
            useRealTime={!isSim}
            realMinutes={realMinutes}
            activeTimelineClassNames={activeTimelineClassNames}
            tempScheduleChanges={tempScheduleChanges}
            editPermission={editPermission}
            themeMode={themeMode}
            onOpenEditModal={handleOpenEditModal}
          />
        </div>
      </div>

      <StatusBar
        currentDay={currentDay}
        currentHour={currentHour}
        currentMinute={currentMinute}
        dateStr={dateStr}
        isSim={isSim}
        onResetSim={resetToRealTime}
      />

      <CountdownStack
        countdowns={countdowns}
        countdownsVisible={countdownsVisible}
        onEditCountdown={(index) => setCountdownModal({ index })}
      />

      <TimerPanel
        open={timerPanelOpen}
        onClose={() => setTimerPanelOpen(false)}
        onRequestOpen={() => setTimerPanelOpen(true)}
        subjectColor={currentSubject?.color || null}
        subjectName={currentSubject?.name || null}
      />

      <TimePicker
        open={timePickerOpen}
        onApply={(day, hour, minute) => {
          applySimTime(day, parseInt(hour, 10), parseInt(minute, 10));
          setTimePickerOpen(false);
        }}
        onClose={() => setTimePickerOpen(false)}
      />

      <SplitScreen
        open={underTheHoodOpen}
        view={underTheHoodView}
        setView={setUnderTheHoodView}
        classes={classes}
        currentClassName={currentClassName}
        currentClass={currentClass}
        activeTimelineClassNames={activeTimelineClassNames}
        editPermission={editPermission}
        onClose={() => setUnderTheHoodOpen(false)}
        onSelectClass={selectClass}
        onToggleTimelineClass={toggleTimelineClass}
        onAddNewClass={addNewClass}
        onRenameClass={renameCurrentClass}
        onDeleteClass={deleteCurrentClass}
        onSaveScheduleV2={saveScheduleV2}
        onPickColor={(subject) => setColorDetailModal({ subject })}
        onGeneratePalette={() => { generatePalette(); }}
        onOpenColorModal={(subject) => setColorDetailModal({ subject })}
        onOpenShare={() => setShareOpen(true)}
        canUndoImport={canUndoImport}
        lastImportInfo={lastImportInfo}
        onUndoImport={undoLastImport}
      />

      <ShareModal
        open={shareOpen}
        classData={currentClass}
        className={currentClassName}
        onClose={() => setShareOpen(false)}
      />

      <ReceiveShareModal
        state={receiveState}
        hasExisting={!!(receiveState?.payload && Object.hasOwn(classes, receiveState.payload.name))}
        canUndo={canUndoImport}
        onAccept={() => {
          if (!receiveState?.payload) return;
          try {
            const { replaced } = importSharedClass(receiveState.payload);
            setReceiveState(prev => ({ ...prev, status: 'done', replaced }));
          } catch (err) {
            console.error('Import av delt timeplan feilet:', err);
            setReceiveState({ status: 'error', error: 'Kunne ikke legge til timeplanen.' });
          }
        }}
        onUndo={() => { undoLastImport(); setReceiveState(null); }}
        onClose={() => setReceiveState(null)}
      />

      <AgendaSidebar
        open={agendaOpen}
        onClose={() => setAgendaOpen(false)}
        currentClass={currentClass}
        agendaSubject={agendaSubject}
        onSetSubject={setAgendaSubject}
        editPermission={editPermission}
        onAddItem={(subject) => setActivityModal({ subject, item: null, itemIndex: null })}
        onEditItem={(subject, item, index) => setActivityModal({ subject, item, itemIndex: index })}
        onToggleItem={toggleAgendaItemCompleted}
        onDeleteItem={deleteAgendaItem}
        onReorder={reorderAgendaItems}
        onClearAgenda={clearAgenda}
        onSaveTemplate={saveAgendaTemplate}
        onLoadTemplate={loadAgendaTemplate}
      />

      <NotePanel
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
      />

      <PlanleggTimeDialog
        open={planleggOpen}
        eksisterende={planleggEksisterende}
        forslag={planleggOpen ? lagForslag() : null}
        minutter={currentMinutes}
        dag={currentDay}
        onLagre={(time) => { dagensTime.lagreTime(time); setPlanleggOpen(false); }}
        onSlett={(id) => { dagensTime.slettTime(id); setPlanleggOpen(false); }}
        onAvbryt={() => setPlanleggOpen(false)}
      />

      {/* Modals */}
      <EditModal
        open={!!editModal}
        displayActivity={editModal?.displayActivity || ''}
        hasTempActivity={editModal?.hasTempActivity || false}
        onSave={(newActivity) => {
          if (editModal) {
            updateTempSchedule(prev => ({
              ...prev,
              changes: {
                ...prev.changes,
                [editModal.eventKey]: newActivity,
              }
            }));
          }
          setEditModal(null);
        }}
        onReset={() => {
          if (editModal) {
            updateTempSchedule(prev => {
              const next = { ...prev, changes: { ...prev.changes } };
              delete next.changes[editModal.eventKey];
              delete next.changes[editModal.legacyEventKey];
              return next;
            });
          }
          setEditModal(null);
        }}
        onCancel={() => setEditModal(null)}
      />

      <ActivityModal
        open={!!activityModal}
        subject={activityModal?.subject || ''}
        item={activityModal?.item || null}
        itemIndex={activityModal?.itemIndex ?? null}
        onSave={(payload, itemIndex) => {
          if (activityModal?.subject) {
            saveAgendaItem(activityModal.subject, payload, itemIndex);
          }
          setActivityModal(null);
        }}
        onCancel={() => setActivityModal(null)}
      />

      <CountdownModal
        open={!!countdownModal}
        editingIndex={countdownModal?.index ?? null}
        existingItem={countdownModal?.index != null ? (currentClass?.customCountdowns?.[countdownModal.index] || null) : null}
        onSave={(payload, editingIndex) => {
          saveCountdown(payload, editingIndex);
          setCountdownModal(null);
        }}
        onDelete={(index) => {
          deleteCountdown(index);
          setCountdownModal(null);
        }}
        onCancel={() => setCountdownModal(null)}
      />

      <LoginModal
        open={loginModalOpen}
        onSuccess={() => {
          grantEditPermission();
          setLoginModalOpen(false);
        }}
        onCancel={() => setLoginModalOpen(false)}
      />

      <ColorDetailModal
        open={!!colorDetailModal}
        subject={colorModalSubject || ''}
        currentColor={colorModalCurrentColor}
        currentEmoji={colorModalCurrentEmoji}
        onSave={(subject, color, emoji) => {
          saveSubjectColor(subject, color, emoji);
          setColorDetailModal(null);
        }}
        onCancel={() => setColorDetailModal(null)}
      />
    </>
  );
}
