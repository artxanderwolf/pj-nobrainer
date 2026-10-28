import { Injectable } from '@angular/core';
import { claimMission, DUNGEON_NAMES, dungeonUnlocked, initializeReleaseProgress, missions, refreshMissionNotifications, type MissionState } from '../game/mission-core.ts';
import { GameStateService, type MutableGameState } from './game-state.service';
@Injectable({ providedIn: 'root' })
export class GameMissionService {
    private save: () => void = () => { };
    private changed: () => void = () => { };
    private open = false;
    private toastUntil = 0;
    private bound = false;
    constructor(private readonly gameState: GameStateService) { }
    prepare(save: () => void, changed: () => void): void {
        this.save = save;
        this.changed = changed;
        const state = this.state();
        const migrated = !state.releaseProgress;
        initializeReleaseProgress(state);
        if (!dungeonUnlocked(state, Number(state.selectedDungeonId)))
            state.selectedDungeonId = 1;
        if (!this.bound) {
            this.bound = true;
            document.getElementById('questHeaderButton')?.addEventListener('click', () => this.show());
            const base = document.getElementById('base');
            const button = document.createElement('button');
            button.id = 'questOverviewButton';
            button.className = 'btn mission-overview';
            button.textContent = '📜 Missionen öffnen';
            button.onclick = () => this.show();
            base?.append(button);
            const dialog = document.createElement('dialog');
            dialog.id = 'missionDialog';
            dialog.setAttribute('aria-labelledby', 'missionTitle');
            dialog.innerHTML = '<div class="mission-heading"><h2 id="missionTitle">Missionen</h2><button class="btn" id="missionClose" aria-label="Missionen schließen">×</button></div><div id="missionList"></div>';
            document.body.append(dialog);
            dialog.querySelector('#missionClose')?.addEventListener('click', () => dialog.close());
            dialog.addEventListener('close', () => { this.open = false; document.getElementById('questHeaderButton')?.focus(); });
            dialog.addEventListener('click', e => { if (e.target === dialog)
                dialog.close(); const id = (e.target as HTMLElement).closest<HTMLElement>('[data-claim]')?.dataset['claim']; if (id && claimMission(this.state(), id)) {
                this.save();
                this.changed();
                this.render();
            } });
            const toast = document.createElement('div');
            toast.id = 'missionToast';
            toast.setAttribute('role', 'status');
            toast.hidden = true;
            document.body.append(toast);

        }
        this.render();
        if (migrated)
            this.save();
    }
    render(now = Date.now()): void {
        const state = this.state();
        const previous = JSON.stringify(state.releaseProgress?.notificationQueue);
        refreshMissionNotifications(state);
        const list = missions(state), visible = list.filter(m => m.visible && !m.claimed);
        const ready = visible.filter(m => m.complete && !m.claimed).length;
        const header = document.getElementById('questHeaderButton');
        if (header) {
            header.textContent = ready ? `📜 ${ready}` : '📜';
            header.setAttribute('aria-label', `Missionen öffnen${ready ? `, ${ready} einsammelbereit` : ''}`);
        }
        if (this.open) {
            const root = document.getElementById('missionList');
            if (root) {
                const markup = visible.map(m => `<article class="mission-card" data-mission-id="${m.id}"><h3>${this.escape(m.title)}</h3><p>${this.escape(m.progress)}</p><div>${m.complete ? '<strong>Einsammelbereit</strong>' : 'In Arbeit'}</div>${m.complete ? `<button class="btn primary" data-claim="${m.id}">Einsammeln</button>` : ''}</article>`).join('') || '<p class="empty">Keine offenen Missionen.</p>';
                if (root.innerHTML !== markup)
                    root.innerHTML = markup;
            }
        }
        const toast = document.getElementById('missionToast');
        if (toast && now >= this.toastUntil) {
            const id = state.releaseProgress!.notificationQueue.shift();
            const m = list.find(m => m.id === id && m.visible && !m.claimed);
            toast.hidden = !m;
            if (m) {
                toast.textContent = `Mission abgeschlossen: ${m.title} · Jetzt einsammeln`;
                this.toastUntil = now + 2000;
            }
            else
                this.toastUntil = now;
        }
        if (previous !== JSON.stringify(state.releaseProgress?.notificationQueue))
            this.save();
    }
    private show(): void { this.open = true; this.render(); const dialog = document.getElementById('missionDialog') as HTMLDialogElement | null; if (dialog && !dialog.open)
        dialog.showModal(); }
    private escape(s: string): string { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
    private state(): MutableGameState & MissionState { return this.gameState.getState<MutableGameState & MissionState>(); }
}
