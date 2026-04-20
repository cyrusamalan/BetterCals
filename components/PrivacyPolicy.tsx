import Link from 'next/link';

/**
 * Privacy Policy content for BetterCals.
 * Rendered as semantic HTML with Tailwind for readability (no extra markdown dependency).
 */
export function PrivacyPolicy() {
  return (
    <article
      className="legal-doc max-w-3xl mx-auto"
      style={{ color: 'var(--text-primary)' }}
    >
      <header className="mb-10 pb-8 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
          BetterCals
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Last updated: April 20, 2026
        </p>
      </header>

      <div className="space-y-10 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <section aria-labelledby="privacy-intro">
          <h2 id="privacy-intro" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            1. Introduction
          </h2>
          <p>
            BetterCals respects your privacy. This Privacy Policy explains how we collect,
            use, store, and protect information when you use our website and services (collectively, the
            “Services”).
          </p>
        </section>

        <section aria-labelledby="privacy-local">
          <h2 id="privacy-local" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            2. Local storage by default
          </h2>
          <p className="mb-3">
            <strong style={{ color: 'var(--text-primary)' }}>BetterCals uses local storage on your device by default.</strong>{' '}
            When you use the Services without creating or signing in to an account, your inputs, analyses, and related
            app state are stored locally in your browser (for example, using{' '}
            <code className="text-sm px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-warm)', color: 'var(--text-primary)' }}>
              localStorage
            </code>{' '}
            or similar browser mechanisms). This data remains on your device and is not transmitted to our servers
            solely because you used the app while signed out.
          </p>
          <p>
            You can clear this data at any time through your browser settings; doing so may remove your local history
            and preferences in BetterCals.
          </p>
        </section>

        <section aria-labelledby="privacy-account">
          <h2 id="privacy-account" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            3. Cloud storage when you create an account
          </h2>
          <p className="mb-3">
            <strong style={{ color: 'var(--text-primary)' }}>
              We only save data to the cloud if you create an account and sign in.
            </strong>{' '}
            When you register or authenticate (for example, through our authentication provider), you may choose to
            sync or store certain information associated with your account on our systems so you can access it across
            devices and sessions.
          </p>
          <p>
            The categories of data stored in the cloud are generally limited to what is needed to operate account
            features you use (such as saved analyses, preferences, and account identifiers). We do not use
            cloud-synced data for purposes unrelated to providing the Services as described in this policy.
          </p>
        </section>

        <section aria-labelledby="privacy-health">
          <h2 id="privacy-health" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            4. Sensitive health information (lab markers)
          </h2>
          <p className="mb-3">
            If you upload or enter blood test or lab results, the Services may process{' '}
            <strong style={{ color: 'var(--text-primary)' }}>sensitive health-related information</strong>, including
            laboratory marker names, values, units, and related metadata you provide.
          </p>
          <ul className="list-disc pl-5 space-y-2 my-3">
            <li>
              We treat this information as confidential and limit access to what is needed to run the product (for
              example, generating outputs you request).
            </li>
            <li>
              Where data is stored only on your device, it stays under your control subject to your browser and device
              security.
            </li>
            <li>
              Where you have an account and data is stored with us, we use administrative, technical, and organizational
              measures appropriate to the nature of the service; no method of transmission or storage is completely
              secure.
            </li>
          </ul>
        </section>

        <section aria-labelledby="privacy-use">
          <h2 id="privacy-use" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            5. How we use your information
          </h2>
          <p className="mb-3">
            <strong style={{ color: 'var(--text-primary)' }}>
              We use your information strictly to calculate health scores, trends, and related in-app insights you see
              in BetterCals
            </strong>
            —for example, summarizing markers, comparing results over time, and presenting visualizations or scores
            derived from the data you (or your reports) provide.
          </p>
          <p className="mb-3">We do not sell your personal information. We do not use your lab data for advertising.</p>
          <p>
            We may also use limited technical data (such as diagnostics and security logs) to operate, secure, and
            improve the Services, consistent with applicable law.
          </p>
        </section>

        <section aria-labelledby="privacy-sharing">
          <h2 id="privacy-sharing" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            6. Service providers and transfers
          </h2>
          <p className="mb-3">
            We use trusted infrastructure and service providers to host the Services, authenticate users, and perform
            similar functions. These providers may process information only as instructed and as needed to provide
            their services to us.
          </p>
          <p>
            If we are required to disclose information by law or legal process, we may do so when we believe in good
            faith that such disclosure is necessary.
          </p>
        </section>

        <section aria-labelledby="privacy-rights">
          <h2 id="privacy-rights" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            7. Your choices and rights
          </h2>
          <p className="mb-3">
            Depending on where you live, you may have rights to access, correct, delete, or export certain personal
            information, or to object to or restrict certain processing. You may manage some choices through your
            account or app settings; you may also contact us using the information below.
          </p>
        </section>

        <section aria-labelledby="privacy-children">
          <h2 id="privacy-children" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            8. Children
          </h2>
          <p>
            The Services are not intended for children under the age where parental consent is required for processing
            personal data in your jurisdiction. We do not knowingly collect personal information from children in
            violation of applicable law.
          </p>
        </section>

        <section aria-labelledby="privacy-changes">
          <h2 id="privacy-changes" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            9. Changes to this policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the updated version on this page and
            revise the “Last updated” date above. Continued use of the Services after changes become effective
            constitutes your acknowledgment of the revised policy, to the extent permitted by law.
          </p>
        </section>

        <section aria-labelledby="privacy-contact">
          <h2 id="privacy-contact" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            10. Contact
          </h2>
          <p>
            For privacy-related questions, contact us through the channels listed on the BetterCals website or app.
          </p>
        </section>
      </div>

      <footer className="mt-12 pt-8 border-t text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
        <p>
          See also our{' '}
          <Link href="/terms" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--accent-hover)' }}>
            Terms of Service
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}
