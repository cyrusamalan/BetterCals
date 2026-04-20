import Link from 'next/link';

/**
 * Terms of Service content for BetterCals.
 * Semantic HTML + Tailwind; includes a strong limitation of liability for health-related outputs.
 */
export function TermsOfService() {
  return (
    <article
      className="legal-doc max-w-3xl mx-auto"
      style={{ color: 'var(--text-primary)' }}
    >
      <header className="mb-10 pb-8 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
          BetterCals
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight mb-3">Terms of Service</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Last updated: April 20, 2026
        </p>
      </header>

      <div className="space-y-10 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <section aria-labelledby="tos-agreement">
          <h2 id="tos-agreement" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            1. Agreement to terms
          </h2>
          <p>
            These Terms of Service (“Terms”) govern your access to and use of BetterCals websites, applications, and
            related services (the “Services”). By accessing or using the Services, you agree to these Terms. If you do
            not agree, do not use the Services.
          </p>
        </section>

        <section aria-labelledby="tos-description">
          <h2 id="tos-description" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            2. Description of the Services
          </h2>
          <p>
            BetterCals provides tools to help you interpret and visualize nutrition- and health-related information you
            provide, including estimates, scores, trends, and summaries derived from your inputs. The Services may
            include optional account-based features and local-only use when you are not signed in.
          </p>
        </section>

        <section aria-labelledby="tos-medical">
          <h2 id="tos-medical" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            3. Not medical advice
          </h2>
          <p className="mb-3">
            The Services are provided for <strong style={{ color: 'var(--text-primary)' }}>informational and educational purposes only</strong>.
            They are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of
            a qualified health provider with any questions about your health or lab results.
          </p>
          <p>
            Never disregard professional medical advice or delay seeking it because of something you read or see in
            BetterCals.
          </p>
        </section>

        <section aria-labelledby="tos-account">
          <h2 id="tos-account" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            4. Accounts and eligibility
          </h2>
          <p className="mb-3">
            Some features require you to create an account. You agree to provide accurate information and to keep your
            credentials secure. You are responsible for activity under your account, except where caused by our gross
            negligence or willful misconduct (subject to applicable law and Section 8).
          </p>
        </section>

        <section aria-labelledby="tos-acceptable">
          <h2 id="tos-acceptable" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            5. Acceptable use
          </h2>
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use the Services in any way that violates applicable law or infringes others’ rights;</li>
            <li>Attempt to probe, scan, or test the vulnerability of the Services, or breach security or authentication;</li>
            <li>Use the Services to transmit malware or interfere with the integrity or performance of the Services;</li>
            <li>Misrepresent the origin of data you submit or impersonate another person or entity.</li>
          </ul>
        </section>

        <section aria-labelledby="tos-ip">
          <h2 id="tos-ip" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            6. Intellectual property
          </h2>
          <p>
            The Services, including software, text, graphics, logos, and branding, are owned by BetterCals or its
            licensors and are protected by intellectual property laws. Subject to these Terms, we grant you a limited,
            non-exclusive, non-transferable, revocable license to access and use the Services for personal,
            non-commercial use unless we agree otherwise in writing.
          </p>
        </section>

        <section aria-labelledby="tos-liability" className="rounded-xl p-5 sm:p-6" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
          <h2 id="tos-liability" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            7. Limitation of liability (health forecasts and scores)
          </h2>
          <p className="mb-3 font-medium" style={{ color: 'var(--text-primary)' }}>
            To the fullest extent permitted by applicable law:
          </p>
          <ul className="list-disc pl-5 space-y-3 mb-4">
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>No guarantee of accuracy.</strong> Health-related
              outputs—including forecasts, projections, scores, trends, risk estimates, and any numerical or narrative
              interpretations of lab markers or other inputs—are{' '}
              <strong style={{ color: 'var(--text-primary)' }}>inherently uncertain</strong> and may be incomplete,
              outdated, or incorrect. They depend on the quality and completeness of data you provide, statistical
              models, assumptions, and limitations of automated analysis.{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                BetterCals does not warrant that any forecast, score, trend, or insight is accurate, reliable, complete,
                or fit for any particular purpose.
              </strong>
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>No liability for decisions.</strong> You acknowledge that
              you are solely responsible for any decisions or actions you take based on the Services. To the maximum
              extent permitted by law, BetterCals and its affiliates, officers, directors, employees, contractors, and
              licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
              or any loss of profits, data, goodwill, or other intangible losses, arising out of or related to your use
              of or reliance on health forecasts, scores, trends, or similar outputs.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Cap on direct damages.</strong> Except where prohibited
              by law (including where a mandatory consumer warranty or liability rule applies), BetterCals’ total
              aggregate liability for any claims arising out of or relating to these Terms or the Services shall not
              exceed the greater of (a) the amounts you paid us for the Services in the twelve (12) months before the
              claim, or (b) fifty U.S. dollars (USD $50), if you have not paid us.
            </li>
            <li>
              Some jurisdictions do not allow certain limitations or exclusions; in those jurisdictions, our liability
              is limited to the maximum extent permitted by law.
            </li>
          </ul>
        </section>

        <section aria-labelledby="tos-disclaimer">
          <h2 id="tos-disclaimer" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            8. Disclaimer of warranties
          </h2>
          <p>
            THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
            IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE
            OF HARMFUL COMPONENTS.
          </p>
        </section>

        <section aria-labelledby="tos-indemnity">
          <h2 id="tos-indemnity" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            9. Indemnification
          </h2>
          <p>
            To the extent permitted by law, you agree to indemnify and hold harmless BetterCals and its affiliates from
            any claims, damages, losses, or expenses (including reasonable attorneys’ fees) arising out of your use of
            the Services, your content, or your violation of these Terms.
          </p>
        </section>

        <section aria-labelledby="tos-law">
          <h2 id="tos-law" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            10. Governing law and disputes
          </h2>
          <p>
            These Terms are governed by the laws of the jurisdiction chosen by BetterCals for its principal operations,
            without regard to conflict-of-law principles, except where mandatory consumer protection laws in your
            country of residence require otherwise. Courts in that jurisdiction (or another forum if required by law)
            shall have exclusive jurisdiction over disputes, unless applicable law provides you a non-waivable right to
            bring claims elsewhere.
          </p>
        </section>

        <section aria-labelledby="tos-changes">
          <h2 id="tos-changes" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            11. Changes
          </h2>
          <p>
            We may modify these Terms from time to time. We will post the updated Terms on this page and update the
            “Last updated” date. Your continued use of the Services after the effective date constitutes your acceptance
            of the revised Terms, where permitted by law.
          </p>
        </section>

        <section aria-labelledby="tos-contact">
          <h2 id="tos-contact" className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            12. Contact
          </h2>
          <p>
            For questions about these Terms, contact us through the channels listed on the BetterCals website or app.
          </p>
        </section>
      </div>

      <footer className="mt-12 pt-8 border-t text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
        <p>
          See also our{' '}
          <Link href="/privacy" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--accent-hover)' }}>
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}
