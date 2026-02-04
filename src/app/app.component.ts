import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNavComponent } from './components/side-nav/side-nav.component';

/**
 * App Root Component
 *
 * Main application shell that renders:
 * - Side navigation bar
 * - Main content area with router outlet
 *
 * Uses OnPush change detection for optimal performance
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SideNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <app-side-nav />

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
      }

      /* Keep content visible when nav is collapsed; expanded overlays on top. */
      .content {
        min-height: 100vh;
        padding: 14px 14px 14px 106px; /* 78 + left gap + breathing room */
      }

      @media (max-width: 720px) {
        .content {
          padding-left: 14px;
        }
      }
    `,
  ],
})
export class AppComponent {}
