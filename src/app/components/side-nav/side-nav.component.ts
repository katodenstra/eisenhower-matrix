import { Component, HostListener, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FakeAuthService } from '../../services/fake-auth.service';
import { UiEventsService, MatrixTarget } from '../../services/ui-events.service';

type NavLink = {
  label: string;
  icon: string;
  danger?: boolean;
  action?: MatrixTarget; // used by TASKS section
};

@Component({
  standalone: true,
  selector: 'app-side-nav',
  imports: [AsyncPipe],
  template: `
    @if (open()) {
      <!-- Click-outside layer -->
      <div class="backdrop" (click)="close()" aria-hidden="true"></div>
    }

    <nav class="sidenav" [class.sidenav--open]="open()" aria-label="Primary navigation">
      <div class="panel" id="sidenav-panel">
        <!-- Toggle INSIDE panel -->
        <button
          type="button"
          class="rail-btn toggle"
          (click)="toggle()"
          [attr.aria-expanded]="open()"
          aria-controls="sidenav-panel"
          [title]="open() ? 'Collapse menu' : 'Expand menu'"
        >
          <span class="material-symbols-rounded">{{ open() ? 'menu_open' : 'menu' }}</span>
        </button>

        <!-- Brand (logo) -->
        <div class="brand">
          <div class="rail-btn brand-logo" aria-hidden="true">
            <img
              src="brand/eisen-monogram.png"
              alt="Eisen Logo"
              class="brand-logo-img"
              aria-hidden="true"
            />
          </div>

          @if (open()) {
            <div class="brand-text">
              <div class="brand-title">Eisen</div>
              <div class="brand-subtitle">Priorities, allegedly</div>
            </div>
          }
        </div>

        <div class="content">
          <!-- TASKS -->
          <div class="section-header">
            @if (open()) {
              <span class="section-title">Tasks</span>
            } @else {
              <span class="section-rule" aria-hidden="true"></span>
            }
          </div>

          <div class="list">
            @for (item of taskLinks; track item.label) {
              <button
                type="button"
                class="item item-btn"
                (click)="onTaskAction(item)"
                [title]="open() ? '' : item.label"
              >
                <span class="material-symbols-rounded ms" aria-hidden="true">{{ item.icon }}</span>
                @if (open()) {
                  <span class="label">{{ item.label }}</span>
                }
              </button>
            }
          </div>

          <!-- ACCOUNT -->
          <div class="section-header">
            @if (open()) {
              <span class="section-title">Account</span>
            } @else {
              <span class="section-rule" aria-hidden="true"></span>
            }
          </div>

          <div class="list">
            @for (item of accountLinks; track item.label) {
              <button
                type="button"
                class="item item-btn"
                [class.item--danger]="item.danger"
                (click)="onAccountClick(item)"
                [title]="open() ? '' : item.label"
              >
                <span class="material-symbols-rounded ms" aria-hidden="true">{{ item.icon }}</span>
                @if (open()) {
                  <span class="label">{{ item.label }}</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- USER ALWAYS PRESENT -->
        <div class="user" [class.user--collapsed]="!open()">
          <div class="avatar" aria-hidden="true">
            <img src="users/user.png" alt="" class="avatar-img" />
          </div>

          @if (open()) {
            <div class="user-meta">
              <div class="user-name">
                {{ (auth.user$ | async)?.displayName ?? 'Mauricio Villada' }}
              </div>
              <div class="user-sub">{{ (auth.user$ | async)?.email ?? 'Go get things done.' }}</div>
            </div>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [
    `
      :host {
        --nav-collapsed: 80px;
        --nav-expanded: 292px;

        --rail: 48px; /* standard square for logo + toggle */
        --itemH: 48px;
        --gap: 8px;

        --blue-1: rgba(74, 163, 255, 0.35);
        --blue-2: rgba(74, 163, 255, 0.18);
        --blue-3: rgba(74, 163, 255, 0.1);
      }

      /* The outer wrapper just reserves width */

      .panel {
        height: 95%;
        max-height: 100%;
        border-radius: 22px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(10, 18, 30, 0.55);
        backdrop-filter: blur(16px) saturate(120%);
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.35);
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: var(--gap);
        //overflow: hidden; /* IMPORTANT: prevents panel content from extending outside */
      }

      /* Unified square button shell used by toggle + logo */
      .rail-btn {
        width: var(--rail);
        height: var(--rail);
        border-radius: 18px;
        display: grid;
        place-items: center;
        overflow: hidden;

        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: inherit;
      }

      .toggle {
        cursor: pointer;
      }

      .toggle:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0;
      }

      .brand-logo {
        font-weight: 900;
        background: rgba(74, 163, 255, 0.14);
        border-color: rgba(74, 163, 255, 0.22);
        transition: none !important;
      }

      .brand-logo-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        border-radius: inherit;
      }

      .brand-text {
        min-width: 0;
      }

      .brand-title {
        font-weight: 900;
        font-size: 16px;
        line-height: 1.1;
      }

      .brand-subtitle {
        font-size: 12px;
        opacity: 0.75;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
        margin: 6px 8px;
      }

      .list {
        display: grid;
        gap: 6px; /* reduced gaps so user section fits */
        padding: 0;
      }

      .item {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        height: var(--itemH);
        width: 100%;
        padding: 0 14px;
        border-radius: 18px;
        border: 1px solid transparent;
        background: transparent;
        color: inherit;
        cursor: pointer;
        text-align: left;
        transition:
          background 140ms ease,
          border-color 140ms ease;
      }
      .item:hover {
        background: var(--blue-3);
        border-color: rgba(74, 163, 255, 0.16);
      }
      .item--danger:hover {
        background: rgba(255, 90, 90, 0.08);
        border-color: rgba(255, 90, 90, 0.16);
      }

      .content {
        flex: 1 1 auto;
        min-height: 0; /* critical so overflow works in flex column */
        overflow: auto;
        padding: 0;
      }

      .content::-webkit-scrollbar {
        width: 10px;
      }
      .content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        border: 3px solid rgba(0, 0, 0, 0);
        background-clip: padding-box;
      }

      .sidenav {
        position: fixed;
        top: 14px;
        left: 14px;
        /* Use dynamic viewport height so it never exceeds the visible window */
        height: calc(100dvh - 28px);
        bottom: auto;
        z-index: 2001;
        width: var(--nav-collapsed);
        transition: width 220ms ease;
      }

      .sidenav--open {
        width: var(--nav-expanded);
      }

      .sidenav:not(.sidenav--open) .item {
        width: var(--rail);
        height: var(--rail);
        padding: 0;
        justify-content: center;
      }

      /* Collapse: center the rail elements cleanly */
      .sidenav:not(.sidenav--open) .toggle {
        margin-inline: auto;
      }

      .sidenav:not(.sidenav--open) .brand {
        width: 100%;
        justify-content: center;
      }

      .sidenav:not(.sidenav--open) .brand-logo {
        margin-inline: auto;
      }

      /* Hide the label visually in collapsed mode (but keep tooltip titles) */
      .sidenav:not(.sidenav--open) .label {
        display: none;
      }

      /* Collapsed mode: make each item a centered square (hover doesn't overflow) */
      .sidenav:not(.sidenav--open) .list {
        justify-items: center;
      }

      /* in collapsed mode, make the rule shorter and centered */
      .sidenav:not(.sidenav--open) .section-header {
        justify-content: center;
        padding: 0;
      }
      .sidenav:not(.sidenav--open) .section-rule {
        width: 42px;
      }

      .icon {
        width: 36px;
        height: 36px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 20px;
      }

      .label {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .section-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.75;
      }

      .section-header {
        height: 28px; /* consistent row height */
        display: flex;
        align-items: center;
        padding: 0 10px;
        margin-top: 6px;
      }

      .section-rule {
        height: 1px;
        width: 100%;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 999px;
      }

      .spacer {
        flex: 1 1 auto;
      }

      /* User always visible, smaller so it fits even collapsed */
      .user {
        display: flex;
        align-items: center;
        border-radius: 18px;
        background: rgba(74, 163, 255, 0.1);
        border: 1px solid rgba(74, 163, 255, 0.16);
        gap: 12px;
        margin-top: auto;
        margin-bottom: 4px;
        padding: 10px;
      }

      .user--collapsed {
        justify-content: center;
        padding: 10px 0;
      }

      .avatar {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.1);
        overflow: hidden;
        display: grid;
        place-items: center;
      }

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .user-meta {
        min-width: 0;
      }

      .user-name {
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-sub {
        font-size: 12px;
        opacity: 0.8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ms {
        font-size: 24px;
        line-height: 1;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        opacity: 0.92;
      }

      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1990;
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(2px);
      }
    `,
  ],
})
export class SideNavComponent {
  open = signal(false);

  taskLinks: NavLink[] = [
    { label: 'Do now', icon: 'flash_on', action: 'DO_NOW' },
    { label: 'Do later', icon: 'schedule', action: 'DO_LATER' },
    { label: 'Delegate', icon: 'call_split', action: 'DELEGATE' },
    { label: 'Eliminate', icon: 'block', action: 'ELIMINATE' },
    { label: 'Grid view', icon: 'grid_view', action: 'GRID_VIEW' },
    { label: 'Uncategorised tasks', icon: 'inbox', action: 'UNCATEGORIZED' },
    { label: 'Completed tasks', icon: 'check_circle', action: 'COMPLETED' },
  ];

  accountLinks: NavLink[] = [
    { label: 'Profile', icon: 'person' },
    { label: 'Logout', icon: 'logout', danger: true },
  ];

  constructor(
    public auth: FakeAuthService,
    private ui: UiEventsService,
  ) {}

  toggle(): void {
    this.open.set(!this.open());
  }

  close(): void {
    this.open.set(false);
  }

  onTaskAction(item: NavLink): void {
    if (!item.action) return;

    console.log('[SideNav] expandMatrix ->', item.action);

    this.ui.expandMatrix(item.action);
    this.close();
  }

  onAccountClick(item: NavLink): void {
    if (item.label === 'Logout') {
      this.auth.logout();
    }
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}
