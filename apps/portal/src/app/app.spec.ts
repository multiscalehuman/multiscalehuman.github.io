import { provideZonelessChangeDetection, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { AnalyticsPermissionsManager } from '@atlasng/analytics/permissions';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { App } from './app';

describe('App', () => {
  const permissions = { necessary: true, preferences: true, analytics: true, marketing: false };

  async function setup(options: { hasDecision?: boolean; dialogResult?: unknown } = {}) {
    const hasDecision = signal(options.hasDecision ?? false);
    const decide = () => hasDecision.set(true);
    const permissionsManager = {
      hasDecision: hasDecision.asReadonly(),
      permissions: vi.fn(() => permissions),
      setPermissions: vi.fn(decide),
      setFullPermissions: vi.fn(decide),
      setDefaultPermissions: vi.fn(decide),
    };
    const dialog = {
      open: vi.fn(() => ({ afterClosed: () => of(options.dialogResult) })),
    };

    const result = await render(App, {
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AnalyticsPermissionsManager, useValue: permissionsManager },
        { provide: MatDialog, useValue: dialog },
      ],
    });

    return {
      ...result,
      hasDecision,
      permissionsManager,
      dialog,
      router: result.fixture.debugElement.injector.get(Router),
    };
  }

  // jsdom never fires animationend, so a closing banner is detected by its animation class.
  function getCookieBanner(): HTMLElement | null {
    return screen.getByRole('region', { name: /privacy preferences/i }).parentElement;
  }

  it('renders the main content landmark and the footer', async () => {
    await setup({ hasDecision: true });

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('hides the cookie banner when preferences are already stored', async () => {
    await setup({ hasDecision: true });

    expect(screen.queryByRole('button', { name: /customize/i })).not.toBeInTheDocument();
  });

  it('shows the cookie banner again when the decision is cleared elsewhere', async () => {
    const { fixture, hasDecision } = await setup({ hasDecision: true });

    hasDecision.set(false);
    await fixture.whenStable();

    expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();
  });

  it('accepts all cookies and closes the banner', async () => {
    const { fixture, permissionsManager } = await setup();
    const app = fixture.componentInstance as unknown as { allowAllCookies(): void };

    app.allowAllCookies();
    await fixture.whenStable();

    expect(permissionsManager.setFullPermissions).toHaveBeenCalled();
    expect(getCookieBanner()).toHaveClass('ang-cookie-banner--closed');
  });

  it('accepts only necessary cookies and closes the banner', async () => {
    const { fixture, permissionsManager } = await setup();
    const app = fixture.componentInstance as unknown as { allowNecessaryCookies(): void };

    app.allowNecessaryCookies();
    await fixture.whenStable();

    expect(permissionsManager.setDefaultPermissions).toHaveBeenCalled();
    expect(getCookieBanner()).toHaveClass('ang-cookie-banner--closed');
  });

  it('saves the permissions chosen in the cookie preferences dialog', async () => {
    const chosen = { ...permissions, analytics: false };
    const { fixture, dialog, permissionsManager } = await setup({ dialogResult: chosen });
    const app = fixture.componentInstance as unknown as { openPrivacyPreferences(): void };

    app.openPrivacyPreferences();

    expect(dialog.open).toHaveBeenCalled();
    expect(permissionsManager.setPermissions).toHaveBeenCalledWith(chosen);
  });

  it('keeps the permissions when the cookie preferences dialog is dismissed', async () => {
    const { fixture, permissionsManager } = await setup({ dialogResult: undefined });
    const app = fixture.componentInstance as unknown as { openPrivacyPreferences(): void };

    app.openPrivacyPreferences();

    expect(permissionsManager.setPermissions).not.toHaveBeenCalled();
  });

  it('navigates to the privacy policy', async () => {
    const { fixture, router } = await setup({ hasDecision: true });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const app = fixture.componentInstance as unknown as { openPrivacyPolicy(): void };

    app.openPrivacyPolicy();

    expect(navigate).toHaveBeenCalledWith(['/privacy-policy']);
  });

  it('opens the privacy preferences from the cookie banner and keeps it open until a decision', async () => {
    const user = userEvent.setup();
    const { dialog } = await setup();

    await user.click(screen.getByRole('button', { name: /customize/i }));

    expect(dialog.open).toHaveBeenCalled();
    expect(getCookieBanner()).not.toHaveClass('ang-cookie-banner--closed');
  });
});
