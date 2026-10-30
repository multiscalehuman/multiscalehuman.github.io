import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterOutlet } from '@angular/router';
import { AnalyticsPermissionsManager } from '@atlasng/analytics/permissions';
import { AnyLink } from '@atlasng/common';
import { CookieBanner, CookieBannerPrivacyPolicy } from '@atlasng/design-system/cookie-banner';
import { Footer } from '@atlasng/design-system/footer';
import { TextLink } from '@atlasng/design-system/links/text-link';
import { CookieModal, CookieModalData, CookieModalResult } from '@atlasng/labs/cookie-modal';
import { SkipToContentButton } from '@atlasng/labs/skip-to-content-button';
import { SOCIAL_MEDIA_IDS } from './social-media';

/** Application shell: page content, the CIFAR footer, and cookie consent. */
@Component({
  selector: 'mhu-root',
  imports: [RouterOutlet, AnyLink, CookieBanner, CookieBannerPrivacyPolicy, Footer, SkipToContentButton, TextLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Dialog service used to open the cookie preferences modal. */
  private readonly dialog = inject(MatDialog);
  /** Router used to open the privacy policy page. */
  private readonly router = inject(Router);
  /** Stores the visitor's cookie and analytics permissions. */
  private readonly permissionsManager = inject(AnalyticsPermissionsManager);

  /** CIFAR logo shown in the footer and the cookie preferences modal. */
  protected readonly logo = 'assets/logos/cifar.svg';
  /** Social media buttons shown in the footer. */
  protected readonly socialMediaIds = SOCIAL_MEDIA_IDS;
  /** Whether the visitor has made a cookie consent decision. While false, the cookie banner is shown. */
  protected readonly hasDecision = this.permissionsManager.hasDecision;

  /** Navigates to the privacy policy page. */
  protected openPrivacyPolicy(): void {
    void this.router.navigate(['/privacy-policy']);
  }

  /** Opens the cookie preferences modal and saves the visitor's choices when they confirm. */
  protected openPrivacyPreferences(): void {
    const ref = this.dialog.open<CookieModal, CookieModalData, CookieModalResult>(CookieModal, {
      data: {
        logoSrc: this.logo,
        permissions: this.permissionsManager.permissions(),
      },
    });

    ref.afterClosed().subscribe((value) => {
      if (value) {
        this.permissionsManager.setPermissions(value);
      }
    });
  }

  /** Grants every cookie category. */
  protected allowAllCookies(): void {
    this.permissionsManager.setFullPermissions();
  }

  /** Grants only the necessary cookies. */
  protected allowNecessaryCookies(): void {
    this.permissionsManager.setDefaultPermissions();
  }
}
