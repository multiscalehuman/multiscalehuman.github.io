import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { AnalyticsPermissionsManager } from '@atlasng/analytics/permissions';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { App } from './app';

describe('App', () => {
  const permissions = { necessary: true, preferences: true, analytics: true, marketing: false };

  async function setup(options: { preferencesSet?: boolean; dialogResult?: unknown } = {}) {
    const permissionsManager = {
      syncFromStorage: vi.fn(() => options.preferencesSet ?? false),
      permissions: vi.fn(() => permissions),
      setPermissions: vi.fn(),
      setFullPermissions: vi.fn(),
      setDefaultPermissions: vi.fn(),
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

    return { ...result, permissionsManager, dialog, router: result.fixture.debugElement.injector.get(Router) };
  }

  it('renders the main content landmark and the footer', async () => {
    await setup({ preferencesSet: true });

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('hides the cookie banner when preferences are already stored', async () => {
    await setup({ preferencesSet: true });

    expect(screen.queryByRole('button', { name: /customize/i })).not.toBeInTheDocument();
  });

  it('accepts all cookies and hides the banner', async () => {
    const { fixture, permissionsManager } = await setup();
    const app = fixture.componentInstance as unknown as { allowAllCookies(): void };

    app.allowAllCookies();
    await fixture.whenStable();

    expect(permissionsManager.setFullPermissions).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /customize/i })).not.toBeInTheDocument();
  });

  it('accepts only necessary cookies and hides the banner', async () => {
    const { fixture, permissionsManager } = await setup();
    const app = fixture.componentInstance as unknown as { allowNecessaryCookies(): void };

    app.allowNecessaryCookies();
    await fixture.whenStable();

    expect(permissionsManager.setDefaultPermissions).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /customize/i })).not.toBeInTheDocument();
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
    const { fixture, router } = await setup({ preferencesSet: true });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const app = fixture.componentInstance as unknown as { openPrivacyPolicy(): void };

    app.openPrivacyPolicy();

    expect(navigate).toHaveBeenCalledWith(['/privacy-policy']);
  });

  it('opens the privacy preferences from the cookie banner', async () => {
    const user = userEvent.setup();
    const { dialog } = await setup();

    await user.click(screen.getByRole('button', { name: /customize/i }));

    expect(dialog.open).toHaveBeenCalled();
  });
});
